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

type OrderlyTvPayload = {
  s?: string;
  o?: Array<number | string | null>;
  h?: Array<number | string | null>;
  l?: Array<number | string | null>;
  c?: Array<number | string | null>;
  v?: Array<number | string | null>;
  t?: Array<number | string | null>;
};

export function parseOrderlyTvCandles(payload: unknown): ChanCandle[] {
  const row = payload as OrderlyTvPayload;
  if (row?.s !== "ok" || !Array.isArray(row.t)) return [];
  return row.t.map((timestamp, index) => ({
    timestamp: Number(timestamp) * 1_000,
    open: Number(row.o?.[index]),
    high: Number(row.h?.[index]),
    low: Number(row.l?.[index]),
    close: Number(row.c?.[index]),
    volume: Number.isFinite(Number(row.v?.[index])) ? Number(row.v?.[index]) : null,
  })).filter(isValidChanCandle).sort((a, b) => a.timestamp - b.timestamp);
}

export function aggregateContinuousFourHourCandles(candles: ChanCandle[], capturedNowMs: number): ChanCandle[] {
  const closed = filterClosedCandles(candles, "1H", capturedNowMs);
  const buckets = new Map<number, ChanCandle[]>();
  for (const candle of closed) {
    const bucket = Math.floor(candle.timestamp / intervalMs("4H")) * intervalMs("4H");
    const rows = buckets.get(bucket) ?? [];
    rows.push(candle);
    buckets.set(bucket, rows);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).flatMap(([timestamp, rows]) => {
    rows.sort((a, b) => a.timestamp - b.timestamp);
    if (rows.length !== 4 || rows[0]?.timestamp !== timestamp) return [];
    if (rows.some((row, index) => index > 0 && row.timestamp - rows[index - 1]!.timestamp !== intervalMs("1H"))) return [];
    const volumeRows = rows.map((row) => row.volume).filter((value): value is number => value != null && Number.isFinite(value));
    return [{
      timestamp,
      open: rows[0]!.open,
      high: Math.max(...rows.map((row) => row.high)),
      low: Math.min(...rows.map((row) => row.low)),
      close: rows[3]!.close,
      volume: volumeRows.length === rows.length ? volumeRows.reduce((sum, value) => sum + value, 0) : null,
    }];
  }).filter((row) => row.timestamp + intervalMs("4H") <= capturedNowMs);
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

export type YahooFourHourSessionProfile = "US_EQUITY" | "CN_EQUITY" | "HK_EQUITY";

const YAHOO_FOUR_HOUR_CHUNKS: Record<YahooFourHourSessionProfile, readonly (readonly number[])[]> = {
  // A market session does not divide evenly into four-hour bars. The final
  // closing-session chunk is retained once every underlying 30m candle closes,
  // so headline structure never silently drops the most important tail.
  US_EQUITY: [
    [570, 600, 630, 660, 690, 720, 750, 780],
    [810, 840, 870, 900, 930],
  ],
  // Mainland exchanges trade exactly four real hours with a lunch recess.
  CN_EQUITY: [[570, 600, 630, 660, 780, 810, 840, 870]],
  HK_EQUITY: [
    [570, 600, 630, 660, 690, 780, 810, 840],
    [870, 900, 930],
  ],
};

export function aggregateYahooFourHourCandles(
  candles: ChanCandle[],
  timeZone: string,
  capturedNowMs: number,
  profile: YahooFourHourSessionProfile = "US_EQUITY"
): ChanCandle[] {
  const expectedChunks = YAHOO_FOUR_HOUR_CHUNKS[profile];
  const allowedStarts = new Set(expectedChunks.flat());
  const bySession = new Map<string, ChanCandle[]>();
  for (const candle of candles) {
    const minute = marketMinuteOfDay(candle.timestamp, timeZone);
    // Session-specific starts reject extended hours without treating an
    // exchange lunch recess as missing market data.
    if (!allowedStarts.has(minute) || candle.timestamp + intervalMs("30m") > capturedNowMs) continue;
    const key = marketDateKey(candle.timestamp, timeZone);
    const rows = bySession.get(key) ?? [];
    rows.push(candle);
    bySession.set(key, rows);
  }
  const output: ChanCandle[] = [];
  for (const rows of bySession.values()) {
    rows.sort((a, b) => a.timestamp - b.timestamp);
    for (const expectedStarts of expectedChunks) {
      const chunk = expectedStarts.map((minute) => rows.find((row) => marketMinuteOfDay(row.timestamp, timeZone) === minute));
      if (chunk.some((row) => !row)) continue;
      const complete = chunk as ChanCandle[];
      output.push({
        timestamp: complete[0]!.timestamp,
        open: complete[0]!.open,
        high: Math.max(...complete.map((row) => row.high)),
        low: Math.min(...complete.map((row) => row.low)),
        close: complete.at(-1)!.close,
        volume: complete.every((row) => row.volume != null) ? complete.reduce((sum, row) => sum + row.volume!, 0) : null,
      });
    }
  }
  return output.sort((a, b) => a.timestamp - b.timestamp);
}
