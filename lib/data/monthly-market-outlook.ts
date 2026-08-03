import { SILVER_AUGUST_MONTHLY_OUTLOOK } from "@/lib/data/silver-research-20260802";
import type { FormalDirection } from "@/lib/forecasts/formal-direction";

export type MonthlyMarketOutlook = {
  assetId: string;
  assetName: string;
  symbol: string;
  venue: string;
  periodStart: string;
  periodEnd: string;
  direction: FormalDirection;
  volatility?: "LOW" | "MEDIUM" | "HIGH";
  probabilities: { up: number; flat: number; down: number };
  path: string;
  keyWindow: string;
  risk: string;
  sourceNote: string;
  sourceComplete: boolean;
};

/**
 * August 2026 member outlooks. Every item is based on an existing locked Liu-Yao
 * source in this repository. The 2026-08-02 silver month/week sources now
 * provide full August coverage; overlapping older sources remain risk context.
 */
export const MONTHLY_MARKET_OUTLOOKS_202608: MonthlyMarketOutlook[] = [
  {
    assetId: "bitcoin", assetName: "比特币", symbol: "BTC", venue: "全球加密市场",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "先涨后跌",
    probabilities: { up: 33, flat: 39, down: 28 },
    path: "上旬震荡整理，中旬存在明显反弹窗口；8月17日至23日转弱回撤，月底企稳或弱修复。",
    keyWindow: "中旬反弹；17日至23日回撤风险上升。",
    risk: "兄弟持世且动变继续强化兄弟，反弹不等于稳定主升。",
    sourceNote: "BTC八月月卦与分段周卦交叉。", sourceComplete: true,
  },
  {
    assetId: "eth", assetName: "以太坊", symbol: "ETH", venue: "全球加密市场",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "先跌后涨",
    probabilities: { up: 35, flat: 40, down: 25 },
    path: "前段偏弱，中旬可能出现剧烈上冲与回撤，下旬保留交易性修复窗口。",
    keyWindow: "申月后财爻条件改善，但需要价格结构确认。",
    risk: "月卦财爻受克、兄弟土旺，月内上涨窗口不代表持续大涨。",
    sourceNote: "ETH八月月卦与四段周卦交叉。", sourceComplete: true,
  },
  {
    assetId: "sp500", assetName: "标普500指数", symbol: "SPX", venue: "美国指数市场",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡", volatility: "HIGH",
    probabilities: { up: 34, flat: 36, down: 30 },
    path: "3日至9日冲高回落或偏弱，10日至16日为较强修复窗口，17日至23日回撤，月末高波动兑现。",
    keyWindow: "8月10日至16日相对最强。",
    risk: "后段财化兄，获利盘和政策预期可能放大回撤。",
    sourceNote: "标普八月月卦与四段周卦。", sourceComplete: true,
  },
  {
    assetId: "nasdaq-100", assetName: "纳斯达克100指数", symbol: "NDX", venue: "美国指数市场",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡下跌",
    probabilities: { up: 30, flat: 35, down: 35 },
    path: "上旬先压后修复；中旬至23日反弹乏力并转弱；月末风险释放后再修复。",
    keyWindow: "8月8日至23日承压更明显。",
    risk: "辰戌冲与游魂结构使科技指数波动和分歧持续。",
    sourceNote: "纳指八月月卦与四段周卦。", sourceComplete: true,
  },
  {
    assetId: "shanghai-composite", assetName: "上证指数", symbol: "SHCOMP", venue: "上海证券交易所",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡", volatility: "HIGH",
    probabilities: { up: 30, flat: 38, down: 32 },
    path: "上旬反弹后回落，10日至16日偏弱，17日后风险释放并逐步修复，月末修复延续。",
    keyWindow: "8月10日至16日是偏弱窗口。",
    risk: "财爻空亡，多动爻转父母、官鬼和兄弟，不支持稳定主升。",
    sourceNote: "上证八月月卦与分段周卦。", sourceComplete: true,
  },
  {
    assetId: "hang-seng", assetName: "恒生科技指数", symbol: "HSTECH", venue: "香港交易所",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "冲高回落",
    probabilities: { up: 30, flat: 35, down: 35 },
    path: "前半月仍可能反弹或冲高，8月7日前后波动放大；后段资金承接不足，更容易回吐。",
    keyWindow: "立秋前后重新选择方向。",
    risk: "财动后转父母、父母持世转官鬼，持续资金留存度不足。",
    sourceNote: "恒生科技八月月卦与分段周卦。", sourceComplete: true,
  },
  {
    assetId: "gold", assetName: "国际金价", symbol: "GOLD", venue: "COMEX黄金期货",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "先跌后涨",
    probabilities: { up: 32, flat: 38, down: 30 },
    path: "月初先弱或整理，立秋后金气增强，可能出现短促修复；但反弹持续性仍受兄弟结构限制。",
    keyWindow: "8月7日前后观察短线修复。",
    risk: "年卦仍处强弩之末背景，短线反弹不能直接定义为新主升。",
    sourceNote: "黄金八月月卦与年度背景交叉。", sourceComplete: true,
  },
  { ...SILVER_AUGUST_MONTHLY_OUTLOOK },
  {
    assetId: "wti-crude", assetName: "WTI原油", symbol: "WTI", venue: "NYMEX原油期货",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡下跌",
    probabilities: { up: 25, flat: 30, down: 45 },
    path: "上旬偏弱、立秋前后短修复；10日至16日反弹；17日至23日偏弱，月末探底后修复。",
    keyWindow: "8月17日至23日更弱。",
    risk: "财爻空、入墓并受兄弟申金压制，反弹不改变中期偏弱。",
    sourceNote: "WTI八月月卦与四段周卦。", sourceComplete: true,
  },
];

export function listCurrentMonthlyMarketOutlooks(): MonthlyMarketOutlook[] {
  return MONTHLY_MARKET_OUTLOOKS_202608;
}
