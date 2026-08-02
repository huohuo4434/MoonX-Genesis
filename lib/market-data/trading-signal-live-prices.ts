import "server-only";

import {
  getCryptoLivePrices,
  isAutoCryptoSymbol,
  type CryptoLivePrice,
} from "@/lib/market-data/crypto-live-prices";
import { getMoonXDexLivePrices } from "@/lib/market-data/orderly-live-prices";
import {
  getFreshManualMarketPrices,
  normalizeManualPriceSymbol,
} from "@/lib/market-data/manual-market-prices";

export type TradingSignalPriceProvider =
  | "BITGET"
  | "HYPERLIQUID"
  | "YAHOO"
  | "STOOQ"
  | "DEXSCREENER"
  | "MOONXDEX"
  | "MANUAL";

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
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  HYPE: "HYPE-USD",
  SPX: "^GSPC",
  NDX: "^NDX",
  SSE: "000001.SS",
  HSTECH: "^HSTECH",
  GOLD: "GC=F",
  SILVER: "SI=F",
  MU: "MU",
  WTI: "CL=F",
  "688825": "688825.SS",
};

export const AUTOMATIC_SIGNAL_PRICE_SYMBOLS = [
  "BTC",
  "ETH",
  "HYPE",
  "SPX",
  "NDX",
  "SSE",
  "HSTECH",
  "GOLD",
  "SILVER",
  "MU",
  "WTI",
  "688825",
  "ASTEROID",
] as const;

function normalizeSymbol(value: string): string {
  return normalizeManualPriceSymbol(value);
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

function yahooResultToPrice(
  normalizedSymbol: string,
  quoteSymbol: string,
  payload: YahooChartResponse
): TradingSignalLivePrice {
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

async function fetchYahooPrice(
  normalizedSymbol: string,
  quoteSymbol: string
): Promise<TradingSignalLivePrice> {
  const encoded = encodeURIComponent(quoteSymbol);
  const attempts = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=5d&includePrePost=true`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=5d&includePrePost=true`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1mo&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1mo&includePrePost=false`,
  ];
  const errors: string[] = [];

  for (const url of attempts) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; MoonX-Signal-Monitor/1.2)",
        },
      }, 5_000);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return yahooResultToPrice(
        normalizedSymbol,
        quoteSymbol,
        (await response.json()) as YahooChartResponse
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "未知错误");
    }
  }

  throw new Error(errors.join("；"));
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

async function fetchStooqWtiPrice(): Promise<TradingSignalLivePrice> {
  const response = await fetchWithTimeout(
    "https://stooq.com/q/l/?s=cl.f&f=sd2t2ohlcv&h&e=csv",
    {
      method: "GET",
      headers: {
        Accept: "text/csv,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 (compatible; MoonX-Signal-Monitor/1.2)",
      },
    },
    6_000
  );
  if (!response.ok) throw new Error(`Stooq CL.F HTTP ${response.status}`);
  const lines = (await response.text())
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("Stooq没有返回WTI行情");

  const headers = parseCsvLine(lines[0]!).map((value) => value.toLowerCase());
  const values = parseCsvLine(lines[1]!);
  const closeIndex = headers.findIndex((value) => value === "close" || value === "last");
  const dateIndex = headers.findIndex((value) => value === "date");
  const timeIndex = headers.findIndex((value) => value === "time");
  const price = Number(values[closeIndex]);
  if (closeIndex < 0 || !Number.isFinite(price) || price <= 0) {
    throw new Error("Stooq返回的WTI价格无效");
  }

  const dateText = dateIndex >= 0 ? values[dateIndex] : "";
  const timeText = timeIndex >= 0 ? values[timeIndex] : "";
  const parsedDate = dateText
    ? new Date(`${dateText}T${timeText && timeText !== "N/D" ? timeText : "00:00:00"}Z`)
    : new Date();

  return {
    symbol: "WTI",
    normalizedSymbol: "WTI",
    price,
    provider: "STOOQ",
    sourceSymbol: "CL.F",
    capturedAt: Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString(),
  };
}

type DexScreenerPair = {
  chainId?: string;
  pairAddress?: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
  baseToken?: { address?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
};

type DexScreenerPayload = DexScreenerPair[] | { pairs?: DexScreenerPair[] };

function dexPairs(payload: DexScreenerPayload): DexScreenerPair[] {
  return Array.isArray(payload) ? payload : Array.isArray(payload.pairs) ? payload.pairs : [];
}

async function fetchDexPayload(url: string): Promise<DexScreenerPair[]> {
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "MoonX-Signal-Monitor/1.2",
    },
  }, 6_000);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return dexPairs((await response.json()) as DexScreenerPayload);
}

async function fetchAsteroidPrice(): Promise<TradingSignalLivePrice> {
  const endpoints = [
    `https://api.dexscreener.com/token-pairs/v1/ethereum/${ASTEROID_CONTRACT}`,
    `https://api.dexscreener.com/latest/dex/tokens/${ASTEROID_CONTRACT}`,
  ];
  const allPairs: DexScreenerPair[] = [];
  const errors: string[] = [];

  for (const endpoint of endpoints) {
    try {
      allPairs.push(...(await fetchDexPayload(endpoint)));
      if (allPairs.length) break;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "未知错误");
    }
  }

  if (!allPairs.length) {
    throw new Error(errors.length ? errors.join("；") : "没有可用交易池");
  }

  const contract = ASTEROID_CONTRACT.toLowerCase();
  const candidates = allPairs
    .filter((row) => row.baseToken?.address?.toLowerCase() === contract)
    .map((row) => ({
      row,
      price: Number(row.priceUsd),
      liquidity: Number(row.liquidity?.usd ?? 0),
    }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0)
    .sort((a, b) => b.liquidity - a.liquidity);

  const selected = candidates[0];
  if (!selected) throw new Error("没有找到以ASTEROID为基础代币的有效美元价格");

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

  // moonxdex.io is an Orderly trading application. Read the same zero-auth public
  // market list directly instead of scraping rendered HTML.
  const moonxDex = await getMoonXDexLivePrices([...requested]);
  moonxDex.prices.forEach((row) => prices.set(row.normalizedSymbol, row));
  warnings.push(...moonxDex.warnings);

  const missingCrypto = [...requested].filter(
    (symbol) => !prices.has(symbol) && isAutoCryptoSymbol(symbol)
  );
  if (missingCrypto.length) {
    const crypto = await getCryptoLivePrices(missingCrypto);
    crypto.prices.forEach((row) => prices.set(row.symbol, fromCryptoPrice(row)));
    warnings.push(...crypto.warnings);
  }

  const yahooRequests = [...requested].filter(
    (symbol) => !prices.has(symbol) && Boolean(YAHOO_SYMBOLS[symbol])
  );
  const yahooResults = await Promise.allSettled(
    yahooRequests.map((symbol) => fetchYahooPrice(symbol, YAHOO_SYMBOLS[symbol]!))
  );
  yahooResults.forEach((result, index) => {
    const symbol = yahooRequests[index]!;
    if (result.status === "fulfilled") {
      prices.set(symbol, result.value);
    } else {
      warnings.push(
        `${symbol}备用行情不可用：${
          result.reason instanceof Error ? result.reason.message : "未知错误"
        }`
      );
    }
  });

  if (requested.has("WTI") && !prices.has("WTI")) {
    try {
      prices.set("WTI", await fetchStooqWtiPrice());
    } catch (error) {
      warnings.push(
        `WTI备用行情不可用：${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  if (requested.has("ASTEROID") && !prices.has("ASTEROID")) {
    try {
      prices.set("ASTEROID", await fetchAsteroidPrice());
    } catch (error) {
      warnings.push(
        `ASTEROID自动行情不可用：${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  const stillMissing = [...requested].filter((symbol) => !prices.has(symbol));
  if (stillMissing.length) {
    try {
      const manualRows = await getFreshManualMarketPrices(stillMissing, 96);
      for (const row of manualRows) {
        prices.set(row.symbol, {
          symbol: row.symbol,
          normalizedSymbol: row.symbol,
          price: row.price,
          provider: "MANUAL",
          sourceSymbol: row.note ? `管理员录入：${row.note}` : "管理员手动录入",
          capturedAt: row.capturedAt,
        });
      }
    } catch (error) {
      warnings.push(
        `手动行情兜底读取失败：${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  for (const symbol of requested) {
    if (!isTradingSignalAutoPriceSupported(symbol)) {
      warnings.push(`${symbol}尚未加入行情清单`);
    } else if (!prices.has(symbol)) {
      warnings.push(`${symbol}本轮没有取得有效价格，可在后台“行情录入”手动补充`);
    }
  }

  return { prices: [...prices.values()], warnings };
}

export function tradingSignalPriceKey(symbol: string): string {
  return normalizeSymbol(symbol);
}
