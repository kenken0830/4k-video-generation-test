"use server";

import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";
import {
  AssetKind,
  DecisionAction,
  GateResult,
  GateStage,
  MetricKey,
  Prisma,
  ProductKind,
} from "@prisma/client";
import { prisma } from "./prisma";
import { getKpiPair } from "./kpis";
import { buildProposal } from "./benchmarks";

function uuid() {
  return crypto.randomUUID();
}

export async function createProduct(formData: FormData) {
  const id = (formData.get("id") as string) || uuid();
  const name = (formData.get("name") as string)?.trim();
  const segment = (formData.get("segment") as string)?.trim();
  const kind = formData.get("kind") as ProductKind;
  if (!name || !segment || !kind) return;
  await prisma.product.upsert({
    where: { id },
    update: { name, segment, kind },
    create: { id, name, segment, kind },
  });
  revalidatePath("/products");
  revalidatePath("/");
}

export async function createTemplate(formData: FormData) {
  const id = (formData.get("id") as string) || uuid();
  const name = (formData.get("name") as string)?.trim();
  const segment = (formData.get("segment") as string)?.trim();
  const description = (formData.get("description") as string) || undefined;
  if (!name || !segment) return;
  await prisma.template.upsert({
    where: { id },
    update: { name, segment, description },
    create: { id, name, segment, description },
  });
  revalidatePath("/templates");
}

export async function createAsset(formData: FormData) {
  const id = (formData.get("id") as string) || uuid();
  const title = (formData.get("title") as string)?.trim();
  const productId = formData.get("productId") as string;
  const templateId = (formData.get("templateId") as string) || undefined;
  const kind = (formData.get("kind") as AssetKind) ?? AssetKind.video;
  const publishedAt = formData.get("publishedAt") as string;
  if (!title || !productId) return;
  await prisma.asset.upsert({
    where: { id },
    update: {
      title,
      productId,
      templateId,
      kind,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    },
    create: {
      id,
      title,
      productId,
      templateId,
      kind,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    },
  });
  revalidatePath("/assets");
  revalidatePath(`/products/${productId}`);
}

export async function createTrend(formData: FormData) {
  const id = (formData.get("id") as string) || uuid();
  const date = formData.get("date") as string;
  const source = (formData.get("source") as string) || "manual";
  const topic = (formData.get("topic") as string)?.trim();
  const score = formData.get("score") as string;
  const region = (formData.get("region") as string) || undefined;
  const notes = (formData.get("notes") as string) || undefined;
  if (!date || !topic) return;
  await prisma.trendDaily.upsert({
    where: { id },
    update: {
      date: new Date(date),
      source,
      topic,
      score: score ? Number(score) : null,
      region,
      notes,
    },
    create: {
      id,
      date: new Date(date),
      source,
      topic,
      score: score ? Number(score) : null,
      region,
      notes,
    },
  });
  revalidatePath("/trends");
}

export async function createDecision(formData: FormData) {
  const targetType = (formData.get("targetType") as string) ?? "asset";
  const targetId = formData.get("targetId") as string;
  const action = formData.get("action") as DecisionAction;
  const reason = (formData.get("reason") as string) || "";
  if (!targetId || !action) return;
  await prisma.decision.create({
    data: {
      id: uuid(),
      date: new Date(),
      targetType,
      targetId,
      action,
      reason,
      payload: formData.get("payload") as string,
    },
  });
  revalidatePath("/decisions");
}

export async function createQualityGateLog(formData: FormData) {
  const assetId = formData.get("assetId") as string;
  const date = formData.get("date") as string;
  const stage = formData.get("stage") as GateStage;
  const result = formData.get("result") as GateResult;
  const failCode = (formData.get("failCode") as string) || undefined;
  const severity = (formData.get("severity") as string) || undefined;
  const hint = (formData.get("hint") as string) || undefined;
  const gateVersion = (formData.get("gateVersion") as string) || undefined;
  if (!assetId || !date || !stage || !result) return;
  await prisma.qualityGateLog.create({
    data: {
      id: uuid(),
      assetId,
      date: new Date(date),
      stage,
      result,
      failCode,
      severity,
      hint,
      gateVersion,
    },
  });
  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
}

export async function createMetric(formData: FormData) {
  const productId = formData.get("productId") as string;
  const assetId = (formData.get("assetId") as string) || undefined;
  const date = formData.get("date") as string;
  const metricKey = formData.get("metricKey") as MetricKey;
  const value = formData.get("value") as string;
  const source = (formData.get("source") as string) || "manual";
  if (!productId || !date || !metricKey || !value) return;
  await prisma.metricDaily.create({
    data: {
      id: uuid(),
      productId,
      assetId,
      date: new Date(date),
      metricKey,
      value: Number(value),
      source,
    },
  });
  revalidatePath("/assets");
  revalidatePath(`/products/${productId}`);
}

export async function importCsv(formData: FormData) {
  const file = formData.get("file");
  const type = formData.get("type") as string;
  if (!file || !(file instanceof File)) return { imported: 0, errors: ["ファイルが選択されていません"] };

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = buffer.toString("utf-8");
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
  let imported = 0;
  const errors: string[] = [];

  for (const [index, row] of records.entries()) {
    try {
      if (type === "metrics") {
        const data: Prisma.MetricDailyCreateInput = {
          id: row.id || uuid(),
          product: { connect: { id: row.product_id } },
          asset: row.asset_id ? { connect: { id: row.asset_id } } : undefined,
          date: new Date(row.date),
          metricKey: row.metric_key as MetricKey,
          value: Number(row.value),
          source: row.source || "import",
        };
        await prisma.metricDaily.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        });
      } else if (type === "trends") {
        await prisma.trendDaily.upsert({
          where: { id: (row.id as string) || uuid() },
          update: {
            date: new Date(row.date),
            source: row.source,
            topic: row.topic,
            score: row.score ? Number(row.score) : null,
            region: row.region,
            notes: row.notes,
          },
          create: {
            id: (row.id as string) || uuid(),
            date: new Date(row.date),
            source: row.source,
            topic: row.topic,
            score: row.score ? Number(row.score) : null,
            region: row.region,
            notes: row.notes,
          },
        });
      } else if (type === "costs") {
        const data: Prisma.CostDailyCreateInput = {
          id: row.id || uuid(),
          product: { connect: { id: row.product_id } },
          asset: row.asset_id ? { connect: { id: row.asset_id } } : undefined,
          date: new Date(row.date),
          minutes: row.minutes ? Number(row.minutes) : null,
          yen: row.yen ? Number(row.yen) : null,
          notes: row.notes,
        };
        await prisma.costDaily.upsert({ where: { id: data.id }, update: data, create: data });
      } else if (type === "gates") {
        await prisma.qualityGateLog.upsert({
          where: { id: (row.id as string) || uuid() },
          update: {
            asset: { connect: { id: row.asset_id } },
            date: new Date(row.date),
            stage: row.stage as GateStage,
            result: row.result as GateResult,
            failCode: row.failCode || row.fail_code,
            severity: row.severity,
            hint: row.hint,
            gateVersion: row.gateVersion || row.gate_version,
          },
          create: {
            id: (row.id as string) || uuid(),
            asset: { connect: { id: row.asset_id } },
            date: new Date(row.date),
            stage: row.stage as GateStage,
            result: row.result as GateResult,
            failCode: row.failCode || row.fail_code,
            severity: row.severity,
            hint: row.hint,
            gateVersion: row.gateVersion || row.gate_version,
          },
        });
      }
      imported += 1;
    } catch (error) {
      console.error(error);
      errors.push(`row ${index + 1}: ${String((error as Error).message)}`);
    }
  }

  revalidatePath("/import");
  return { imported, errors };
}

export async function approveProposal(assetId: string) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId }, include: { product: true } });
  if (!asset || !asset.product) return;
  const proposal = await buildProposal(asset, asset.product);
  if (!proposal.suggestedAction) return;
  const [k1, k2] = getKpiPair(asset.product.kind);
  const reason = proposal.reason ?? "Auto proposal";
  await prisma.decision.create({
    data: {
      id: uuid(),
      date: new Date(),
      targetType: "asset",
      targetId: asset.id,
      action: proposal.suggestedAction,
      reason,
      payload: JSON.stringify({ kpis: [k1, k2], failRate: proposal.failRate, benchmarks: proposal.benchmarks }),
    },
  });
  revalidatePath("/decisions");
}
