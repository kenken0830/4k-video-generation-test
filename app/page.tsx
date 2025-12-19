import { prisma } from "@/lib/prisma";
import { getProposals } from "@/lib/benchmarks";
import { MetricChart } from "@/components/MetricChart";
import { MetricKey, GateResult } from "@prisma/client";
import { StatCard } from "@/components/StatCard";

async function getTotals() {
  const revenue = await prisma.metricDaily.aggregate({
    where: { metricKey: MetricKey.revenue },
    _sum: { value: true },
  });
  const costMinutes = await prisma.metricDaily.aggregate({
    where: { metricKey: MetricKey.cost_minutes },
    _sum: { value: true },
  });
  return {
    revenue: revenue._sum.value ?? 0,
    costMinutes: costMinutes._sum.value ?? 0,
  };
}

async function getSeries(metricKey: MetricKey) {
  const grouped = await prisma.metricDaily.groupBy({
    by: ["date"],
    where: { metricKey },
    _sum: { value: true },
    orderBy: { date: "asc" },
  });
  return grouped.map((g) => ({
    date: g.date.toISOString().slice(0, 10),
    value: g._sum.value ?? 0,
  }));
}

async function getGateAlerts() {
  const fails = await prisma.qualityGateLog.groupBy({
    by: ["stage"],
    where: { result: GateResult.fail },
    _count: { _all: true },
  });
  return fails.sort((a, b) => b._count._all - a._count._all);
}

export default async function OverviewPage() {
  const [totals, revenueSeries, costSeries, proposals, gateAlerts] = await Promise.all([
    getTotals(),
    getSeries(MetricKey.revenue),
    getSeries(MetricKey.cost_minutes),
    getProposals(),
    getGateAlerts(),
  ]);

  const replicate = proposals.filter((p) => p.suggestedAction === "replicate").length;
  const improve = proposals.filter((p) => p.suggestedAction === "improve").length;
  const freeze = proposals.filter((p) => p.suggestedAction === "freeze").length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">
            最新のKPIサマリと自動提案を確認し、ワンクリックでアクションを決められます。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={`¥${totals.revenue.toLocaleString()}`}
            helper="全期間の累計"
            icon={<span>¥</span>}
          />
          <StatCard
            label="Total cost (minutes)"
            value={`${totals.costMinutes.toLocaleString()} m`}
            helper="投入工数の合計"
            icon={<span>⏱️</span>}
          />
          <StatCard
            label="Winning (replicate)"
            value={replicate}
            helper="ベンチA超えの本数"
            icon={<span>🏆</span>}
          />
          <StatCard
            label="Improve / Freeze"
            value={
              <span className="text-lg font-semibold text-slate-900">
                {improve} 改善 / {freeze} 凍結
              </span>
            }
            helper="警告が出ているアセット"
            icon={<span>⚠️</span>}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <MetricChart title="Revenue by date" data={revenueSeries} />
        <MetricChart title="Cost minutes by date" data={costSeries} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Decision proposals</h3>
            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs text-slate-600">
              Replicate / Improve / Freeze を自動判定
            </span>
          </div>
          <div className="space-y-3">
            {proposals.map((p) => (
              <div key={p.asset.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{p.asset.title}</p>
                    <p className="text-xs text-slate-500">{p.product.name}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-700 shadow-sm">
                    {p.suggestedAction ?? "review"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{p.reason ?? "Waiting for more data"}</p>
                <p className="text-xs text-slate-500">Gate fail rate: {(p.failRate * 100).toFixed(1)}%</p>
              </div>
            ))}
            {!proposals.length && <p className="text-sm text-slate-500">まだ提案がありません。</p>}
          </div>
        </div>
        <div className="card">
          <h3 className="section-title">Quality gate alerts</h3>
          <div className="space-y-2">
            {gateAlerts.map((alert) => (
              <div key={alert.stage} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">{alert.stage}</span>
                  <span className="text-xs text-slate-500">失敗が多いステージ</span>
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {alert._count._all} fails
                </span>
              </div>
            ))}
            {!gateAlerts.length && <p className="text-sm text-slate-500">No fails logged</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
