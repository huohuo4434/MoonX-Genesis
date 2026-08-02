import "server-only";

import { prisma } from "@/lib/prisma";

export const MANUAL_PRICE_ASSETS = [
  { symbol: "BTC", name: "比特币", venue: "全球加密市场" },
  { symbol: "ETH", name: "以太坊", venue: "全球加密市场" },
  { symbol: "HYPE", name: "HYPE", venue: "Hyperliquid" },
  { symbol: "SPX", name: "标普500指数", venue: "美国指数市场" },
  { symbol: "NDX", name: "纳斯达克100指数", venue: "美国指数市场" },
  { symbol: "SSE", name: "上证指数", venue: "上海证券交易所" },
  { symbol: "HSTECH", name: "恒生科技指数", venue: "香港交易所" },
  { symbol: "GOLD", name: "国际金价", venue: "COMEX黄金期货" },
  { symbol: "SILVER", name: "国际银价", venue: "COMEX白银期货" },
  { symbol: "WTI", name: "WTI原油", venue: "NYMEX原油期货" },
  { symbol: "MU", name: "美光科技", venue: "纳斯达克证券交易所" },
  { symbol: "688825", name: "长鑫科技", venue: "上海证券交易所科创板" },
  { symbol: "ASTEROID", name: "Asteroid（太空狗）", venue: "以太坊链上市场" },
] as const;

export type ManualMarketPrice = {
  symbol: string;
  price: number;
  note: string;
  capturedAt: string;
  updatedAt: string;
};

type ManualPriceDbRow = {
  symbol: string;
  price: number | string;
  note: string | null;
  captured_at: Date | string;
  updated_at: Date | string;
};

let ensured = false;

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function normalizeManualPriceSymbol(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[-_/\s]/g, "");
  if (normalized === "BTCUSDT" || normalized === "BTCUSD") return "BTC";
  if (normalized === "ETHUSDT" || normalized === "ETHUSD") return "ETH";
  if (normalized === "HYPEUSDT" || normalized === "HYPEUSD") return "HYPE";
  if (["SP500", "SPX500", "US500", "GSPC"].includes(normalized)) return "SPX";
  if (["NASDAQ100", "NAS100", "USTEC", "IXIC"].includes(normalized)) return "NDX";
  if (["SHCOMP", "SSEC", "000001SS"].includes(normalized)) return "SSE";
  if (["HKTECH", "HST", "HSTECHINDEX"].includes(normalized)) return "HSTECH";
  if (["GLD", "XAU", "XAUUSD", "GCF"].includes(normalized)) return "GOLD";
  if (["SI", "XAG", "XAGUSD", "SIF"].includes(normalized)) return "SILVER";
  if (["CL", "CLF", "USOIL", "WTIUSD"].includes(normalized)) return "WTI";
  if (normalized === "688825SS") return "688825";
  return normalized;
}

export async function ensureManualMarketPricesTable(): Promise<boolean> {
  if (ensured) return true;
  if (!prisma) return false;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS manual_market_prices (
        symbol TEXT PRIMARY KEY,
        price DOUBLE PRECISION NOT NULL CHECK (price > 0),
        note TEXT NOT NULL DEFAULT '',
        captured_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    ensured = true;
    return true;
  } catch (error) {
    console.error("manual market price table unavailable", error);
    return false;
  }
}

function mapRow(row: ManualPriceDbRow): ManualMarketPrice {
  return {
    symbol: normalizeManualPriceSymbol(row.symbol),
    price: Number(row.price),
    note: row.note ?? "",
    capturedAt: iso(row.captured_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function listManualMarketPrices(): Promise<ManualMarketPrice[]> {
  if (!(await ensureManualMarketPricesTable()) || !prisma) return [];
  const rows = await prisma.$queryRawUnsafe<ManualPriceDbRow[]>(
    `SELECT symbol, price, note, captured_at, updated_at
       FROM manual_market_prices
      ORDER BY symbol ASC`
  );
  return rows.map(mapRow).filter((row) => Number.isFinite(row.price) && row.price > 0);
}

export async function getFreshManualMarketPrices(
  symbols: readonly string[],
  maxAgeHours = 96
): Promise<ManualMarketPrice[]> {
  const requested = new Set(symbols.map(normalizeManualPriceSymbol).filter(Boolean));
  if (!requested.size) return [];
  const cutoff = Date.now() - Math.max(1, maxAgeHours) * 60 * 60 * 1000;
  return (await listManualMarketPrices()).filter(
    (row) => requested.has(row.symbol) && new Date(row.capturedAt).getTime() >= cutoff
  );
}

export async function upsertManualMarketPrices(
  rows: Array<{ symbol: string; price: number; note?: string; capturedAt?: string }>
): Promise<ManualMarketPrice[]> {
  if (!(await ensureManualMarketPricesTable()) || !prisma) {
    throw new Error("数据库未连接，无法保存手动行情");
  }

  for (const row of rows) {
    const symbol = normalizeManualPriceSymbol(row.symbol);
    const price = Number(row.price);
    if (!symbol || !Number.isFinite(price) || price <= 0) continue;
    const capturedAt = row.capturedAt ? new Date(row.capturedAt) : new Date();
    const safeCapturedAt = Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt;
    const note = String(row.note ?? "").slice(0, 300);
    await prisma.$executeRaw`
      INSERT INTO manual_market_prices (symbol, price, note, captured_at, updated_at)
      VALUES (${symbol}, ${price}, ${note}, ${safeCapturedAt}, NOW())
      ON CONFLICT (symbol) DO UPDATE SET
        price = EXCLUDED.price,
        note = EXCLUDED.note,
        captured_at = EXCLUDED.captured_at,
        updated_at = NOW()
    `;
  }

  return listManualMarketPrices();
}

export async function deleteManualMarketPrice(symbolInput: string): Promise<void> {
  if (!(await ensureManualMarketPricesTable()) || !prisma) return;
  const symbol = normalizeManualPriceSymbol(symbolInput);
  await prisma.$executeRaw`DELETE FROM manual_market_prices WHERE symbol = ${symbol}`;
}
