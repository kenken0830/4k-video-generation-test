import { PrismaClient, AssetKind, MetricKey, ProductKind, GateStage, GateResult, DecisionAction } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.qualityGateLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.costDaily.deleteMany();
  await prisma.metricDaily.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.template.deleteMany();
  await prisma.product.deleteMany();
  await prisma.trendDaily.deleteMany();

  const products = [
    { id: "yt_ai", kind: ProductKind.youtube, name: "AI解説CH", segment: "ai" },
    { id: "yt_love", kind: ProductKind.youtube, name: "恋愛アニメCH", segment: "romance" },
    { id: "yt_emotion", kind: ProductKind.youtube, name: "感動アニメCH", segment: "emotion" },
    { id: "yt_comedy", kind: ProductKind.youtube, name: "コメディCH", segment: "comedy" },
    { id: "note_main", kind: ProductKind.note, name: "note本体", segment: "ai" },
    { id: "app_factory", kind: ProductKind.app, name: "アプリ量産", segment: "tools" },
  ];

  const templates = [
    { id: "tpl_rom_001", name: "すれ違い→逆転", segment: "romance" },
    { id: "tpl_emo_001", name: "喪失→回復", segment: "emotion" },
    { id: "tpl_com_001", name: "勘違い連鎖", segment: "comedy" },
    { id: "tpl_ai_001", name: "最新AI解説10分", segment: "ai" },
  ];

  await Promise.all(products.map((p) => prisma.product.create({ data: p })));
  await Promise.all(templates.map((t) => prisma.template.create({ data: t })));

  const assets = [
    {
      id: "yt_ai_ep01",
      productId: "yt_ai",
      kind: AssetKind.video,
      title: "GPUの仕組みを図解",
      templateId: "tpl_ai_001",
      publishedAt: new Date("2024-12-20"),
    },
    {
      id: "yt_love_ep01",
      productId: "yt_love",
      kind: AssetKind.video,
      title: "冬のすれ違いラブストーリー",
      templateId: "tpl_rom_001",
      publishedAt: new Date("2024-12-22"),
    },
    {
      id: "note_ai_001",
      productId: "note_main",
      kind: AssetKind.article,
      title: "生成AIのUIパターン10選",
      templateId: "tpl_ai_001",
      publishedAt: new Date("2024-12-18"),
    },
  ];

  await Promise.all(assets.map((a) => prisma.asset.create({ data: a })));

  const today = new Date();
  const metrics = [
    // YouTube AI
    { productId: "yt_ai", assetId: "yt_ai_ep01", metricKey: MetricKey.ctr, value: 0.085 },
    { productId: "yt_ai", assetId: "yt_ai_ep01", metricKey: MetricKey.avg_view_percentage, value: 0.62 },
    { productId: "yt_ai", assetId: "yt_ai_ep01", metricKey: MetricKey.views, value: 120000 },
    // YouTube love
    { productId: "yt_love", assetId: "yt_love_ep01", metricKey: MetricKey.ctr, value: 0.11 },
    { productId: "yt_love", assetId: "yt_love_ep01", metricKey: MetricKey.avg_view_percentage, value: 0.71 },
    { productId: "yt_love", assetId: "yt_love_ep01", metricKey: MetricKey.views, value: 84000 },
    // note
    { productId: "note_main", assetId: "note_ai_001", metricKey: MetricKey.paid_conversions, value: 46 },
    { productId: "note_main", assetId: "note_ai_001", metricKey: MetricKey.churn_rate, value: 0.06 },
    // common revenue/cost
    { productId: "yt_ai", assetId: "yt_ai_ep01", metricKey: MetricKey.revenue, value: 92000 },
    { productId: "yt_ai", assetId: "yt_ai_ep01", metricKey: MetricKey.cost_minutes, value: 420 },
    { productId: "yt_love", assetId: "yt_love_ep01", metricKey: MetricKey.revenue, value: 78000 },
    { productId: "yt_love", assetId: "yt_love_ep01", metricKey: MetricKey.cost_minutes, value: 360 },
  ];

  await prisma.metricDaily.createMany({
    data: metrics.map((m, idx) => ({
      ...m,
      id: `metric_${idx}`,
      date: new Date(today.getTime() - idx * 24 * 60 * 60 * 1000),
      source: "seed",
    })),
  });

  await prisma.costDaily.createMany({
    data: [
      {
        id: "cost_yt_ai",
        productId: "yt_ai",
        assetId: "yt_ai_ep01",
        date: today,
        minutes: 420,
        yen: 18000,
        notes: "script + edit",
      },
      {
        id: "cost_yt_love",
        productId: "yt_love",
        assetId: "yt_love_ep01",
        date: today,
        minutes: 360,
        yen: 15000,
        notes: "voice + color",
      },
    ],
  });

  await prisma.trendDaily.createMany({
    data: [
      {
        id: "trend_001",
        date: today,
        source: "manual",
        topic: "年末の別れ",
        score: 0.82,
        region: "JP",
        notes: "SNSキーワード急増",
      },
      {
        id: "trend_002",
        date: today,
        source: "rss",
        topic: "AI音声キャラ",
        score: 0.74,
        region: "JP",
        notes: "音声アプリ特集",
      },
    ],
  });

  await prisma.qualityGateLog.createMany({
    data: [
      {
        id: "gate_1",
        assetId: "yt_ai_ep01",
        date: today,
        stage: GateStage.script,
        result: GateResult.pass,
        failCode: null,
        severity: null,
        hint: "構成OK",
        gateVersion: "v1",
      },
      {
        id: "gate_2",
        assetId: "yt_love_ep01",
        date: today,
        stage: GateStage.image_prompt,
        result: GateResult.fail,
        failCode: "img_style",
        severity: "mid",
        hint: "表情バリエ不足",
        gateVersion: "v1",
      },
    ],
  });

  await prisma.decision.create({
    data: {
      id: "decision_seed",
      date: today,
      targetType: "asset",
      targetId: "yt_ai_ep01",
      action: DecisionAction.replicate,
      reason: "CTR + retention exceed benchmark; gate pass",
      payload: JSON.stringify({ source: "seed" }),
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
