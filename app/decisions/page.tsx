import { approveProposal, createDecision } from "@/lib/actions";
import { getProposals } from "@/lib/benchmarks";
import { prisma } from "@/lib/prisma";
import { DecisionAction } from "@prisma/client";

export default async function DecisionsPage() {
  const proposals = await getProposals();
  const history = await prisma.decision.findMany({ orderBy: { date: "desc" } });

  const approveActions = Object.fromEntries(
    proposals.map((p) => [p.asset.id, async () => {
      "use server";
      await approveProposal(p.asset.id);
    }]),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Decisions</h1>
        <p className="text-sm text-slate-600">自動提案を承認するか、手動で意思決定を追加できます。</p>
      </div>

      <div className="card">
        <h2 className="section-title">Proposed actions</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {proposals.map((p) => (
            <div key={p.asset.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900">{p.asset.title}</p>
                  <p className="text-xs text-slate-500">{p.product.name}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-700 shadow-sm">{p.suggestedAction ?? "review"}</span>
              </div>
              <p className="mt-1 text-slate-600">{p.reason ?? "Need more data"}</p>
              <p className="text-xs text-slate-500">Gate fail rate {(p.failRate * 100).toFixed(1)}%</p>
              <form action={approveActions[p.asset.id]} className="mt-3 flex justify-end">
                <button type="submit" className="rounded bg-emerald-700 px-3 py-1 text-white">Approve</button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Decision log</h2>
        <div className="space-y-2">
          {history.map((d) => (
            <div key={d.id} className="rounded border border-slate-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{d.action}</span> → {d.targetType} {d.targetId}
                </div>
                <span className="text-xs text-slate-500">{d.date.toISOString().slice(0,10)}</span>
              </div>
              <div>{d.reason}</div>
            </div>
          ))}
          {!history.length && <p className="text-sm text-slate-500">No decisions logged yet.</p>}
        </div>

        <form className="mt-4 grid gap-2 md:grid-cols-3" action={createDecision}>
          <label className="text-sm">Target type<input name="targetType" defaultValue="asset" className="w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">Target ID<input name="targetId" required className="w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">Action
            <select name="action" className="w-full rounded border px-3 py-2">
              {Object.values(DecisionAction).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="text-sm md:col-span-3">Reason<textarea name="reason" className="w-full rounded border px-3 py-2" /></label>
          <div className="md:col-span-3">
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">Add manual decision</button>
          </div>
        </form>
      </div>
    </div>
  );
}
