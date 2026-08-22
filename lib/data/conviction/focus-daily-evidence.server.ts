import "server-only";
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { findXIntelligenceSummaryForMarket } from "@/lib/trading-signals/x-intelligence-overlay";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { focusDailyQuoteCapability, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";
import { resolveFocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-evidence-core";
import { getIntradayTechnicalLevels, intradayFocusKey } from "@/lib/market-data/intraday-chan-levels";

export async function loadFocusDailyAuxiliaryEvidence(input: {
  assetId?: string;
  symbol: string;
  assetType?: string;
  exchange?: string | null;
  asOfDate: string;
  now: Date;
}): Promise<FocusDailyAuxiliaryEvidence> {
  const capability = focusDailyQuoteCapability(input);
  const [base, intraday] = await Promise.all([
    resolveFocusDailyAuxiliaryEvidence({
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
    }),
    input.assetId
      ? getIntradayTechnicalLevels(intradayFocusKey(input.assetId)).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!intraday || intraday.source === "UNAVAILABLE") return base;
  const intradayMove = intraday.move24hPct;
  const intradayPhase = intradayMove != null && intradayMove >= 4
    ? "EARLY_RALLY" as const
    : intradayMove != null && intradayMove <= -4
      ? "EARLY_DROP" as const
      : "NONE" as const;
  const realizedPhase = base.realizedPhase && base.realizedPhase !== "NONE"
    ? base.realizedPhase
    : intradayPhase;
  const chanTimeframe = intraday.primaryTimeframe ?? "1H";
  return {
    ...base,
    evidenceKey: `${base.evidenceKey};INTRADAY=${intraday.source}:${intraday.support}:${intraday.resistance}`,
    supportLevels: [intraday.support],
    resistanceLevels: [intraday.resistance],
    technicalEvidence: [
      `缠论${chanTimeframe}支撑${intraday.support}`,
      `缠论${chanTimeframe}压力${intraday.resistance}`,
      base.technicalEvidence,
    ].filter(Boolean).join("；"),
    marketDataStatus: "AVAILABLE",
    chanStatus: "AVAILABLE",
    chanTimeframes: [chanTimeframe],
    chanStage: `${chanTimeframe}:${intraday.source}`,
    currentPrice: intraday.currentPrice ?? base.currentPrice ?? null,
    recentMovePct: base.recentMovePct ?? intradayMove,
    realizedPhase,
  };
}
