import "server-only";
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { findXIntelligenceSummaryForMarket } from "@/lib/trading-signals/x-intelligence-overlay";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { focusDailyQuoteCapability, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";
import { resolveFocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-evidence-core";

export async function loadFocusDailyAuxiliaryEvidence(input: { symbol: string; assetType?: string; exchange?: string | null; asOfDate: string; now: Date }): Promise<FocusDailyAuxiliaryEvidence> {
  const capability = focusDailyQuoteCapability(input);
  return resolveFocusDailyAuxiliaryEvidence({
    symbol: input.symbol,
    quoteSymbol: capability.quoteSymbol,
    asOfDate: input.asOfDate,
    dependencies: {
      loadXMentions24h: async () => {
        const snapshot = await getXIntelligenceSnapshot({ now: input.now });
        if (!snapshot.databaseAvailable) throw new Error("focus-x-intelligence-unavailable");
        return findXIntelligenceSummaryForMarket(snapshot.aggregate.summaries, input.symbol)?.mentions24h ?? null;
      },
      loadBars: capability.available
        ? async () => fetchRecentDailyBarsForForecast({
          quoteSymbol: capability.quoteSymbol!,
          market: capability.market as DailyAccuracyMarket,
          asOfDate: input.asOfDate,
        })
        : null,
    },
  });
}
