import "server-only";
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { findXIntelligenceSummaryForMarket } from "@/lib/trading-signals/x-intelligence-overlay";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { filterClosedFocusDailyBars, focusDailyQuoteCapability, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";

export async function loadFocusDailyAuxiliaryEvidence(input: { symbol: string; assetType?: string; exchange?: string | null; asOfDate: string; now: Date }): Promise<FocusDailyAuxiliaryEvidence> {
  const capability = focusDailyQuoteCapability(input);
  const snapshot = await getXIntelligenceSnapshot({ now: input.now }).catch(() => null);
  if (capability.available && !snapshot?.databaseAvailable) throw new Error("focus-x-intelligence-unavailable");
  const xSummary = snapshot?.databaseAvailable ? findXIntelligenceSummaryForMarket(snapshot.aggregate.summaries, input.symbol) : null;
  if (!capability.available) return {
    evidenceKey: JSON.stringify({ xSummary, market: "MARKET_DATA_UNAVAILABLE" }), supportLevels: [], resistanceLevels: [],
    technicalEvidence: "MARKET_DATA_UNAVAILABLE：该标的没有经过验证的行情映射；不生成价格或技术点位。",
    newsEvidence: xSummary ? `X聚合提及${xSummary.mentions24h}次，仅辅助日节奏，不改变正式锁定周方向。` : "X聚合当前无可用观点；不会反推或编造证据。",
    realizedPhase: "NONE",
  };
  const bars = filterClosedFocusDailyBars(await fetchRecentDailyBarsForForecast({ quoteSymbol: capability.quoteSymbol!, market: capability.market as DailyAccuracyMarket, asOfDate: input.asOfDate }), input.asOfDate);
  if (bars.length < 2) throw new Error("focus-closed-market-evidence-insufficient");
  const recent = bars.slice(-5), first = recent[0]!, last = recent.at(-1)!;
  const support = Math.min(...recent.map((bar) => bar.low)), resistance = Math.max(...recent.map((bar) => bar.high));
  const move = (last.close - first.open) / first.open;
  const realizedPhase = move >= 0.04 ? "EARLY_RALLY" : move <= -0.04 ? "EARLY_DROP" : "NONE";
  return {
    evidenceKey: JSON.stringify({ quoteSymbol: capability.quoteSymbol, last, support, resistance, xSummary, realizedPhase }),
    supportLevels: [String(support)], resistanceLevels: [String(resistance)],
    technicalEvidence: `真实闭合日K截至${last.date}；只用于路径进度和区间参考，不改变正式锁定周方向。`,
    newsEvidence: xSummary ? `X聚合提及${xSummary.mentions24h}次，仅辅助日节奏，不改变正式锁定周方向。` : "X聚合当前无明确观点。",
    realizedPhase,
  };
}
