import { Asset, DecisionAction, GateResult, MetricKey, Product, ProductKind } from "@prisma/client";
import { prisma } from "./prisma";
import { getKpiPair } from "./kpis";

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function topPercentileMedian(values: number[], percentile = 0.2): number | null {
  if (!values.length) return null;
  const count = Math.max(1, Math.ceil(values.length * percentile));
  const top = [...values].sort((a, b) => b - a).slice(0, count);
  return median(top);
}

async function getBenchA(
  templateId: string | null | undefined,
  segment: string,
  metricKey: MetricKey,
  limit = 10,
): Promise<number | null> {
  if (!templateId) return null;
  const metrics = await prisma.metricDaily.findMany({
    where: {
      metricKey,
      asset: {
        templateId,
        product: { segment },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  });
  return topPercentileMedian(metrics.map((m) => m.value));
}

async function getBenchB(productId: string, metricKey: MetricKey, limit = 10): Promise<number | null> {
  const metrics = await prisma.metricDaily.findMany({
    where: { productId, metricKey },
    orderBy: { date: "desc" },
    take: limit,
  });
  return median(metrics.map((m) => m.value));
}

async function getLatestMetrics(assetId: string, productId: string, keys: MetricKey[]) {
  const entries = await prisma.metricDaily.findMany({
    where: { assetId, productId, metricKey: { in: keys } },
    orderBy: { date: "desc" },
  });
  const grouped: Record<MetricKey, number | null> = Object.fromEntries(keys.map((k) => [k, null]));
  keys.forEach((key) => {
    const value = entries.find((m) => m.metricKey === key);
    grouped[key] = value?.value ?? null;
  });
  return grouped;
}

async function getFailRate(assetId: string, window = 10): Promise<number> {
  const logs = await prisma.qualityGateLog.findMany({
    where: { assetId },
    orderBy: { date: "desc" },
    take: window,
  });
  if (!logs.length) return 0;
  const fails = logs.filter((l) => l.result === GateResult.fail).length;
  return fails / logs.length;
}

async function belowBenchTwice(assetId: string, productId: string, key: MetricKey, bench: number | null) {
  if (bench == null) return false;
  const entries = await prisma.metricDaily.findMany({
    where: { assetId, productId, metricKey: key },
    orderBy: { date: "desc" },
    take: 2,
  });
  return entries.length === 2 && entries.every((e) => e.value < bench);
}

export type Proposal = {
  asset: Asset;
  product: Product;
  benchmarks: Record<MetricKey, { benchA: number | null; benchB: number | null; latest: number | null }>;
  failRate: number;
  suggestedAction?: DecisionAction;
  reason?: string;
};

export async function buildProposal(asset: Asset, product: Product): Promise<Proposal> {
  const [k1, k2] = getKpiPair(product.kind as ProductKind);
  const keys: MetricKey[] = [k1, k2];
  const [benchA1, benchA2, benchB1, benchB2, latest] = await Promise.all([
    getBenchA(asset.templateId, product.segment, k1),
    getBenchA(asset.templateId, product.segment, k2),
    getBenchB(product.id, k1),
    getBenchB(product.id, k2),
    getLatestMetrics(asset.id, product.id, keys),
  ]);
  const failRate = await getFailRate(asset.id);

  const benchmarks: Proposal["benchmarks"] = {
    [k1]: { benchA: benchA1, benchB: benchB1, latest: latest[k1] },
    [k2]: { benchA: benchA2, benchB: benchB2, latest: latest[k2] },
  } as Proposal["benchmarks"];

  let suggestedAction: DecisionAction | undefined;
  let reason: string | undefined;

  const bothAboveA =
    benchmarks[k1].benchA != null && benchmarks[k2].benchA != null &&
    benchmarks[k1].latest != null && benchmarks[k2].latest != null &&
    benchmarks[k1].latest! >= benchmarks[k1].benchA! &&
    benchmarks[k2].latest! >= benchmarks[k2].benchA!;

  const underB =
    (benchmarks[k1].benchB != null && benchmarks[k1].latest != null && benchmarks[k1].latest! < benchmarks[k1].benchB!) ||
    (benchmarks[k2].benchB != null && benchmarks[k2].latest != null && benchmarks[k2].latest! < benchmarks[k2].benchB!);

  const freezeCandidate =
    (await belowBenchTwice(asset.id, product.id, k1, benchmarks[k1].benchB)) &&
    (await belowBenchTwice(asset.id, product.id, k2, benchmarks[k2].benchB));

  if (bothAboveA && failRate < 0.1) {
    suggestedAction = DecisionAction.replicate;
    reason = "KPI1+KPI2 exceed BenchA and gate fail rate < 10%.";
  } else if (freezeCandidate) {
    suggestedAction = DecisionAction.freeze;
    reason = "Last two runs fell below BenchB for both KPIs.";
  } else if (underB || failRate >= 0.2) {
    suggestedAction = DecisionAction.improve;
    reason = underB
      ? "KPI below BenchB median."
      : "Gate fail rate >= 20%.";
  }

  return {
    asset,
    product,
    benchmarks,
    failRate,
    suggestedAction,
    reason,
  };
}

export async function getProposals(): Promise<Proposal[]> {
  const assets = await prisma.asset.findMany({ include: { product: true } });
  return Promise.all(assets.map((asset) => buildProposal(asset, asset.product)));
}
