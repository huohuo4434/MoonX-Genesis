import "server-only";

import { loadCoinGeckoMarketContext } from "@/lib/market-data/coingecko-market-context";
import {
  assessMicrostructure,
  buildMicrostructureMetrics,
  parseBinanceKlines,
  parseBitgetCandles,
  parseOkxCandles,
  selectMultiSourceCandles,
  type ProviderCandidate,
} from "@/lib/market-data/multi-source-crypto-core";
import {
  binanceInterval,
  bitgetInterval,
  normalizeCryptoBaseSymbol,
  okxInterval,
  toBinanceSpotSymbol,
  toBitgetFuturesSymbol,
  toOkxSpotInstrument,
} from "@/lib/market-data/crypto-market-symbols";
import type { ChanTimeframe } from "@/types/chan-execution";
import type {
  CryptoMarketIntelligence,
  CryptoMarketProvider,
  MultiSourceCryptoCandles,
} from "@/types/market-microstructure";

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson(input: {
  url: string;
  timeoutMs: number;
  revalidate: number;
}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(800, Math.min(input.timeoutMs, 8_000)));
  try {
    const response = await fetch(input.url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MOOX-Multi-Source-Market/1.0",
      },
      signal: controller.signal,
      next: { revalidate: input.revalidate },
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function providerCandidate(input: {
  provider: CryptoMarketProvider;
  url: string;
  timeframe: ChanTimeframe;
  capturedNowMs: number;
  timeoutMs: number;
}): Promise<ProviderCandidate> {
  const startedAt = Date.now();
  try {
    const payload = await fetchJson({
      url: input.url,
      timeoutMs: input.timeoutMs,
      revalidate: input.timeframe === "5m" ? 10 : input.timeframe === "30m" ? 20 : 30,
    });
    const candles = input.provider === "BINANCE_SPOT"
      ? parseBinanceKlines(payload, input.timeframe, input.capturedNowMs)
      : input.provider === "OKX_SPOT"
        ? parseOkxCandles(payload, input.timeframe, input.capturedNowMs)
        : parseBitgetCandles(payload, input.timeframe, input.capturedNowMs);
    return {
      provider: input.provider,
      candles,
      latencyMs: Date.now() - startedAt,
      errorCode: candles.length ? null : `${input.provider}_EMPTY`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    return {
      provider: input.provider,
      candles: [],
      latencyMs: Date.now() - startedAt,
      errorCode: `${input.provider}_${message}`.slice(0, 100),
    };
  }
}

export async function loadMultiSourceCryptoCandles(input: {
  symbol: string;
  timeframe: ChanTimeframe;
  capturedNowMs?: number;
  timeoutMs?: number;
  limit?: number;
}): Promise<MultiSourceCryptoCandles> {
  const capturedNowMs = input.capturedNowMs ?? Date.now();
  const timeoutMs = Math.max(1_500, Math.min(input.timeoutMs ?? 4_500, 8_000));
  const limit = Math.max(40, Math.min(input.limit ?? 180, 300));
  const base = normalizeCryptoBaseSymbol(input.symbol);
  const binanceSymbol = toBinanceSpotSymbol(base);
  const okxInstrument = toOkxSpotInstrument(base);
  const bitgetSymbol = toBitgetFuturesSymbol(base);
  const binanceParams = new URLSearchParams({
    symbol: binanceSymbol,
    interval: binanceInterval(input.timeframe),
    limit: String(limit),
  });
  if (input.timeframe === "1D" || input.timeframe === "1W") binanceParams.set("timeZone", "8");
  const okxParams = new URLSearchParams({
    instId: okxInstrument,
    bar: okxInterval(input.timeframe),
    limit: String(Math.min(limit, 300)),
  });
  const bitgetParams = new URLSearchParams({
    category: "USDT-FUTURES",
    symbol: bitgetSymbol,
    interval: bitgetInterval(input.timeframe),
    type: "market",
    limit: String(Math.min(limit, 200)),
  });

  const candidates = await Promise.all([
    providerCandidate({
      provider: "BINANCE_SPOT",
      url: `https://data-api.binance.vision/api/v3/klines?${binanceParams}`,
      timeframe: input.timeframe,
      capturedNowMs,
      timeoutMs,
    }),
    providerCandidate({
      provider: "OKX_SPOT",
      url: `https://www.okx.com/api/v5/market/candles?${okxParams}`,
      timeframe: input.timeframe,
      capturedNowMs,
      timeoutMs,
    }),
    providerCandidate({
      provider: "BITGET_FUTURES",
      url: `https://api.bitget.com/api/v3/market/candles?${bitgetParams}`,
      timeframe: input.timeframe,
      capturedNowMs,
      timeoutMs,
    }),
  ]);
  return selectMultiSourceCandles({ symbol: base, timeframe: input.timeframe, candidates, capturedNowMs });
}

type BinancePremiumIndex = {
  markPrice?: string;
  indexPrice?: string;
  lastFundingRate?: string;
  nextFundingTime?: number;
};

type BinanceOpenInterest = { openInterest?: string };
type BinanceOpenInterestHistory = Array<{
  sumOpenInterest?: string;
  sumOpenInterestValue?: string;
  timestamp?: number;
}>;
type BinanceRatioHistory = Array<{
  longShortRatio?: string;
  longAccount?: string;
  shortAccount?: string;
  timestamp?: number;
}>;
type BinanceTakerHistory = Array<{
  buySellRatio?: string;
  buyVol?: string;
  sellVol?: string;
  timestamp?: number;
}>;

async function loadBinanceMicrostructure(input: {
  symbol: string;
  spotPrice: number | null;
  priceFirst: number | null;
  priceLast: number | null;
  timeoutMs: number;
}) {
  const futuresSymbol = toBitgetFuturesSymbol(input.symbol);
  const period = "5m";
  const settled = await Promise.allSettled([
    fetchJson({ url: `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(futuresSymbol)}`, timeoutMs: input.timeoutMs, revalidate: 15 }),
    fetchJson({ url: `https://fapi.binance.com/fapi/v1/openInterest?symbol=${encodeURIComponent(futuresSymbol)}`, timeoutMs: input.timeoutMs, revalidate: 15 }),
    fetchJson({ url: `https://fapi.binance.com/futures/data/openInterestHist?symbol=${encodeURIComponent(futuresSymbol)}&period=${period}&limit=12`, timeoutMs: input.timeoutMs, revalidate: 30 }),
    fetchJson({ url: `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${encodeURIComponent(futuresSymbol)}&period=${period}&limit=12`, timeoutMs: input.timeoutMs, revalidate: 30 }),
    fetchJson({ url: `https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${encodeURIComponent(futuresSymbol)}&period=${period}&limit=12`, timeoutMs: input.timeoutMs, revalidate: 30 }),
    fetchJson({ url: `https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(futuresSymbol)}&interval=5m&limit=12`, timeoutMs: input.timeoutMs, revalidate: 15 }),
  ]);
  const values: unknown[] = settled.map((row) => row.status === "fulfilled" ? row.value : null);
  const premium = (values[0] ?? {}) as BinancePremiumIndex;
  const currentOi = (values[1] ?? {}) as BinanceOpenInterest;
  const oiHistory = (Array.isArray(values[2]) ? values[2] as BinanceOpenInterestHistory : [])
    .slice().sort((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0));
  const ratioHistory = (Array.isArray(values[3]) ? values[3] as BinanceRatioHistory : [])
    .slice().sort((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0));
  const takerHistory = (Array.isArray(values[4]) ? values[4] as BinanceTakerHistory : [])
    .slice().sort((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0));
  const futuresCandles = parseBinanceKlines(values[5], "5m", Date.now());
  const firstOi = oiHistory.at(0);
  const lastOi = oiHistory.at(-1);
  const lastRatio = ratioHistory.at(-1);
  const lastTaker = takerHistory.at(-1);
  const futuresPrice = futuresCandles.at(-1)?.close ?? null;
  return buildMicrostructureMetrics({
    spotPrice: input.spotPrice,
    futuresPrice,
    markPrice: premium.markPrice,
    indexPrice: premium.indexPrice,
    fundingRate: premium.lastFundingRate,
    nextFundingTime: premium.nextFundingTime,
    openInterest: currentOi.openInterest,
    openInterestValue: lastOi?.sumOpenInterestValue,
    openInterestFirst: firstOi?.sumOpenInterest,
    openInterestLast: lastOi?.sumOpenInterest,
    longShortRatio: lastRatio?.longShortRatio,
    longAccount: lastRatio?.longAccount,
    shortAccount: lastRatio?.shortAccount,
    takerBuySellRatio: lastTaker?.buySellRatio,
    priceFirst: input.priceFirst,
    priceLast: input.priceLast,
  });
}

export async function loadCryptoMarketIntelligence(input: {
  symbol: string;
  timeframe: ChanTimeframe;
  capturedNowMs?: number;
  timeoutMs?: number;
}): Promise<CryptoMarketIntelligence> {
  const capturedNowMs = input.capturedNowMs ?? Date.now();
  const base = normalizeCryptoBaseSymbol(input.symbol);
  const timeoutMs = Math.max(1_500, Math.min(input.timeoutMs ?? 4_500, 8_000));
  const candles = await loadMultiSourceCryptoCandles({
    symbol: base,
    timeframe: input.timeframe,
    capturedNowMs,
    timeoutMs,
    limit: 180,
  });
  const selectedPrice = candles.candles.at(-1)?.close ?? candles.provenance.consensusPrice;
  const [metrics, marketContext] = await Promise.all([
    loadBinanceMicrostructure({
      symbol: base,
      spotPrice: selectedPrice,
      priceFirst: candles.candles.at(-12)?.close ?? candles.candles.at(0)?.close ?? null,
      priceLast: candles.candles.at(-1)?.close ?? null,
      timeoutMs,
    }).catch(() => buildMicrostructureMetrics({ spotPrice: selectedPrice })),
    loadCoinGeckoMarketContext(),
  ]);
  return {
    symbol: base,
    timeframe: input.timeframe,
    candles: candles.candles,
    provenance: candles.provenance,
    metrics,
    assessment: assessMicrostructure(metrics),
    marketContext,
    capturedAt: new Date(capturedNowMs).toISOString(),
    researchOnly: true,
    autoTradingChanged: false,
  };
}

export async function loadCoreCryptoSourceHealth(input?: {
  symbols?: string[];
  timeframe?: ChanTimeframe;
  timeoutMs?: number;
}) {
  const symbols = (input?.symbols?.length ? input.symbols : ["BTC", "ETH", "SOL", "HYPE"])
    .map(normalizeCryptoBaseSymbol)
    .slice(0, 12);
  const timeframe = input?.timeframe ?? "5m";
  const rows = await Promise.all(symbols.map(async (symbol) => {
    const result = await loadMultiSourceCryptoCandles({
      symbol,
      timeframe,
      timeoutMs: input?.timeoutMs ?? 3_500,
      limit: 80,
    });
    return { symbol, provenance: result.provenance, error: result.error };
  }));
  return {
    generatedAt: new Date().toISOString(),
    timeframe,
    rows,
    researchOnly: true as const,
    autoTradingChanged: false as const,
  };
}

export function microstructureNumber(value: unknown): number | null {
  return finiteNumber(value);
}
