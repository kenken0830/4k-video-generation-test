# Product Intelligence OS (v1.0)

A Next.js + Prisma + SQLite toolkit to log daily KPIs across YouTube / note / apps / music, benchmark performance, capture quality gate results, and propose replicate / improve / freeze decisions.

## Features
- Prisma schema exactly matching the v1.0 spec (Product / Asset / MetricDaily / CostDaily / QualityGateLog / TrendDaily / Decision / Template + enums).
- Screens (App Router): Overview, Products, Product Detail, Assets, Asset Detail, Compare, Trends, Decisions, Templates, Import.
- CSV import for metrics, costs, trends, and quality gate logs (server actions).
- Benchmarking (BenchA/B) with decision proposals and approval flow that writes to `Decision`.
- Recharts visualizations for key KPIs on overview, product, and asset pages.
- Trend × Template candidate list generation.
- HTTP endpoint `POST /api/gates` for QualityGateLog ingestion.
- Seed data for products/templates plus a few sample assets/metrics/gates.

## Getting started
1. Install dependencies (from the repo root):
   ```bash
   npm install
   ```
2. Set up the database and Prisma client:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
   The UI is available at http://localhost:3000.

> SQLite lives at `prisma/dev.db` (ignored by git). To reset data, delete the file and rerun the push/seed commands.

## CSV import formats
Upload from the **Import** screen (four separate forms). Headers must match:
- **metrics_daily**: `product_id,asset_id,date,metric_key,value,source`
- **trends_daily**: `date,source,topic,score,region,notes`
- **costs_daily**: `product_id,asset_id,date,minutes,yen,notes`
- **gates**: `asset_id,date,stage,result,failCode,severity,hint,gateVersion`

## Decision rules (v1)
- **BenchA**: same segment + template, last N=10, top 20% median.
- **BenchB**: same product, last N=10 median.
- **replicate** when KPI1+KPI2 ≥ BenchA and gate fail rate < 10%.
- **improve** when either KPI < BenchB or gate fail rate ≥ 20%.
- **freeze** when the last two runs are both below BenchB for both KPIs.

## API
- `POST /api/gates`
  ```json
  {
    "assetId": "yt_ai_ep01",
    "date": "2025-01-10",
    "stage": "script",
    "result": "pass",
    "failCode": "optional",
    "severity": "high/mid/low",
    "hint": "optional",
    "gateVersion": "v1"
  }
  ```

## Seed data
`prisma/seed.ts` preloads the six example products and four templates from the spec, plus sample assets/metrics/trends/decisions so the UI renders immediately.
