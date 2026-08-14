import type { ChanCandle, ChanTimeframe } from "@/types/chan-execution";

export function intervalMs(timeframe: ChanTimeframe): number {
  return ({ "5m": 300_000, "30m": 1_800_000, "1H": 3_600_000, "4H": 14_400_000, "1D": 86_400_000, "1W": 604_800_000 })[timeframe];
}

export function filterClosedCandles(candles: ChanCandle[], timeframe: ChanTimeframe, nowMs: number): ChanCandle[] {
  const duration = intervalMs(timeframe);
  return candles.filter((row) => Number.isFinite(row.timestamp) && row.timestamp + duration <= nowMs);
}

export function isValidChanCandle(row: ChanCandle): boolean {
  return Number.isFinite(row.timestamp)
    && Number.isFinite(row.open)
    && Number.isFinite(row.high)
    && Number.isFinite(row.low)
    && Number.isFinite(row.close)
    && row.open > 0
    && row.close > 0
    && row.low > 0
    && row.high >= Math.max(row.open, row.close)
    && row.low <= Math.min(row.open, row.close);
}
