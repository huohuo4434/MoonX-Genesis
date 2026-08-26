import "server-only";

import { unstable_cache } from "next/cache";
import { isPublicCountableVerdict } from "@/lib/accuracy/public-history-filter";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { resolveCanonicalQuoteSymbol } from "@/lib/market-data/quote-symbols";
import { isSessionReadyToVerify } from "@/lib/verification/session-ready";
import { buildWeeklyRollingActualsFromBars } from "@/lib/verification/weekly-rolling-market-core";
import { normalizeWeeklyRollingSymbol } from "@/lib/verification/weekly-rolling-core";
import {
  DAILY_ACCURACY_ASSETS,
  DIRECTION_LABELS,
  type DailyAccuracyMarket,
  type DailyVerificationResult,
} from "@/types/daily-accuracy";
import type { WeeklyAnalysisMemberView, WeeklyMarketSlot } from "@/types/weekly-analysis";
import type { WeeklyRollingActualSession } from "@/types/weekly-rolling-verification";

const getCachedWeeklyBars = unstable_cache(
  async (quoteSymbol: string, market: DailyAccuracyMarket, asOfDate: string) =>
    fetchRecentDailyBarsForForecast({ quoteSymbol, market, asOfDate }),
  ["weekly-rolling-realized-bars-v1"],
  { revalidate: 15 * 60 },
);

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function assetConfig(weekly: WeeklyAnalysisMemberView) {
  const symbol = normalizeWeeklyRollingSymbol(weekly.displaySymbol ?? weekly.symbol);
  return DAILY_ACCURACY_ASSETS.find((asset) =>
    normalizeWeeklyRollingSymbol(asset.symbol) === symbol
      || normalizeWeeklyRollingSymbol(asset.key) === symbol,
  );
}

function actualsFromStoredResults(
  results: readonly DailyVerificationResult[],
  now: Date,
): WeeklyRollingActualSession[] {
  const bySymbolDate = new Map<string, WeeklyRollingActualSession>();
  for (const result of results) {
    const verifiedAt = Date.parse(result.verifiedAt);
    if (!Number.isFinite(verifiedAt) || verifiedAt > now.getTime() || !isPublicCountableVerdict(result.verdict)) continue;
    const symbol = normalizeWeeklyRollingSymbol(result.symbol);
    const key = `${symbol}:${result.forecastDate}`;
    const current = bySymbolDate.get(key);
    if (current && Date.parse(current.verifiedAt) >= verifiedAt) continue;
    bySymbolDate.set(key, {
      symbol,
      date: result.forecastDate,
      actualDirection: result.actualDirection,
      actualLabel: DIRECTION_LABELS[result.actualDirection],
      marketClosed: false,
      verifiedAt: result.verifiedAt,
      dataSource: result.dataSource,
    });
  }
  return [...bySymbolDate.values()];
}

export async function getWeeklyRollingActuals(
  slots: readonly WeeklyMarketSlot[],
  storedResults: readonly DailyVerificationResult[],
  now = new Date(),
): Promise<WeeklyRollingActualSession[]> {
  const stored = actualsFromStoredResults(storedResults, now);
  const storedKeys = new Set(stored.map((row) => `${normalizeWeeklyRollingSymbol(row.symbol)}:${row.date}`));
  const published = slots.flatMap((slot) => slot.kind === "published" ? [slot.analysis] : []);

  const fetched = await Promise.all(published.map(async (weekly) => {
    const config = assetConfig(weekly);
    if (!config) return [];
    const symbol = normalizeWeeklyRollingSymbol(weekly.displaySymbol ?? weekly.symbol);
    const readyDates = Array.from({ length: 7 }, (_, index) => addDays(weekly.weekStart, index))
      .filter((date) => isSessionReadyToVerify(config.market, date, now))
      .filter((date) => !storedKeys.has(`${symbol}:${date}`));
    if (!readyDates.length) return [];

    const quoteSymbol = resolveCanonicalQuoteSymbol(config.symbol, config.quoteSymbol);
    const asOfDate = readyDates.at(-1)!;
    try {
      const bars = await getCachedWeeklyBars(quoteSymbol, config.market, asOfDate);
      return buildWeeklyRollingActualsFromBars({
        symbol,
        quoteSymbol,
        readyDates,
        bars,
        dataSource: `${config.market === "CRYPTO" ? "yahoo-finance-1h-beijing" : "yahoo-finance-1d"}:${quoteSymbol};weekly-rolling-v1`,
        verifiedAt: now.toISOString(),
      });
    } catch (error) {
      console.error("[weekly-rolling-actuals] market data unavailable", {
        symbol,
        readyDates,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }));

  return [...stored, ...fetched.flat()];
}
