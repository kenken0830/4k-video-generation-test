import { createProduct } from "@/lib/actions";
import { getKpiPair, metricLabel } from "@/lib/kpis";
import { prisma } from "@/lib/prisma";
import { MetricKey, ProductKind } from "@prisma/client";

function latestMetricValue(metrics: { metricKey: MetricKey; value: number; date: Date }[], key: MetricKey) {
  const found = metrics
    .filter((m) => m.metricKey === key)
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  return found?.value ?? null;
}

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      assets: true,
      metrics: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => {
          const [k1, k2] = getKpiPair(product.kind as ProductKind);
          const v1 = latestMetricValue(product.metrics, k1);
          const v2 = latestMetricValue(product.metrics, k2);
          return (
            <div key={product.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{product.name}</h2>
                  <p className="text-sm text-slate-500">{product.segment} / {product.kind}</p>
                </div>
                <a href={`/products/${product.id}`} className="text-sm text-teal-700 hover:underline">
                  View
                </a>
              </div>
              <div className="flex gap-6 text-sm text-slate-700">
                <div>
                  <div className="text-xs text-slate-500">{metricLabel(k1)}</div>
                  <div className="font-semibold">{v1 ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{metricLabel(k2)}</div>
                  <div className="font-semibold">{v2 ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Assets</div>
                  <div className="font-semibold">{product.assets.length}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="section-title">Add product</h2>
        <form className="grid gap-3 md:grid-cols-4" action={createProduct}>
          <label className="text-sm">
            ID (optional)
            <input name="id" className="w-full rounded border px-3 py-2" placeholder="auto" />
          </label>
          <label className="text-sm">
            Name
            <input name="name" required className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            Segment
            <input name="segment" required className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            Kind
            <select name="kind" className="w-full rounded border px-3 py-2">
              {Object.values(ProductKind).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="rounded bg-teal-700 px-4 py-2 text-white">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
