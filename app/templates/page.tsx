import { createTemplate } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Templates</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((tpl) => (
          <div key={tpl.id} className="card space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{tpl.name}</p>
                <p className="text-xs text-slate-500">{tpl.segment}</p>
              </div>
              <span className="text-xs text-slate-500">{tpl.updatedAt.toISOString().slice(0,10)}</span>
            </div>
            {tpl.description && <p className="text-sm text-slate-600">{tpl.description}</p>}
            <p className="text-xs text-slate-500">ID: {tpl.id}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="section-title">Add / Update template</h2>
        <form className="grid gap-3 md:grid-cols-4" action={createTemplate}>
          <label className="text-sm">ID (optional)<input name="id" className="w-full rounded border px-3 py-2" placeholder="auto" /></label>
          <label className="text-sm">Name<input name="name" required className="w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">Segment<input name="segment" required className="w-full rounded border px-3 py-2" /></label>
          <label className="text-sm md:col-span-4">Description<textarea name="description" className="w-full rounded border px-3 py-2" placeholder="Hook/葛藤/転換 など" /></label>
          <div className="md:col-span-4">
            <button type="submit" className="rounded bg-teal-700 px-4 py-2 text-white">Save template</button>
          </div>
        </form>
      </div>
    </div>
  );
}
