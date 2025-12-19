import { prisma } from "@/lib/prisma";
import { GateResult } from "@prisma/client";

export default async function AssetsPage() {
  const assets = await prisma.asset.findMany({
    include: {
      product: true,
      gateLogs: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Assets</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {assets.map((asset) => {
          const fails = asset.gateLogs.filter((g) => g.result === GateResult.fail).length;
          const passes = asset.gateLogs.filter((g) => g.result === GateResult.pass).length;
          return (
            <div key={asset.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{asset.title}</p>
                  <p className="text-sm text-slate-500">{asset.product.name} / tpl: {asset.templateId ?? "-"}</p>
                </div>
                <a href={`/assets/${asset.id}`} className="text-sm text-teal-700 hover:underline">Detail</a>
              </div>
              <div className="text-xs text-slate-600">
                Gate: {passes} pass / {fails} fail
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
