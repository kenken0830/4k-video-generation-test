import { importCsv } from "@/lib/actions";

function ImportForm({ title, type, sample }: { title: string; type: string; sample: string }) {
  return (
    <div className="card">
      <h3 className="section-title">{title}</h3>
      <form action={importCsv} className="space-y-3" encType="multipart/form-data">
        <input type="hidden" name="type" value={type} />
        <input type="file" name="file" accept=".csv" className="w-full" required />
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">Upload CSV</button>
      </form>
      <p className="mt-2 text-xs text-slate-500">Sample: {sample}</p>
    </div>
  );
}

export default async function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">CSV Import</h1>
      <p className="text-sm text-slate-600">Upload daily metrics, costs, trends, and gate logs for batch ingestion.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <ImportForm
          title="metrics_daily"
          type="metrics"
          sample="product_id,asset_id,date,metric_key,value,source"
        />
        <ImportForm
          title="trends_daily"
          type="trends"
          sample="date,source,topic,score,region,notes"
        />
        <ImportForm
          title="costs_daily"
          type="costs"
          sample="product_id,asset_id,date,minutes,yen,notes"
        />
        <ImportForm
          title="gates logs"
          type="gates"
          sample="asset_id,date,stage,result,failCode,severity,hint,gateVersion"
        />
      </div>
    </div>
  );
}
