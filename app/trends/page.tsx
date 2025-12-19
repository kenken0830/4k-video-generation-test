import { createTrend } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

function buildCandidates(trends: { topic: string; segment?: string | null }[], templates: { id: string; name: string; segment: string }[]) {
  const candidates: { topic: string; template: string; idea: string }[] = [];
  for (const trend of trends) {
    for (const tpl of templates) {
      if (!trend.segment || trend.segment === tpl.segment || tpl.segment === "ai") {
        candidates.push({
          topic: trend.topic,
          template: tpl.name,
          idea: `${trend.topic} × ${tpl.name} の候補を3パターン作成`,
        });
      }
    }
  }
  return candidates.slice(0, 20);
}

export default async function TrendsPage() {
  const trends = await prisma.trendDaily.findMany({ orderBy: { date: "desc" } });
  const templates = await prisma.template.findMany();
  const candidates = buildCandidates(trends, templates);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Trends</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="section-title">Trend list</h2>
          <div className="space-y-2">
            {trends.map((t) => (
              <div key={t.id} className="rounded border border-slate-200 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t.topic}</span>
                  <span className="text-xs text-slate-500">{t.date.toISOString().slice(0,10)}</span>
                </div>
                <div className="text-xs text-slate-500">{t.source} / {t.region ?? ""}</div>
                {t.notes && <div className="text-xs text-slate-600">{t.notes}</div>}
              </div>
            ))}
            {!trends.length && <p className="text-sm text-slate-500">No trends yet.</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="section-title">Add trend</h2>
          <form className="grid gap-2" action={createTrend}>
            <label className="text-sm">Date<input type="date" name="date" required className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Topic<input name="topic" required className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Source<input name="source" placeholder="manual/rss/csv" className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Score<input type="number" step="any" name="score" className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Region<input name="region" className="w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Notes<textarea name="notes" className="w-full rounded border px-3 py-2" /></label>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">Save</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Trend × Template candidates</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {candidates.map((c, idx) => (
            <div key={`${c.topic}-${c.template}-${idx}`} className="rounded border border-slate-200 p-3 text-sm">
              <p className="font-semibold">{c.topic}</p>
              <p className="text-slate-600">Template: {c.template}</p>
              <p className="text-xs text-slate-500">{c.idea}</p>
            </div>
          ))}
          {!candidates.length && <p className="text-sm text-slate-500">No candidates yet.</p>}
        </div>
      </div>
    </div>
  );
}
