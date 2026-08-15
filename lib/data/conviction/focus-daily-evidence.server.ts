import "server-only";
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { findXIntelligenceSummaryForMarket } from "@/lib/trading-signals/x-intelligence-overlay";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { filterClosedFocusDailyBars, focusDailyQuoteCapability, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";
import { buildFocusClosedMarketAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-evidence-core";

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
    marketDataStatus: "UNAVAILABLE",
    chanStatus: "UNAVAILABLE",
    chanTimeframes: [],
    chanStage: null,
  };
  const bars = filterClosedFocusDailyBars(await fetchRecentDailyBarsForForecast({ quoteSymbol: capability.quoteSymbol!, market: capability.market as DailyAccuracyMarket, asOfDate: input.asOfDate }), input.asOfDate);
  return buildFocusClosedMarketAuxiliaryEvidence({ symbol: input.symbol, quoteSymbol: capability.quoteSymbol!, asOfDate: input.asOfDate, bars, xMentions24h: xSummary?.mentions24h ?? null });
}
