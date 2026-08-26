import type { DailyMarketBar } from "@/lib/market-data/daily-prices";
import { quoteSanityFailure } from "@/lib/market-data/quote-symbols";
import { computeReturnPct, directionFromReturnPct } from "@/lib/verification/daily-rules";
import { DIRECTION_LABELS } from "@/types/daily-accuracy";
import type { WeeklyRollingActualSession } from "@/types/weekly-rolling-verification";

/**
 * Convert one already-fetched bar window into realized weekly sessions.
 * Missing dates are marked closed only when a later provider bar proves that
 * the calendar date was skipped. A missing latest bar remains pending so a
 * delayed provider response is never mislabeled as a holiday.
 */
export function buildWeeklyRollingActualsFromBars(input: {
  symbol: string;
  quoteSymbol: string;
  readyDates: readonly string[];
  bars: readonly DailyMarketBar[];
  dataSource: string;
  verifiedAt: string;
}): WeeklyRollingActualSession[] {
  const sorted = [...input.bars].sort((a, b) => a.date.localeCompare(b.date));
  const actuals: WeeklyRollingActualSession[] = [];
  for (const date of input.readyDates) {
    const currentIndex = sorted.findIndex((bar) => bar.date === date);
    if (currentIndex < 0) {
      const hasLaterBar = sorted.some((bar) => bar.date > date);
      if (hasLaterBar) {
        actuals.push({
          symbol: input.symbol,
          date,
          actualDirection: null,
          actualLabel: null,
          marketClosed: true,
          verifiedAt: input.verifiedAt,
          dataSource: input.dataSource,
        });
      }
      continue;
    }
    if (currentIndex === 0) continue;

    const previous = sorted[currentIndex - 1]!;
    const current = sorted[currentIndex]!;
    const sanityFailure = quoteSanityFailure({
      symbol: input.symbol,
      quoteSymbol: input.quoteSymbol,
      close: current.close,
      previousClose: previous.close,
      high: current.high,
      low: current.low,
    });
    if (sanityFailure) continue;

    const returnPct = computeReturnPct(previous.close, current.close);
    const actualDirection = directionFromReturnPct(returnPct);
    actuals.push({
      symbol: input.symbol,
      date,
      actualDirection,
      actualLabel: DIRECTION_LABELS[actualDirection],
      marketClosed: false,
      verifiedAt: input.verifiedAt,
      dataSource: input.dataSource,
    });
  }
  return actuals;
}
