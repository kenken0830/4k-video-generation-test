import { MetricChart } from "@/components/MetricChart";
import { approveProposal } from "@/lib/actions";
import { createDecision, createMetric, createQualityGateLog } from "@/lib/actions";
import { buildProposal } from "@/lib/benchmarks";
import { getKpiPair, metricLabel } from "@/lib/kpis";
import { prisma } from "@/lib/prisma";
import { DecisionAction, GateResult, GateStage, MetricKey, ProductKind } from "@prisma/client";
import { notFound } from "next/navigation";

function series(metrics: { metricKey: MetricKey; value: number; date: Date }[], key: MetricKey) {
  return metrics
    .filter((m) => m.metricKey === key)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((m) => ({ date: m.date.toISOString().slice(0, 10), value: m.value }));
}

export default async function AssetDetail({ params }: { params: { id: string } }) {
  const asset = await prisma.asset.findUnique({
    where: { id: params.id },
    include: {
      product: true,
      metrics: true,
      gateLogs: true,
    },
  });
  if (!asset || !asset.product) return notFound();

  const [k1, k2] = getKpiPair(asset.product.kind as ProductKind);
  const s1 = series(asset.metrics, k1);
  const s2 = series(asset.metrics, k2);
  const decisions = await prisma.decision.findMany({
    where: { targetId: asset.id },
    orderBy: { date: "desc" },
  });

  const proposal = await buildProposal(asset, asset.product);

  async function approveAction() {
    "use server";
    await approveProposal(asset.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{asset.title}</h1>
          <p className="text-sm text-slate-500">{asset.product.name} / tpl: {asset.templateId ?? "-"}</p>
        </div>
        <form action={approveAction}>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">Approve proposal</button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricChart title={metricLabel(k1)} data={s1} />
        <MetricChart title={metricLabel(k2)} data={s2} />
      </div>

      <div className="card">
        <h2 className="section-title">Proposal</h2>
        <p className="font-semibold">Suggested: {proposal.suggestedAction ?? "none"}</p>
        <p className="text-sm text-slate-600">{proposal.reason ?? "Waiting for more data"}</p>
        <div className="text-xs text-slate-500 mt-2">Gate fail rate: {(proposal.failRate * 100).toFixed(1)}%</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {[k1, k2].map((key) => (
            <div key={key} className="rounded border border-slate-200 p-2 text-sm">
              <div className="font-medium">{metricLabel(key)}</div>
              <div>Latest: {proposal.benchmarks[key].latest ?? "-"}</div>
              <div>BenchA: {proposal.benchmarks[key].benchA ?? "-"}</div>
              <div>BenchB: {proposal.benchmarks[key].benchB ?? "-"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="section-title">Quality gate logs</h2>
          <div className="space-y-2">
            {asset.gateLogs.map((log) => (
              <div key={log.id} className="rounded border border-slate-200 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{log.stage}</span>
                  <span className={log.result === GateResult.pass ? "text-emerald-700" : "text-rose-700"}>{log.result}</span>
                </div>
                {log.failCode && <div className="text-xs text-rose-600">{log.failCode} ({log.severity})</div>}
                {log.hint && <div className="text-xs text-slate-500">{log.hint}</div>}
              </div>
            ))}
            {!asset.gateLogs.length && <p className="text-sm text-slate-500">No logs</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Add gate log</h2>
          <form className="grid gap-2" action={createQualityGateLog}>
            <input type="hidden" name="assetId" value={asset.id} />
            <label className="text-sm">Date<input type="date" name="date" required className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Stage
              <select name="stage" className="w-full rounded border px-3 py-2">
                {Object.values(GateStage).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">Result
              <select name="result" className="w-full rounded border px-3 py-2">
                {Object.values(GateResult).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">Fail code<input name="failCode" className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Severity<input name="severity" className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Hint<textarea name="hint" className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Gate version<input name="gateVersion" className="w-full rounded border px-3 py-2" /></label>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">Save</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Log KPI</h2>
        <form className="grid gap-3 md:grid-cols-4" action={createMetric}>
          <input type="hidden" name="productId" value={asset.productId} />
          <input type="hidden" name="assetId" value={asset.id} />
          <label className="text-sm">Date<input type="date" name="date" required className="w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">Metric
            <select name="metricKey" className="w-full rounded border px-3 py-2">
              {Object.values(MetricKey).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">Value<input type="number" step="any" name="value" required className="w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">Source<input name="source" className="w-full rounded border px-3 py-2" /></label>
          <div className="md:col-span-4">
            <button type="submit" className="rounded bg-indigo-700 px-4 py-2 text-white">Add metric</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">Decision history</h2>
        <div className="space-y-2">
          {decisions.map((d) => (
            <div key={d.id} className="rounded border border-slate-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.action}</span>
                <span className="text-xs text-slate-500">{d.date.toISOString().slice(0,10)}</span>
              </div>
              <div>{d.reason}</div>
            </div>
          ))}
          {!decisions.length && <p className="text-sm text-slate-500">No decisions yet.</p>}
        </div>
        <form className="mt-4 grid gap-2" action={createDecision}>
          <input type="hidden" name="targetType" value="asset" />
          <input type="hidden" name="targetId" value={asset.id} />
          <label className="text-sm">Action
            <select name="action" className="w-full rounded border px-3 py-2">
              {Object.values(DecisionAction).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">Reason<textarea name="reason" className="w-full rounded border px-3 py-2" /></label>
          <button type="submit" className="rounded bg-teal-700 px-4 py-2 text-white">Add decision</button>
        </form>
      </div>
    </div>
  );
}
