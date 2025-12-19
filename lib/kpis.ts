import { MetricKey, ProductKind } from "@prisma/client";

export const KPI_PAIR_BY_KIND: Record<ProductKind, [MetricKey, MetricKey]> = {
  [ProductKind.youtube]: [MetricKey.ctr, MetricKey.avg_view_percentage],
  [ProductKind.note]: [MetricKey.paid_conversions, MetricKey.churn_rate],
  [ProductKind.app]: [MetricKey.d7_retention, MetricKey.arpu],
  [ProductKind.music]: [MetricKey.revenue, MetricKey.cost_minutes],
  [ProductKind.other]: [MetricKey.revenue, MetricKey.cost_minutes],
};

export function getKpiPair(kind: ProductKind): [MetricKey, MetricKey] {
  return KPI_PAIR_BY_KIND[kind] ?? [MetricKey.revenue, MetricKey.cost_minutes];
}

export function metricLabel(key: MetricKey): string {
  const map: Partial<Record<MetricKey, string>> = {
    revenue: "Revenue",
    cost_minutes: "Cost (minutes)",
    cost_yen: "Cost (yen)",
    views: "Views",
    impressions: "Impressions",
    ctr: "CTR",
    avg_view_duration_sec: "Avg View Duration (sec)",
    avg_view_percentage: "Avg View %",
    subscribers_delta: "Subscribers Δ",
    article_views: "Article Views",
    paid_conversions: "Paid Conversions",
    churn_rate: "Churn Rate",
    installs: "Installs",
    dau: "DAU",
    d1_retention: "D1 Retention",
    d7_retention: "D7 Retention",
    arpu: "ARPU",
    mrr: "MRR",
  };
  return map[key] ?? key;
}
