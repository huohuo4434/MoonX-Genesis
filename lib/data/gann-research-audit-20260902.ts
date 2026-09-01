export type GannAuditVerdict = "FULL" | "PARTIAL" | "MISS";

export interface GannAuditSample {
  id: string;
  publishedDate: string;
  asset: string;
  dimension: "TIME" | "PRICE" | "TIME_PRICE" | "CONDITIONAL";
  forecast: string;
  outcome: string;
  verdict: GannAuditVerdict;
  sourceUrl: string;
}

export const GANN_RESEARCH_AUDIT = {
  period: "2026-03-02—2026-09-02",
  collectedPosts: 310,
  gannRelatedPosts: 64,
  retrospectivePosts: 33,
  independentSamples: 14,
  untriggeredConditions: 2,
  recommendedResearchWeightPct: 3,
  authority: "TIMING_AND_LEVELS_ONLY" as const,
  method: [
    "先锁定发帖时间，只统计结果发生前已经公开的日期、价位或触发条件。",
    "相同预测的转帖、复盘帖和后续自述只算一次，不用博主自己的命中总结代替验证。",
    "完整命中计 1，部分命中计 0.5，失败计 0；条件没有触发时单列，不算赢也不算输。",
    "日线使用交易所闭合 K 线核对；窄日期窗允许一个日 K 的自然误差。",
  ],
  strengths: [
    "用明确高低点建立江恩角度线，把 2/1、3/1 等线作为动态支撑压力。",
    "把价格位与时间窗交叉使用，价格到位后仍等待日线、周线或右侧结构确认。",
    "适合补足六爻的具体价位和奇门的时间颗粒度，尤其适合 BTC、ETH 与贵金属。",
  ],
  weaknesses: [
    "锚点会随行情重新选择，若不保存旧版本，事后容易得到更漂亮的角度线。",
    "部分帖子同时给出多条分支；没有明确触发条件的双向叙述不可记为命中。",
    "复盘与成绩展示占比较高，必须从原始前瞻帖重新核验，不能直接采用自报准确率。",
  ],
} as const;

export const GANN_AUDIT_SAMPLES: readonly GannAuditSample[] = [
  {
    id: "btc-20260320-window",
    publishedDate: "2026-03-20",
    asset: "BTC",
    dimension: "TIME_PRICE",
    forecast: "68700 附近完成首跌后反弹，再于 3月24日／3月30日当周完成 76000 起的下跌。",
    outcome: "3月23—25日反弹，3月29日下探 64918，低点落在公开时间窗内。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2034845028351451354",
  },
  {
    id: "xag-20260326-rebound-end",
    publishedDate: "2026-03-26",
    asset: "白银",
    dimension: "PRICE",
    forecast: "反弹大概率结束；即便高于 74.4，也更可能只是插针。",
    outcome: "3月31日至4月17日多次实体维持在 74.4 上方，最高到 83.06，并非短暂插针。",
    verdict: "MISS",
    sourceUrl: "https://x.com/BTCTW0/status/2037047917496983745",
  },
  {
    id: "btc-20260327-april6",
    publishedDate: "2026-03-27",
    asset: "BTC",
    dimension: "TIME",
    forecast: "6万起的反弹会在 4月6日前结束，并开启新的下跌趋势。",
    outcome: "4月7日后继续上行，4月14日到 76009，随后又在5月中旬创出更高点。",
    verdict: "MISS",
    sourceUrl: "https://x.com/BTCTW0/status/2037352309697790343",
  },
  {
    id: "btc-20260416-expanded-rebound",
    publishedDate: "2026-04-16",
    asset: "BTC",
    dimension: "CONDITIONAL",
    forecast: "若本周／下周没有强力下跌，反弹将扩大并延续到5月中上旬后再回落。",
    outcome: "触发扩大分支；BTC 于5月14日到 81999 后进入显著回落。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2044765547402014759",
  },
  {
    id: "btc-20260421-angle-band",
    publishedDate: "2026-04-21",
    asset: "BTC",
    dimension: "PRICE",
    forecast: "只要没有连续日 K 实体收在 72900—71900 下方，78333 起的回落仍按调整处理。",
    outcome: "失效条件没有出现，BTC 随后突破 78300 并在5月升至 81999。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2046446807245574455",
  },
  {
    id: "btc-20260520-turn",
    publishedDate: "2026-05-19",
    asset: "BTC",
    dimension: "TIME",
    forecast: "5月20日是第一段下跌终点或随后反弹的终点候选。",
    outcome: "5月20日前后出现短暂反弹，但很快再创新低，只形成小级别转折。",
    verdict: "PARTIAL",
    sourceUrl: "https://x.com/BTCTW0/status/2056564013438550122",
  },
  {
    id: "eth-20260605-1500",
    publishedDate: "2026-06-05",
    asset: "ETH",
    dimension: "PRICE",
    forecast: "1500—1530 出现放量收针与上涨跟随，可作为第一波下跌终点。",
    outcome: "6月6日最低 1503.6，随后快速反弹超过 14%，价格与反应均兑现。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2062845839790542971",
  },
  {
    id: "btc-20260610-support-resistance",
    publishedDate: "2026-06-10",
    asset: "BTC",
    dimension: "PRICE",
    forecast: "60800 为关键支撑，66300 为上方关键压力。",
    outcome: "6月9—10日测试 60800 一带后反弹，6月15—16日测试 66300 一带后再次转弱。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2064533784096395681",
  },
  {
    id: "btc-20260703-expansion",
    publishedDate: "2026-07-03",
    asset: "BTC",
    dimension: "CONDITIONAL",
    forecast: "收稳 61950 并完成支撑阻力互换、再突破 63730，反弹级别扩大。",
    outcome: "条件先后触发，BTC 随后上行至 66924。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2073032627486158970",
  },
  {
    id: "btc-20260713-window",
    publishedDate: "2026-07-05",
    asset: "BTC",
    dimension: "TIME_PRICE",
    forecast: "7月9日／13日时间窗测试 62000 支撑有效，可启动新一轮上涨。",
    outcome: "7月13日最低 61806，收线守住后升至 66924。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2073608141573648607",
  },
  {
    id: "btc-20260719-66900",
    publishedDate: "2026-07-19",
    asset: "BTC",
    dimension: "PRICE",
    forecast: "57800 起第一段上涨目标 66900。",
    outcome: "7月21日最高 66924.1，误差约 0.04%，随后回落。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2078850694485086332",
  },
  {
    id: "btc-20260725-window",
    publishedDate: "2026-07-21",
    asset: "BTC",
    dimension: "TIME",
    forecast: "7月25日为下一关键江恩时间。",
    outcome: "7月24—25日形成短线低点并反弹，但7月27—28日又出现更低点，转折持续性不足。",
    verdict: "PARTIAL",
    sourceUrl: "https://x.com/BTCTW0/status/2079413351936135251",
  },
  {
    id: "xau-20260722-levels",
    publishedDate: "2026-07-22",
    asset: "黄金",
    dimension: "PRICE",
    forecast: "维持 4060 上方则保留上涨动力，后续观察 4303—4333 的突破。",
    outcome: "次日收盘短暂低于 4060，条件并非完整保持；8月6—7日仍突破 4303—4333。",
    verdict: "PARTIAL",
    sourceUrl: "https://x.com/BTCTW0/status/2079796859368079400",
  },
  {
    id: "btc-20260820-late-august-high",
    publishedDate: "2026-08-20",
    asset: "BTC",
    dimension: "TIME",
    forecast: "阶段高点窗口在8月底至9月初，在此之前 57800 起的反弹未结束。",
    outcome: "BTC 于8月28日冲至 81500 后回落，窗口和阶段属性兑现。",
    verdict: "FULL",
    sourceUrl: "https://x.com/BTCTW0/status/2090252326003253369",
  },
];

export function summarizeGannAudit(samples: readonly GannAuditSample[] = GANN_AUDIT_SAMPLES) {
  const full = samples.filter((sample) => sample.verdict === "FULL").length;
  const partial = samples.filter((sample) => sample.verdict === "PARTIAL").length;
  const miss = samples.filter((sample) => sample.verdict === "MISS").length;
  return {
    sampleSize: samples.length,
    full,
    partial,
    miss,
    weightedAccuracyPct: samples.length ? Math.round(((full + partial * 0.5) / samples.length) * 1_000) / 10 : 0,
  };
}
