import "server-only";

import {
  aggregateContinuousFourHourCandles,
  aggregateYahooFourHourCandles,
  filterClosedCandles,
  filterYahooClosedCandles,
  isValidChanCandle,
  parseOrderlyTvCandles,
  parseYahooChanCandles,
  type YahooFourHourSessionProfile,
} from "@/lib/market-data/chan-market-data-core";
import { resolveChanInstrument } from "@/lib/market-data/chan-instrument-catalog";
import { loadMultiSourceCryptoCandles } from "@/lib/market-data/multi-source-crypto";
import type { ChanCandle, ChanInstrument, ChanTimeframe } from "@/types/chan-execution";
import type { MultiSourceProvenance } from "@/types/market-microstructure";

const intervals = new Set<ChanTimeframe>(["5m", "30m", "1H", "4H", "1D"]);

export type LoadedChanCandles = {
  symbol: string;
  timeframe: ChanTimeframe;
  candles: ChanCandle[];
  error: string | null;
  provenance: MultiSourceProvenance | null;
};

async function fetchYahooCandles(input: {
  providerSymbol: string;
  timeframe: ChanTimeframe;
  capturedNowMs: number;
  signal: AbortSignal;
}): Promise<ChanCandle[]> {
  const continuousFutures = input.providerSymbol.toUpperCase().endsWith("=F");
  const fourHourProfile: YahooFourHourSessionProfile = /\.(?:SS|SZ)$/iu.test(input.providerSymbol)
    ? "CN_EQUITY"
    : /\.HK$|^\^HSTECH$/iu.test(input.providerSymbol)
      ? "HK_EQUITY"
      : "US_EQUITY";
  const queryTimeframe = input.timeframe === "4H"
    ? continuousFutures ? "1h" : "30m"
    : input.timeframe === "1H"
      ? "1h"
      : input.timeframe === "1D"
        ? "1d"
        : input.timeframe === "5m"
          ? "5m"
          : "30m";
  const range = input.timeframe === "1D"
    ? "2y"
    : input.timeframe === "5m"
      ? "30d"
      : input.timeframe === "1H"
        ? "6mo"
        : "60d";
  const encoded = encodeURIComponent(input.providerSymbol);
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${queryTimeframe}&range=${range}&includePrePost=false`, {
    cache: "no-store",
    signal: input.signal,
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 MOOX-Chan-Research/3.0" },
  });
  if (!response.ok) throw new Error(`YAHOO_HTTP_${response.status}`);
  const parsed = parseYahooChanCandles(await response.json());
  if (input.timeframe === "4H" && continuousFutures) {
    return aggregateContinuousFourHourCandles(parsed.candles, input.capturedNowMs).slice(-120);
  }
  const sourceFrame = input.timeframe === "4H" ? "30m" : input.timeframe;
  const closed = filterYahooClosedCandles(parsed.candles, sourceFrame, input.capturedNowMs, parsed.timeZone);
  return input.timeframe === "4H"
    ? aggregateYahooFourHourCandles(closed, parsed.timeZone, input.capturedNowMs, fourHourProfile).slice(-120)
    : closed.slice(-160);
}

async function fetchOrderlyCandles(input: {
  providerSymbol: string;
  timeframe: ChanTimeframe;
  capturedNowMs: number;
  signal: AbortSignal;
}): Promise<ChanCandle[]> {
  const resolution = input.timeframe === "4H"
    ? "60"
    : input.timeframe === "1H"
      ? "60"
      : input.timeframe === "1D"
        ? "1D"
        : input.timeframe === "5m"
          ? "5"
          : "30";
  const lookbackDays = input.timeframe === "1D" ? 760 : input.timeframe === "5m" ? 30 : input.timeframe === "30m" ? 100 : 220;
  const params = new URLSearchParams({
    symbol: input.providerSymbol,
    resolution,
    from: String(Math.floor(input.capturedNowMs / 1_000) - lookbackDays * 86_400),
    to: String(Math.floor(input.capturedNowMs / 1_000)),
  });
  const response = await fetch(`https://api.orderly.org/v1/tv/history?${params}`, {
    cache: "no-store",
    signal: input.signal,
    headers: { Accept: "application/json", "User-Agent": "MOOX-Chan-MoonXDex/2.0" },
  });
  if (!response.ok) throw new Error(`ORDERLY_HISTORY_HTTP_${response.status}`);
  const parsed = parseOrderlyTvCandles(await response.json());
  const closed = input.timeframe === "4H"
    ? aggregateContinuousFourHourCandles(parsed, input.capturedNowMs)
    : filterClosedCandles(parsed, input.timeframe, input.capturedNowMs);
  return closed.slice(-160);
}

async function fetchBitgetCandles(input: {
  providerSymbol: string;
  timeframe: ChanTimeframe;
  capturedNowMs: number;
  signal: AbortSignal;
}): Promise<ChanCandle[]> {
  const query = new URLSearchParams({
    category: "USDT-FUTURES",
    symbol: input.providerSymbol,
    interval: input.timeframe,
    type: "market",
    limit: "160",
  });
  const response = await fetch(`https://api.bitget.com/api/v3/market/candles?${query}`, {
    cache: "no-store",
    signal: input.signal,
    headers: { Accept: "application/json", "User-Agent": "MOOX-Chan-Research/3.0" },
  });
  if (!response.ok) throw new Error(`BITGET_HTTP_${response.status}`);
  const payload = await response.json() as { code?: string; data?: string[][] };
  if (payload.code !== "00000" || !Array.isArray(payload.data)) throw new Error("BITGET_INVALID_MARKET_DATA");
  return filterClosedCandles(
    payload.data.map((row) => ({
      timestamp: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number.isFinite(Number(row[5])) ? Number(row[5]) : null,
    })).filter(isValidChanCandle).sort((a, b) => a.timestamp - b.timestamp),
    input.timeframe,
    input.capturedNowMs
  ).slice(-160);
}

export async function loadChanCandles(input: {
  symbol: string;
  timeframe: string;
  instrument?: ChanInstrument;
  timeoutMs?: number;
  capturedNowMs?: number;
}): Promise<LoadedChanCandles> {
  const capturedNowMs = input.capturedNowMs ?? Date.now();
  const instrument = input.instrument ?? resolveChanInstrument(input.symbol);
  const symbol = instrument?.symbol ?? input.symbol.toUpperCase();
  const timeframe = input.timeframe as ChanTimeframe;
  if (!instrument || !intervals.has(timeframe)) {
    return { symbol, timeframe, candles: [], error: "UNSUPPORTED_MARKET", provenance: null };
  }

  if (instrument.market === "CRYPTO") {
    const multi = await loadMultiSourceCryptoCandles({
      symbol,
      timeframe,
      capturedNowMs,
      timeoutMs: input.timeoutMs ?? 4_500,
      limit: 160,
    });
    if (multi.candles.length) {
      return {
        symbol,
        timeframe,
        candles: multi.candles,
        error: multi.error,
        provenance: multi.provenance,
      };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, Math.min(input.timeoutMs ?? 4_000, 5_000)));
  try {
    if (instrument.provider === "ORDERLY_PUBLIC") {
      try {
        const candles = await fetchOrderlyCandles({ providerSymbol: instrument.providerSymbol, timeframe, capturedNowMs, signal: controller.signal });
        if (candles.length) return { symbol, timeframe, candles, error: null, provenance: null };
      } catch {
        // Orderly remains a safe read-only fallback after the multi-source CEX layer.
      }
      if (instrument.market === "US_EQUITY") {
        const candles = await fetchYahooCandles({ providerSymbol: instrument.symbol, timeframe, capturedNowMs, signal: controller.signal });
        return candles.length
          ? { symbol, timeframe, candles, error: null, provenance: null }
          : { symbol, timeframe, candles: [], error: "EMPTY_MARKET_DATA", provenance: null };
      }
      if (instrument.market === "CRYPTO") {
        const candles = await fetchBitgetCandles({ providerSymbol: `${instrument.symbol}USDT`, timeframe, capturedNowMs, signal: controller.signal });
        return candles.length
          ? { symbol, timeframe, candles, error: null, provenance: null }
          : { symbol, timeframe, candles: [], error: "EMPTY_MARKET_DATA", provenance: null };
      }
      return { symbol, timeframe, candles: [], error: "EMPTY_MARKET_DATA", provenance: null };
    }
    if (instrument.provider === "YAHOO_CHART") {
      const candles = await fetchYahooCandles({ providerSymbol: instrument.providerSymbol, timeframe, capturedNowMs, signal: controller.signal });
      return candles.length
        ? { symbol, timeframe, candles, error: null, provenance: null }
        : { symbol, timeframe, candles: [], error: "EMPTY_MARKET_DATA", provenance: null };
    }
    const candles = await fetchBitgetCandles({ providerSymbol: instrument.providerSymbol, timeframe, capturedNowMs, signal: controller.signal });
    return candles.length
      ? { symbol, timeframe, candles, error: null, provenance: null }
      : { symbol, timeframe, candles: [], error: "EMPTY_MARKET_DATA", provenance: null };
  } catch {
    return { symbol, timeframe, candles: [], error: "MARKET_DATA_TIMEOUT_OR_FAILURE", provenance: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function loadChanTimeframes(input: {
  symbol: string;
  instrument?: ChanInstrument;
  capturedNowMs: number;
  timeoutMs?: number;
}): Promise<LoadedChanCandles[]> {
  return Promise.all(
    (["30m", "1H", "4H", "1D"] as const).map((timeframe) =>
      loadChanCandles({ ...input, timeframe })
    )
  );
}
