import "server-only";

import { normalizeManualPriceSymbol } from "@/lib/market-data/manual-market-prices";

export type MoonXDexLivePrice = {
  symbol: string;
  normalizedSymbol: string;
  price: number;
  provider: "MOONXDEX";
  sourceSymbol: string;
  capturedAt: string;
};

type OrderlyMarketRow = {
  symbol?: string;
  index_price?: number | string | null;
  mark_price?: number | string | null;
  "24h_close"?: number | string | null;
};

type OrderlyMarketResponse = {
  success?: boolean;
  data?: { rows?: OrderlyMarketRow[] };
  timestamp?: number;
  message?: string;
};

const ORDERLY_MARKET_SYMBOLS: Record<string, string[]> = {
  BTC: ["PERP_BTC_USDC", "PERP_BTC_USDT"],
  ETH: ["PERP_ETH_USDC", "PERP_ETH_USDT"],
  HYPE: ["PERP_HYPE_USDC", "PERP_HYPE_USDT"],
  SPX: ["PERP_SPX500_USDC", "PERP_SPX500_USDT"],
  NDX: ["PERP_NAS100_USDC", "PERP_NAS100_USDT"],
  GOLD: ["PERP_XAU_USDC", "PERP_XAU_USDT"],
  SILVER: ["PERP_XAG_USDC", "PERP_XAG_USDT"],
  WTI: ["PERP_CL_USDC", "PERP_CL_USDT"],
};

function compact(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function rowPrice(row: OrderlyMarketRow): number {
  for (const value of [row.index_price, row.mark_price, row["24h_close"]]) {
    const price = Number(value);
    if (Number.isFinite(price) && price > 0) return price;
  }
  return Number.NaN;
}

function matchScore(rowSymbol: string, requested: string): number {
  const candidates = ORDERLY_MARKET_SYMBOLS[requested] ?? [];
  if (!candidates.length) return 0;
  const normalized = compact(rowSymbol);
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = compact(candidates[index]!);
    if (normalized === candidate) return 200 - index;
    // Some Orderly responses append a market suffix such as `.c`.
    if (normalized.startsWith(candidate)) return 150 - index;
  }
  return 0;
}

async function fetchOrderlyRows(url: string): Promise<{ rows: OrderlyMarketRow[]; timestamp: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "MoonX-Intelligence/1.0",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as OrderlyMarketResponse;
    const rows = payload.data?.rows;
    if (payload.success === false || !Array.isArray(rows)) {
      throw new Error(payload.message || "没有返回市场列表");
    }
    return { rows, timestamp: Number(payload.timestamp) };
  } finally {
    clearTimeout(timer);
  }
}

export async function getMoonXDexLivePrices(
  symbols: readonly string[]
): Promise<{ prices: MoonXDexLivePrice[]; warnings: string[] }> {
  const requested = [...new Set(symbols.map(normalizeManualPriceSymbol).filter(Boolean))];
  if (!requested.length) return { prices: [], warnings: [] };

  const endpoints = [
    "https://api.orderly.org/v1/public/futures",
    "https://api.orderly.org/v1/public/futures_market",
  ];
  const errors: string[] = [];
  let rows: OrderlyMarketRow[] = [];
  let timestamp = Date.now();

  for (const endpoint of endpoints) {
    try {
      const result = await fetchOrderlyRows(endpoint);
      rows = result.rows;
      if (Number.isFinite(result.timestamp) && result.timestamp > 0) timestamp = result.timestamp;
      if (rows.length) break;
    } catch (error) {
      errors.push(`${endpoint.endsWith("futures") ? "市场列表" : "市场行情"}：${
        error instanceof Error ? error.message : "未知错误"
      }`);
    }
  }

  if (!rows.length) return { prices: [], warnings: [`MoonX DEX行情不可用：${errors.join("；")}`] };

  const prices: MoonXDexLivePrice[] = [];
  for (const symbol of requested) {
    const candidates = rows
      .map((row) => ({ row, score: matchScore(String(row.symbol ?? ""), symbol), price: rowPrice(row) }))
      .filter((item) => item.score > 0 && Number.isFinite(item.price) && item.price > 0)
      .sort((a, b) => b.score - a.score);
    const selected = candidates[0];
    if (!selected) continue;
    prices.push({
      symbol,
      normalizedSymbol: symbol,
      price: selected.price,
      provider: "MOONXDEX",
      sourceSymbol: String(selected.row.symbol ?? symbol),
      capturedAt: Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp).toISOString()
        : new Date().toISOString(),
    });
  }

  return { prices, warnings: errors.length && !prices.length ? errors : [] };
}
