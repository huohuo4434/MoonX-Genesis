import "server-only";

import {
  getCryptoLivePrices,
  isAutoCryptoSymbol,
  type CryptoLivePrice,
} from "@/lib/market-data/crypto-live-prices";

export type TradingSignalPriceProvider =
  | "BITGET"
  | "HYPERLIQUID"
  | "YAHOO"
  | "DEXSCREENER";

export type TradingSignalLivePrice = {
  symbol: string;
  normalizedSymbol: string;
  price: number;
  provider: TradingSignalPriceProvider;
  sourceSymbol: string;
  capturedAt: string;
};

const ASTEROID_CONTRACT = "0xf280b16ef293d8e534e370794ef26bf312694126";

const YAHOO_SYMBOLS: Record<string, string> = {
  MU: "MU",
  WTI: "CL=F",
  "688825": "688825.SS",
};

export const AUTOMATIC_SIGNAL_PRICE_SYMBOLS = [
  "BTC",
  "ETH",
  "HYPE",
  "MU",
  "WTI",
  "688825",
  "ASTEROID",
] as const;

function normalizeSymbol(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[-_/\s]/g, "");
  if (normalized === "BTCUSDT" || normalized === "BTCUSD") return "BTC";
  if (normalized === "ETHUSDT" || normalized === "ETHUSD") return "ETH";
  if (normalized === "HYPEUSDT" || normalized === "HYPEUSD") return "HYPE";
  if (normalized === "CL" || normalized === "CL=F" || normalized === "WTIUSD") return "WTI";
  if (normalized === "688825SS") return "688825";
  return normalized;
}

export function isTradingSignalAutoPriceSupported(symbol: string): boolean {
  return AUTOMATIC_SIGNAL_PRICE_SYMBOLS.includes(
    normalizeSymbol(symbol) as (typeof AUTOMATIC_SIGNAL_PRICE_SYMBOLS)[number]
  );
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = 12_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

type YahooChartResponse = {
  chart?: {
    error?: { description?: string } | null;
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
  };
};

async function fetchYahooPrice(
  normalizedSymbol: string,
  quoteSymbol: string
): Promise<TradingSignalLivePrice> {
  const encoded = encodeURIComponent(quoteSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=5d&includePrePost=true`;
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; MoonX-Signal-Monitor/1.0)",
    },
  });
  if (!response.ok) throw new Error(`Yahoo ${quoteSymbol} HTTP ${response.status}`);

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  if (!result) {
    throw new Error(payload.chart?.error?.description || `${quoteSymbol}没有行情数据`);
  }

  let price = Number(result.meta?.regularMarketPrice);
  let capturedAtSeconds = Number(result.meta?.regularMarketTime);
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];

  if (!Number.isFinite(price) || price <= 0) {
    for (let index = closes.length - 1; index >= 0; index -= 1) {
      const candidate = Number(closes[index]);
      if (!Number.isFinite(candidate) || candidate <= 0) continue;
      price = candidate;
      capturedAtSeconds = Number(timestamps[index]);
      break;
    }
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`${quoteSymbol}没有有效价格`);
  }

  return {
    symbol: normalizedSymbol,
    normalizedSymbol,
    price,
    provider: "YAHOO",
    sourceSymbol: result.meta?.symbol || quoteSymbol,
    capturedAt:
      Number.isFinite(capturedAtSeconds) && capturedAtSeconds > 0
        ? new Date(capturedAtSeconds * 1000).toISOString()
        : new Date().toISOString(),
  };
}

type DexScreenerPair = {
  chainId?: string;
  pairAddress?: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
  baseToken?: { address?: string; symbol?: string };
};

async function fetchAsteroidPrice(): Promise<TradingSignalLivePrice> {
  const response = await fetchWithTimeout(
    `https://api.dexscreener.com/token-pairs/v1/ethereum/${ASTEROID_CONTRACT}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MoonX-Signal-Monitor/1.0",
      },
    }
  );
  if (!response.ok) throw new Error(`DexScreener ASTEROID HTTP ${response.status}`);

  const payload = (await response.json()) as DexScreenerPair[];
  if (!Array.isArray(payload) || !payload.length) {
    throw new Error("ASTEROID没有可用交易池");
  }

  const contract = ASTEROID_CONTRACT.toLowerCase();
  const candidates = payload
    .filter((row) => row.baseToken?.address?.toLowerCase() === contract)
    .map((row) => ({
      row,
      price: Number(row.priceUsd),
      liquidity: Number(row.liquidity?.usd ?? 0),
    }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0)
    .sort((a, b) => b.liquidity - a.liquidity);

  const selected = candidates[0];
  if (!selected) throw new Error("ASTEROID没有有效美元价格");

  return {
    symbol: "ASTEROID",
    normalizedSymbol: "ASTEROID",
    price: selected.price,
    provider: "DEXSCREENER",
    sourceSymbol: `${selected.row.chainId ?? "ethereum"}:${selected.row.pairAddress ?? ASTEROID_CONTRACT}`,
    capturedAt: new Date().toISOString(),
  };
}

function fromCryptoPrice(row: CryptoLivePrice): TradingSignalLivePrice {
  return {
    symbol: row.symbol,
    normalizedSymbol: row.symbol,
    price: row.price,
    provider: row.provider,
    sourceSymbol: row.sourceSymbol,
    capturedAt: row.capturedAt,
  };
}

export async function getTradingSignalLivePrices(
  symbols: string[]
): Promise<{ prices: TradingSignalLivePrice[]; warnings: string[] }> {
  const requested = new Set(symbols.map(normalizeSymbol).filter(Boolean));
  const prices = new Map<string, TradingSignalLivePrice>();
  const warnings: string[] = [];

  const cryptoSymbols = [...requested].filter((symbol) => isAutoCryptoSymbol(symbol));
  if (cryptoSymbols.length) {
    const crypto = await getCryptoLivePrices(cryptoSymbols);
    crypto.prices.forEach((row) => prices.set(row.symbol, fromCryptoPrice(row)));
    warnings.push(...crypto.warnings);
  }

  const yahooRequests = [...requested].filter((symbol) => YAHOO_SYMBOLS[symbol]);
  const yahooResults = await Promise.allSettled(
    yahooRequests.map((symbol) => fetchYahooPrice(symbol, YAHOO_SYMBOLS[symbol]!))
  );
  yahooResults.forEach((result, index) => {
    const symbol = yahooRequests[index]!;
    if (result.status === "fulfilled") {
      prices.set(symbol, result.value);
    } else {
      warnings.push(`${symbol}自动行情不可用：${result.reason instanceof Error ? result.reason.message : "未知错误"}`);
    }
  });

  if (requested.has("ASTEROID")) {
    try {
      prices.set("ASTEROID", await fetchAsteroidPrice());
    } catch (error) {
      warnings.push(
        `ASTEROID自动行情不可用：${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  for (const symbol of requested) {
    if (!isTradingSignalAutoPriceSupported(symbol)) {
      warnings.push(`${symbol}尚未配置自动行情，需要人工输入真实价格`);
    } else if (!prices.has(symbol)) {
      warnings.push(`${symbol}本轮没有取得有效实时价格`);
    }
  }

  return { prices: [...prices.values()], warnings };
}

export function tradingSignalPriceKey(symbol: string): string {
  return normalizeSymbol(symbol);
}
