import { MetricChart } from "@/components/MetricChart";
import { createAsset, createMetric } from "@/lib/actions";
import { getKpiPair, metricLabel } from "@/lib/kpis";
import { prisma } from "@/lib/prisma";
import { AssetKind, MetricKey, ProductKind } from "@prisma/client";
import { notFound } from "next/navigation";

function seriesForKey(metrics: { metricKey: MetricKey; value: number; date: Date }[], key: MetricKey) {
  return metrics
    .filter((m) => m.metricKey === key)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((m) => ({ date: m.date.toISOString().slice(0, 10), value: m.value }));
}

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      metrics: true,
      assets: true,
    },
  });
  if (!product) return notFound();

  const [k1, k2] = getKpiPair(product.kind as ProductKind);
  const s1 = seriesForKey(product.metrics, k1);
  const s2 = seriesForKey(product.metrics, k2);

  const templates = await prisma.template.findMany({ where: { segment: product.segment } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-slate-500">{product.segment} / {product.kind}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricChart title={metricLabel(k1)} data={s1} />
        <MetricChart title={metricLabel(k2)} data={s2} />
      </div>

      <div className="card">
        <h2 className="section-title">Assets</h2>
        <div className="space-y-3">
          {product.assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
              <div>
                <p className="font-semibold">{asset.title}</p>
                <p className="text-xs text-slate-500">{asset.kind} / tpl: {asset.templateId ?? "-"}</p>
              </div>
              <a href={`/assets/${asset.id}`} className="text-sm text-teal-700 hover:underline">Detail</a>
            </div>
          ))}
          {!product.assets.length && <p className="text-sm text-slate-500">No assets yet.</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Add asset</h2>
        <form className="grid gap-3 md:grid-cols-3" action={createAsset}>
          <input type="hidden" name="productId" value={product.id} />
          <label className="text-sm">
            Title
            <input name="title" required className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            Template
            <select name="templateId" className="w-full rounded border px-3 py-2">
              <option value="">(none)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Kind
            <select name="kind" className="w-full rounded border px-3 py-2">
              {Object.values(AssetKind).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Published at
            <input name="publishedAt" type="date" className="w-full rounded border px-3 py-2" />
          </label>
          <div className="md:col-span-3">
            <button type="submit" className="rounded bg-teal-700 px-4 py-2 text-white">Save</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">Log KPI</h2>
        <form className="grid gap-3 md:grid-cols-4" action={createMetric}>
          <input type="hidden" name="productId" value={product.id} />
          <label className="text-sm">
            Asset (optional)
            <select name="assetId" className="w-full rounded border px-3 py-2">
              <option value="">(product level)</option>
              {product.assets.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Date
            <input type="date" name="date" required className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            Metric
            <select name="metricKey" className="w-full rounded border px-3 py-2">
              {Object.values(MetricKey).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Value
            <input type="number" step="any" name="value" required className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            Source
            <input name="source" placeholder="manual" className="w-full rounded border px-3 py-2" />
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">Add metric</button>
          </div>
        </form>
      </div>
    </div>
  );
}
