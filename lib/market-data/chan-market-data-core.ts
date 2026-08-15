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

type YahooChartPayload = {
  chart?: { result?: Array<{
    meta?: { exchangeTimezoneName?: string };
    timestamp?: number[];
    indicators?: { quote?: Array<{ open?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>; close?: Array<number | null>; volume?: Array<number | null> }> };
  }> };
};

export function parseYahooChanCandles(payload: unknown): { candles: ChanCandle[]; timeZone: string } {
  const result = (payload as YahooChartPayload)?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const candles = timestamps.map((timestamp, index) => ({
    timestamp: Number(timestamp) * 1_000,
    open: Number(quote?.open?.[index]),
    high: Number(quote?.high?.[index]),
    low: Number(quote?.low?.[index]),
    close: Number(quote?.close?.[index]),
    volume: Number.isFinite(Number(quote?.volume?.[index])) ? Number(quote?.volume?.[index]) : null,
  })).filter(isValidChanCandle).sort((a, b) => a.timestamp - b.timestamp);
  return { candles, timeZone: result?.meta?.exchangeTimezoneName || "America/New_York" };
}

function marketDateKey(timestamp: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find((row) => row.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function marketMinuteOfDay(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp));
  const part = (type: string) => Number(parts.find((row) => row.type === type)?.value ?? Number.NaN);
  return part("hour") * 60 + part("minute");
}

export function filterYahooClosedCandles(candles: ChanCandle[], timeframe: ChanTimeframe, capturedNowMs: number, timeZone: string): ChanCandle[] {
  if (timeframe === "1D") {
    const today = marketDateKey(capturedNowMs, timeZone);
    // Daily bars for the current exchange date are never treated as closed.
    return candles.filter((row) => marketDateKey(row.timestamp, timeZone) < today);
  }
  const durationMinutes = timeframe === "30m" ? 30 : timeframe === "1H" ? 60 : null;
  const closed = filterClosedCandles(candles, timeframe, capturedNowMs);
  if (durationMinutes == null) return closed;
  return closed.filter((row) => {
    const minute = marketMinuteOfDay(row.timestamp, timeZone);
    return minute >= 9 * 60 + 30 && minute + durationMinutes <= 16 * 60;
  });
}

export function aggregateYahooFourHourCandles(candles: ChanCandle[], timeZone: string, capturedNowMs: number): ChanCandle[] {
  const bySession = new Map<string, ChanCandle[]>();
  for (const candle of candles) {
    const minute = marketMinuteOfDay(candle.timestamp, timeZone);
    // US regular-session 30m bars start from 09:30 through 15:30 local time.
    // Filtering locally keeps an upstream pre/post-market regression from
    // silently changing the meaning of a four-hour structure.
    if (minute < 9 * 60 + 30 || minute >= 16 * 60 || candle.timestamp + intervalMs("30m") > capturedNowMs) continue;
    const key = marketDateKey(candle.timestamp, timeZone);
    const rows = bySession.get(key) ?? [];
    rows.push(candle);
    bySession.set(key, rows);
  }
  const output: ChanCandle[] = [];
  for (const rows of bySession.values()) {
    rows.sort((a, b) => a.timestamp - b.timestamp);
    // Yahoo regular-session 30m data supplies thirteen bars. Only the first
    // complete eight-bar block is a real four-hour candle; the remainder is not fabricated.
    for (let index = 0; index + 8 <= rows.length; index += 8) {
      const chunk = rows.slice(index, index + 8);
      if (chunk.some((row, chunkIndex) => chunkIndex > 0 && row.timestamp - chunk[chunkIndex - 1]!.timestamp !== intervalMs("30m"))) continue;
      output.push({
        timestamp: chunk[0]!.timestamp,
        open: chunk[0]!.open,
        high: Math.max(...chunk.map((row) => row.high)),
        low: Math.min(...chunk.map((row) => row.low)),
        close: chunk.at(-1)!.close,
        volume: chunk.every((row) => row.volume != null) ? chunk.reduce((sum, row) => sum + row.volume!, 0) : null,
      });
    }
  }
  return output.sort((a, b) => a.timestamp - b.timestamp);
}
