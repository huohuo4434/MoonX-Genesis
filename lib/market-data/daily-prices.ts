import "server-only";

import type { DailyAccuracyDirection, DailyAccuracyMarket } from "@/types/daily-accuracy";
import { resolveCanonicalQuoteSymbol, quoteSanityFailure } from "@/lib/market-data/quote-symbols";
import { computeReturnPct, directionFromReturnPct } from "@/lib/verification/daily-rules";

export type DailyMarketBar = {
  date: string; // YYYY-MM-DD in market local / UTC date key from provider
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type DailyMarketResult = {
  previousClose: number;
  open: number;
  high: number;
  low: number;
  close: number;
  returnPct: number;
  actualDirection: DailyAccuracyDirection;
  dataSource: string;
  marketClosed: boolean;
};

function toDateKeyInTz(tsSeconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tsSeconds * 1000));
}

function parseYahooChart(json: unknown, timeZone = "UTC"): DailyMarketBar[] {
  const chart = json as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        meta?: {
          exchangeTimezoneName?: string;
          chartPreviousClose?: number;
          previousClose?: number;
          regularMarketPrice?: number;
        };
        indicators?: { quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }> };
      }>;
    };
  };
  const result = chart.chart?.result?.[0];
  if (!result?.timestamp?.length) return [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];
  const tz =
    result.meta?.exchangeTimezoneName ||
    timeZone;
  const bars: DailyMarketBar[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const ts = result.timestamp[i]!;
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    if (![open, high, low, close].every(Number.isFinite)) continue;
    bars.push({
      date: toDateKeyInTz(ts, tz.includes("/") ? tz : timeZone),
      open,
      high,
      low,
      close,
    });
  }

  // Hang Seng TECH Index (HSTECH.HK) may return only the latest session bar.
  // Use Yahoo meta previous close to synthesize the prior session for returnPct.
  if (bars.length === 1) {
    const prevClose = result.meta?.chartPreviousClose ?? result.meta?.previousClose;
    if (typeof prevClose === "number" && Number.isFinite(prevClose) && prevClose > 0) {
      const current = bars[0]!;
      const prevDate = new Date(`${current.date}T12:00:00Z`);
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      const prevKey = toDateKeyInTz(Math.floor(prevDate.getTime() / 1000), tz.includes("/") ? tz : timeZone);
      bars.unshift({
        date: prevKey,
        open: prevClose,
        high: prevClose,
        low: prevClose,
        close: prevClose,
      });
    }
  }

  return bars;
}

async function fetchYahooDailyBars(
  quoteSymbol: string,
  forecastDate: string,
  market: DailyAccuracyMarket
): Promise<DailyMarketBar[]> {
  const day = new Date(`${forecastDate}T12:00:00Z`);
  const period1 = Math.floor((day.getTime() - 14 * 24 * 60 * 60 * 1000) / 1000);
  const period2 = Math.floor((day.getTime() + 2 * 24 * 60 * 60 * 1000) / 1000);
  const encoded = encodeURIComponent(quoteSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MoonX/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const fallbackTz = market === "CN" || market === "HK" ? "Asia/Shanghai" : "America/New_York";
  return parseYahooChart(json, fallbackTz);
}



function localDateTimeParts(tsSeconds: number, timeZone: string): { date: string; time: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(tsSeconds * 1000));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    minutes: hour * 60 + minute,
  };
}

function marketTimeZone(market: DailyAccuracyMarket): string {
  if (market === "CN" || market === "HK") return "Asia/Shanghai";
  if (market === "CRYPTO") return "Asia/Shanghai";
  return "America/New_York";
}

function inOfficialSession(market: DailyAccuracyMarket, minutes: number): boolean {
  if (market === "CRYPTO") return true;
  if (market === "CN") {
    return (minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30) ||
      (minutes >= 13 * 60 && minutes <= 15 * 60);
  }
  if (market === "HK") {
    return (minutes >= 9 * 60 + 30 && minutes <= 12 * 60) ||
      (minutes >= 13 * 60 && minutes <= 16 * 60);
  }
  if (market === "US") return minutes >= 9 * 60 + 30 && minutes <= 16 * 60;
  // WTI continuous contract: use the liquid US daytime window for consistent validation.
  return minutes >= 8 * 60 && minutes <= 14 * 60 + 30;
}

/**
 * Fetch 15-minute bars for path-aware verification.
 * Returns [] when the provider does not retain intraday history; caller must not invent a path.
 */
export async function fetchIntradayBarsForVerification(input: {
  symbol: string;
  quoteSymbol: string;
  market: DailyAccuracyMarket;
  forecastDate: string;
}): Promise<import("@/lib/verification/pattern-classifier").IntradayVerificationBar[]> {
  const quoteSymbol = resolveCanonicalQuoteSymbol(input.symbol, input.quoteSymbol);
  const day = new Date(`${input.forecastDate}T12:00:00Z`);
  const period1 = Math.floor((day.getTime() - 2 * 24 * 60 * 60 * 1000) / 1000);
  const period2 = Math.floor((day.getTime() + 2 * 24 * 60 * 60 * 1000) / 1000);
  const encoded = encodeURIComponent(quoteSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=15m&period1=${period1}&period2=${period2}&includePrePost=false`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MOOX/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Yahoo intraday HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        meta?: { exchangeTimezoneName?: string };
        indicators?: {
          quote?: Array<{
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result?.timestamp?.length || !quote) return [];
  const tz = input.market === "CRYPTO" ? "Asia/Shanghai" : result.meta?.exchangeTimezoneName || marketTimeZone(input.market);
  const bars: import("@/lib/verification/pattern-classifier").IntradayVerificationBar[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const ts = result.timestamp[i]!;
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    if (![open, high, low, close].every(Number.isFinite)) continue;
    const local = localDateTimeParts(ts, tz);
    if (local.date !== input.forecastDate) continue;
    if (!inOfficialSession(input.market, local.minutes)) continue;
    bars.push({
      timestamp: ts,
      localTime: `${local.date} ${local.time}`,
      open,
      high,
      low,
      close,
    });
  }
  return bars.sort((a, b) => a.timestamp - b.timestamp);
}

/** Recent daily bars for forecast generation (not verification). */
export async function fetchRecentDailyBarsForForecast(input: {
  quoteSymbol: string;
  market: DailyAccuracyMarket;
  asOfDate: string;
}): Promise<DailyMarketBar[]> {
  return withRetries(() => fetchYahooDailyBars(input.quoteSymbol, input.asOfDate, input.market), 3);
}

async function fetchCoinGeckoBtcBars(forecastDate: string): Promise<DailyMarketBar[]> {
  const day = new Date(`${forecastDate}T00:00:00Z`);
  const from = Math.floor((day.getTime() - 10 * 24 * 60 * 60 * 1000) / 1000);
  const to = Math.floor((day.getTime() + 2 * 24 * 60 * 60 * 1000) / 1000);
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const json = (await res.json()) as { prices?: [number, number][] };
  const prices = json.prices ?? [];
  // Aggregate to daily close by UTC date (last price of day)
  const byDay = new Map<string, number>();
  for (const [ms, price] of prices) {
    const key = toDateKeyInTz(Math.floor(ms / 1000), "UTC");
    byDay.set(key, price);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, close]) => ({
      date,
      open: close,
      high: close,
      low: close,
      close,
    }));
}

function pickSessionBars(
  bars: DailyMarketBar[],
  forecastDate: string
): { previous: DailyMarketBar; current: DailyMarketBar } | { marketClosed: true } | null {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const currentIdx = sorted.findIndex((b) => b.date === forecastDate);
  if (currentIdx < 0) {
    // No bar for that calendar day → likely holiday / closed
    const later = sorted.find((b) => b.date > forecastDate);
    const earlier = [...sorted].reverse().find((b) => b.date < forecastDate);
    if (!later && earlier) return { marketClosed: true };
    return null;
  }
  if (currentIdx === 0) return null;
  const previous = sorted[currentIdx - 1]!;
  const current = sorted[currentIdx]!;
  return { previous, current };
}

async function withRetries<T>(fn: () => Promise<T>, times = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export async function getDailyMarketResult(input: {
  symbol: string;
  quoteSymbol: string;
  market: DailyAccuracyMarket;
  forecastDate: string;
}): Promise<DailyMarketResult | { error: string; marketClosed?: boolean }> {
  const quoteSymbol = resolveCanonicalQuoteSymbol(input.symbol, input.quoteSymbol);
  const { market, forecastDate } = input;

  let bars: DailyMarketBar[] = [];
  let dataSource = `yahoo-finance:${quoteSymbol}`;

  try {
    bars = await withRetries(() => fetchYahooDailyBars(quoteSymbol, forecastDate, market), 3);
  } catch (err) {
    if (market === "CRYPTO" && (quoteSymbol === "BTC-USD" || input.symbol === "BTC")) {
      try {
        bars = await withRetries(() => fetchCoinGeckoBtcBars(forecastDate), 3);
        dataSource = "coingecko";
      } catch (cgErr) {
        return {
          error: `行情获取失败：Yahoo ${err instanceof Error ? err.message : String(err)}; CoinGecko ${
            cgErr instanceof Error ? cgErr.message : String(cgErr)
          }`,
        };
      }
    } else {
      return { error: `行情获取失败：${err instanceof Error ? err.message : String(err)}` };
    }
  }

  if (!bars.length) {
    return { error: "行情数据为空，不得猜测价格" };
  }

  const picked = pickSessionBars(bars, forecastDate);
  if (!picked) {
    return { error: `缺少 ${forecastDate} 或前一交易日K线` };
  }
  if ("marketClosed" in picked) {
    return { error: "休市，不计入准确率", marketClosed: true };
  }

  const { previous, current } = picked;
  const sanity = quoteSanityFailure({
    symbol: input.symbol,
    quoteSymbol,
    close: current.close,
    previousClose: previous.close,
    high: current.high,
    low: current.low,
  });
  if (sanity) {
    return { error: sanity };
  }

  const returnPct = computeReturnPct(previous.close, current.close);
  return {
    previousClose: previous.close,
    open: current.open,
    high: current.high,
    low: current.low,
    close: current.close,
    returnPct: Number(returnPct.toFixed(4)),
    actualDirection: directionFromReturnPct(returnPct),
    dataSource,
    marketClosed: false,
  };
}

export { isSessionReadyToVerify } from "@/lib/verification/session-ready";

export function defaultCutoffAt(forecastDate: string, market: DailyAccuracyMarket): string {
  if (market === "CRYPTO") {
    return new Date(`${forecastDate}T00:00:00+08:00`).toISOString();
  }
  if (market === "CN" || market === "HK") {
    return new Date(`${forecastDate}T09:30:00+08:00`).toISOString();
  }
  if (market === "US_FUTURES") {
    // WTI must lock before the target session; publish deadline is 05:30 Beijing.
    return new Date(`${forecastDate}T05:30:00+08:00`).toISOString();
  }
  return new Date(`${forecastDate}T13:30:00.000Z`).toISOString();
}
