import type { TechnicalAssetCategory, TechnicalSignal } from "@/types/technical-signal";

const assets: Array<[string, TechnicalAssetCategory]> = [
  ["SEI", "layer_1_layer_2"], ["BONK", "meme"], ["CRV", "defi"], ["LPT", "infrastructure"], ["SUI", "layer_1_layer_2"],
  ["DOT", "layer_1_layer_2"], ["ADA", "layer_1_layer_2"], ["LINK", "infrastructure"], ["ALGO", "layer_1_layer_2"], ["ETC", "major"],
  ["ZEN", "infrastructure"], ["APT", "layer_1_layer_2"], ["ENA", "defi"], ["BGB", "high_volatility"], ["BNB", "major"],
  ["ARB", "layer_1_layer_2"], ["TAO", "infrastructure"], ["XRP", "major"], ["DOGE", "meme"],
];
const zhRisk = "周线底背离可能持续较长时间，也可能因价格继续创新低、指标同步走弱而失效。观察记录不代表趋势已经反转。";
const local = (zhCN: string, en: string) => ({ zhCN, zhTW: zhCN, en });

/** Manually curated watch entries supplied for V2.2; no prices, levels, or indicator values are inferred. */
export const weeklyDivergenceWatchPool: TechnicalSignal[] = assets.map(([symbol, assetCategory]) => ({
  id: `${symbol.toLowerCase()}-weekly-divergence-watch-2026-07-27`,
  assetId: symbol.toLowerCase(),
  symbol,
  signalType: "generic_bullish_divergence_watch",
  direction: "bullish",
  timeframe: "1w",
  horizon: "medium_term",
  detectedAt: "2026-07-27T00:00:00+08:00",
  status: "observing",
  originalStatus: "observing",
  statusHistory: [{ status: "observing", changedAt: "2026-07-27T00:00:00+08:00", note: local("已录入周线技术观察池，等待补充具体指标与结构信息。", "Added to the weekly technical watch pool; awaiting indicator and structural detail.") }],
  title: local(`${symbol}周线潜在底背离观察`, `${symbol} Weekly Potential Bullish Divergence Watch`),
  summary: local("人工筛选的周线级别技术观察，不代表已确认反转或买入评级。", "Manually curated weekly technical observation; not a confirmed reversal or a buy rating."),
  evidence: [],
  indicatorType: "unspecified",
  assetCategory,
  confirmationConditions: [local("确认条件待补充。", "Confirmation conditions pending.")],
  invalidationConditions: [local("失效条件待补充。", "Invalidation conditions pending.")],
  riskNotes: [local(zhRisk, "Weekly bullish divergences can persist and can fail if price makes lower lows while the indicator weakens. An observation is not a confirmed trend reversal.")],
  framework: "technical_structure",
  sourceType: "manual_research",
  evidenceScore: 0,
  strengthInput: { clarity: 10, priceConfirmation: 0, indicatorConfluence: 0, timeframeConfluence: 0, riskCompleteness: 5 },
  signalStrength: 45,
  createdAt: "2026-07-27T00:00:00+08:00",
  updatedAt: "2026-07-27T00:00:00+08:00",
}));
