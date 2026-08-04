import { SILVER_AUGUST_MONTHLY_OUTLOOK } from "@/lib/data/silver-research-20260802";
import type { FormalDirection } from "@/lib/forecasts/formal-direction";

export type MonthlyMarketOutlook = {
  assetId: string;
  assetName: string;
  assetNameEn: string;
  symbol: string;
  venue: string;
  venueEn: string;
  periodStart: string;
  periodEnd: string;
  direction: FormalDirection;
  volatility?: "LOW" | "MEDIUM" | "HIGH";
  probabilities: { up: number; flat: number; down: number };
  path: string;
  pathEn: string;
  keyWindow: string;
  keyWindowEn: string;
  risk: string;
  riskEn: string;
  sourceNote: string;
  sourceNoteEn: string;
  sourceComplete: boolean;
};

/** August 2026 member outlooks. Chinese and English copy share the same locked numbers and source version. */
export const MONTHLY_MARKET_OUTLOOKS_202608: MonthlyMarketOutlook[] = [
  {
    assetId: "bitcoin", assetName: "比特币", assetNameEn: "Bitcoin", symbol: "BTC", venue: "全球加密市场", venueEn: "Global crypto market",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "先涨后跌",
    probabilities: { up: 33, flat: 39, down: 28 },
    path: "上旬震荡整理，中旬存在明显反弹窗口；8月17日至23日转弱回撤，月底企稳或弱修复。",
    pathEn: "Range-bound conditions are favored early in the month, followed by a clearer rebound window around mid-month. Weakness and a pullback become more likely from Aug 17–23, with stabilization or a modest repair attempt near month-end.",
    keyWindow: "中旬反弹；17日至23日回撤风险上升。", keyWindowEn: "Mid-month rebound window; pullback risk rises from Aug 17–23.",
    risk: "兄弟持世且动变继续强化兄弟，反弹不等于稳定主升。", riskEn: "The Liu Yao structure continues to strengthen the Brother element, so a rebound should not be treated as a stable primary uptrend.",
    sourceNote: "BTC八月月卦与分段周卦交叉。", sourceNoteEn: "Cross-checked against the August Liu Yao study and segmented weekly studies.", sourceComplete: true,
  },
  {
    assetId: "eth", assetName: "以太坊", assetNameEn: "Ether", symbol: "ETH", venue: "全球加密市场", venueEn: "Global crypto market",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "先跌后涨",
    probabilities: { up: 35, flat: 40, down: 25 },
    path: "前段偏弱，中旬可能出现剧烈上冲与回撤，下旬保留交易性修复窗口。", pathEn: "The early-month structure is weaker. A sharp rally-and-pullback sequence is possible around mid-month, while the latter part of the month retains a tactical recovery window.",
    keyWindow: "申月后财爻条件改善，但需要价格结构确认。", keyWindowEn: "Conditions improve after the Shen-month transition, but price-structure confirmation is still required.",
    risk: "月卦财爻受克、兄弟土旺，月内上涨窗口不代表持续大涨。", riskEn: "The monthly Wealth line remains constrained while the Brother element is strong; an upside window does not imply a sustained surge.",
    sourceNote: "ETH八月月卦与四段周卦交叉。", sourceNoteEn: "Cross-checked against the August Liu Yao study and four weekly segments.", sourceComplete: true,
  },
  {
    assetId: "sp500", assetName: "标普500指数", assetNameEn: "S&P 500", symbol: "SPX", venue: "美国指数市场", venueEn: "U.S. equity index market",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡", volatility: "HIGH",
    probabilities: { up: 34, flat: 36, down: 30 },
    path: "3日至9日冲高回落或偏弱，10日至16日为较强修复窗口，17日至23日回撤，月末高波动兑现。", pathEn: "A rally-then-fade or generally softer tone is favored from Aug 3–9. Aug 10–16 is the stronger recovery window, followed by a pullback from Aug 17–23 and elevated volatility into month-end.",
    keyWindow: "8月10日至16日相对最强。", keyWindowEn: "Aug 10–16 is the relatively strongest window.",
    risk: "后段财化兄，获利盘和政策预期可能放大回撤。", riskEn: "Late-month profit taking and policy expectations may amplify a pullback as the Wealth element transforms toward the Brother element.",
    sourceNote: "标普八月月卦与四段周卦。", sourceNoteEn: "August Liu Yao study plus four weekly segments.", sourceComplete: true,
  },
  {
    assetId: "nasdaq-100", assetName: "纳斯达克100指数", assetNameEn: "Nasdaq 100", symbol: "NDX", venue: "美国指数市场", venueEn: "U.S. equity index market",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡下跌",
    probabilities: { up: 30, flat: 35, down: 35 },
    path: "上旬先压后修复；中旬至23日反弹乏力并转弱；月末风险释放后再修复。", pathEn: "Early pressure may be followed by a repair attempt. From mid-month through Aug 23, rebounds are likely to lose momentum and turn weaker; another recovery attempt may follow after late-month risk is released.",
    keyWindow: "8月8日至23日承压更明显。", keyWindowEn: "Pressure is more pronounced from Aug 8–23.",
    risk: "辰戌冲与游魂结构使科技指数波动和分歧持续。", riskEn: "The Chen–Xu conflict and wandering-soul structure support persistent volatility and disagreement in technology shares.",
    sourceNote: "纳指八月月卦与四段周卦。", sourceNoteEn: "August Liu Yao study plus four weekly segments.", sourceComplete: true,
  },
  {
    assetId: "shanghai-composite", assetName: "上证指数", assetNameEn: "Shanghai Composite", symbol: "SHCOMP", venue: "上海证券交易所", venueEn: "Shanghai Stock Exchange",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡", volatility: "HIGH",
    probabilities: { up: 30, flat: 38, down: 32 },
    path: "上旬反弹后回落，10日至16日偏弱，17日后风险释放并逐步修复，月末修复延续。", pathEn: "An early-month rebound may fade. Aug 10–16 is the weaker window; after Aug 17, risk may gradually clear and allow a recovery that extends toward month-end.",
    keyWindow: "8月10日至16日是偏弱窗口。", keyWindowEn: "Aug 10–16 is the weaker window.",
    risk: "财爻空亡，多动爻转父母、官鬼和兄弟，不支持稳定主升。", riskEn: "An empty Wealth line and multiple transformations toward Parent, Officer and Brother elements do not support a stable primary uptrend.",
    sourceNote: "上证八月月卦与分段周卦。", sourceNoteEn: "August Liu Yao study plus segmented weekly studies.", sourceComplete: true,
  },
  {
    assetId: "hang-seng", assetName: "恒生科技指数", assetNameEn: "Hang Seng TECH Index", symbol: "HSTECH", venue: "香港交易所", venueEn: "Hong Kong market",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "冲高回落",
    probabilities: { up: 30, flat: 35, down: 35 },
    path: "前半月仍可能反弹或冲高，8月7日前后波动放大；后段资金承接不足，更容易回吐。", pathEn: "The first half of the month can still produce a rebound or upside push, with volatility increasing around Aug 7. Weaker capital follow-through later in the month raises the chance of giving back gains.",
    keyWindow: "立秋前后重新选择方向。", keyWindowEn: "A new directional decision is likely around the Start of Autumn transition.",
    risk: "财动后转父母、父母持世转官鬼，持续资金留存度不足。", riskEn: "The structural transformations imply insufficient persistence in capital retention.",
    sourceNote: "恒生科技八月月卦与分段周卦。", sourceNoteEn: "August Liu Yao study plus segmented weekly studies.", sourceComplete: true,
  },
  {
    assetId: "gold", assetName: "国际金价", assetNameEn: "Gold", symbol: "GOLD", venue: "COMEX黄金期货", venueEn: "COMEX gold futures",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "先跌后涨",
    probabilities: { up: 32, flat: 38, down: 30 },
    path: "月初先弱或整理，立秋后金气增强，可能出现短促修复；但反弹持续性仍受兄弟结构限制。", pathEn: "Early-month weakness or consolidation is favored. A brief recovery may emerge after the Start of Autumn transition, but the Brother structure still limits follow-through.",
    keyWindow: "8月7日前后观察短线修复。", keyWindowEn: "Watch for a short-term recovery around Aug 7.",
    risk: "年卦仍处强弩之末背景，短线反弹不能直接定义为新主升。", riskEn: "The annual study still describes a late-stage trend; a short-term rebound should not be labeled a new primary advance.",
    sourceNote: "黄金八月月卦与年度背景交叉。", sourceNoteEn: "August Liu Yao study cross-checked against the annual background.", sourceComplete: true,
  },
  { ...SILVER_AUGUST_MONTHLY_OUTLOOK },
  {
    assetId: "wti-crude", assetName: "WTI原油", assetNameEn: "WTI Crude Oil", symbol: "WTI", venue: "NYMEX原油期货", venueEn: "NYMEX crude oil futures",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡下跌",
    probabilities: { up: 25, flat: 30, down: 45 },
    path: "上旬偏弱、立秋前后短修复；10日至16日反弹；17日至23日偏弱，月末探底后修复。", pathEn: "The first part of the month is softer, with a brief repair around the Start of Autumn transition. A rebound is possible from Aug 10–16, followed by renewed weakness from Aug 17–23 and a test-support-then-recover sequence near month-end.",
    keyWindow: "8月17日至23日更弱。", keyWindowEn: "Aug 17–23 is the weaker window.",
    risk: "财爻空、入墓并受兄弟申金压制，反弹不改变中期偏弱。", riskEn: "The Wealth line is empty, enters storage and is constrained by the Shen-metal Brother element; rebounds do not change the medium-term downside bias.",
    sourceNote: "WTI八月月卦与四段周卦。", sourceNoteEn: "August Liu Yao study plus four weekly segments.", sourceComplete: true,
  },
];

export function listCurrentMonthlyMarketOutlooks(): MonthlyMarketOutlook[] {
  return MONTHLY_MARKET_OUTLOOKS_202608;
}
