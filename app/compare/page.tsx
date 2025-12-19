import { getProposals } from "@/lib/benchmarks";
import { getKpiPair, metricLabel } from "@/lib/kpis";
import { ProductKind } from "@prisma/client";

export default async function ComparePage() {
  const proposals = await getProposals();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Compare & Benchmarks</h1>
        <p className="text-sm text-slate-600">
          BenchA: same segment + template top 20% median (N=10). BenchB: product median of last 10.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {proposals.map((p) => {
          const [k1, k2] = getKpiPair(p.product.kind as ProductKind);
          return (
            <div key={p.asset.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{p.asset.title}</p>
                  <p className="text-xs text-slate-500">{p.product.name} / tpl: {p.asset.templateId ?? "-"}</p>
                </div>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
                  {p.suggestedAction ?? "review"}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[k1, k2].map((k) => (
                  <div key={k} className="rounded border border-slate-200 bg-white p-2 text-sm">
                    <div className="font-medium text-slate-900">{metricLabel(k)}</div>
                    <div className="text-xs text-slate-500">
                      BenchA: {p.benchmarks[k].benchA ?? "-"} / BenchB: {p.benchmarks[k].benchB ?? "-"}
                    </div>
                    <div className="text-slate-800">Current: {p.benchmarks[k].latest ?? "-"}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Gate fail rate: {(p.failRate * 100).toFixed(1)}%</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] uppercase text-emerald-700">Bench tracking</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
