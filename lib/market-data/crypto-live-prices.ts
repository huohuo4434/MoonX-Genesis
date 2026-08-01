import "server-only";

export type CryptoPriceProvider = "BITGET" | "HYPERLIQUID";

export type CryptoLivePrice = {
  symbol: "BTC" | "ETH" | "HYPE";
  price: number;
  provider: CryptoPriceProvider;
  sourceSymbol: string;
  capturedAt: string;
};

type BitgetTickerRow = {
  symbol?: string;
  lastPr?: string;
  markPrice?: string;
  ts?: string;
};

type BitgetTickerResponse = {
  code?: string;
  msg?: string;
  data?: BitgetTickerRow[];
};

const SUPPORTED_SYMBOLS = ["BTC", "ETH", "HYPE"] as const;
type SupportedSymbol = (typeof SUPPORTED_SYMBOLS)[number];

function normalizeSupportedSymbol(value: string): SupportedSymbol | null {
  const normalized = value.trim().toUpperCase().replace(/[-_/]/g, "");
  if (normalized === "BTC" || normalized === "BTCUSDT") return "BTC";
  if (normalized === "ETH" || normalized === "ETHUSDT") return "ETH";
  if (normalized === "HYPE" || normalized === "HYPEUSDT") return "HYPE";
  return null;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = 8000
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

async function fetchBitgetPrices(): Promise<Map<SupportedSymbol, CryptoLivePrice>> {
  const result = new Map<SupportedSymbol, CryptoLivePrice>();
  const response = await fetchWithTimeout(
    "https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MoonX-Paper-Monitor/1.0",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Bitget行情HTTP ${response.status}`);
  }

  const payload = (await response.json()) as BitgetTickerResponse;
  if (payload.code !== "00000" || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || "Bitget行情返回异常");
  }

  for (const row of payload.data) {
    const symbol = normalizeSupportedSymbol(String(row.symbol ?? ""));
    if (!symbol || result.has(symbol)) continue;

    const price = Number(row.lastPr ?? row.markPrice);
    if (!Number.isFinite(price) || price <= 0) continue;

    const timestamp = Number(row.ts);
    result.set(symbol, {
      symbol,
      price,
      provider: "BITGET",
      sourceSymbol: String(row.symbol),
      capturedAt:
        Number.isFinite(timestamp) && timestamp > 0
          ? new Date(timestamp).toISOString()
          : new Date().toISOString(),
    });
  }

  return result;
}

async function fetchHyperliquidPrices(): Promise<
  Map<SupportedSymbol, CryptoLivePrice>
> {
  const result = new Map<SupportedSymbol, CryptoLivePrice>();
  const response = await fetchWithTimeout(
    "https://api.hyperliquid.xyz/info",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "MoonX-Paper-Monitor/1.0",
      },
      body: JSON.stringify({ type: "allMids" }),
    }
  );

  if (!response.ok) {
    throw new Error(`Hyperliquid行情HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, string>;
  for (const symbol of SUPPORTED_SYMBOLS) {
    const price = Number(payload[symbol]);
    if (!Number.isFinite(price) || price <= 0) continue;
    result.set(symbol, {
      symbol,
      price,
      provider: "HYPERLIQUID",
      sourceSymbol: symbol,
      capturedAt: new Date().toISOString(),
    });
  }
  return result;
}

export async function getCryptoLivePrices(
  symbols: string[]
): Promise<{
  prices: CryptoLivePrice[];
  warnings: string[];
}> {
  const requested = new Set<SupportedSymbol>();
  for (const value of symbols) {
    const symbol = normalizeSupportedSymbol(value);
    if (symbol) requested.add(symbol);
  }

  if (!requested.size) return { prices: [], warnings: [] };

  const warnings: string[] = [];
  const merged = new Map<SupportedSymbol, CryptoLivePrice>();

  try {
    const bitget = await fetchBitgetPrices();
    for (const [symbol, row] of bitget) {
      if (requested.has(symbol)) merged.set(symbol, row);
    }
  } catch (error) {
    warnings.push(
      `Bitget行情不可用：${error instanceof Error ? error.message : "未知错误"}`
    );
  }

  const missing = [...requested].filter((symbol) => !merged.has(symbol));
  if (missing.length) {
    try {
      const hyperliquid = await fetchHyperliquidPrices();
      for (const symbol of missing) {
        const row = hyperliquid.get(symbol);
        if (row) merged.set(symbol, row);
      }
    } catch (error) {
      warnings.push(
        `Hyperliquid备用行情不可用：${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  for (const symbol of requested) {
    if (!merged.has(symbol)) warnings.push(`${symbol}未取得有效实时价格`);
  }

  return {
    prices: [...merged.values()],
    warnings,
  };
}

export function isAutoCryptoSymbol(symbol: string): boolean {
  return normalizeSupportedSymbol(symbol) !== null;
}
