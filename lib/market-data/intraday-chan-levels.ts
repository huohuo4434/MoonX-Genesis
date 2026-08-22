import "server-only";

import { unstable_cache } from "next/cache";
import { loadChanCandles } from "@/lib/market-data/chan-market-data";
import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import type { ChanCandle, ChanInstrument } from "@/types/chan-execution";
import { classifyDailyDirection } from "@/lib/forecasts/daily-direction-family";

export const MOOX_INTRADAY_LEVEL_VERSION = "INTRADAY_CHAN_1H_V1_20260819";

export type IntradayTechnicalLevels = {
  key: string;
  support: string;
  resistance: string;
  invalidation: string;
  currentPrice: number | null;
  move24hPct: number | null;
  supportValue: number | null;
  resistanceValue: number | null;
  source: "CHAN_1H" | "SWING_1H" | "FALLBACK" | "UNAVAILABLE";
  sourceLabel: string;
  capturedAt: string;
  error: string | null;
};

const YAHOO = (symbol: string, providerSymbol = symbol, market: ChanInstrument["market"] = "US_EQUITY"): ChanInstrument => ({
  symbol,
  label: symbol,
  provider: "YAHOO_CHART",
  providerSymbol,
  formalPlanSymbol: symbol,
  market,
});
const BITGET = (symbol: string): ChanInstrument => ({
  symbol,
  label: symbol,
  provider: "BITGET_PUBLIC",
  providerSymbol: `${symbol}USDT`,
  formalPlanSymbol: symbol,
  market: "CRYPTO",
});

const TARGETS: Readonly<Record<string, ChanInstrument | null>> = Object.freeze({
  BTC: BITGET("BTC"), ETH: BITGET("ETH"), SOL: BITGET("SOL"), HYPE: BITGET("HYPE"),
  SPX: YAHOO("SPX", "SPY", "INDEX_COMMODITY"),
  NDX: YAHOO("NDX", "QQQ", "INDEX_COMMODITY"),
  WTI: YAHOO("WTI", "CL=F", "INDEX_COMMODITY"),
  GOLD: YAHOO("GOLD", "GC=F", "INDEX_COMMODITY"),
  SILVER: YAHOO("SILVER", "SI=F", "INDEX_COMMODITY"),
  SHCOMP: YAHOO("SHCOMP", "000001.SS", "INDEX_COMMODITY"),
  HSTECH: YAHOO("HSTECH", "^HSTECH", "INDEX_COMMODITY"),

  "FOCUS:GANFENG-LITHIUM": YAHOO("002460.SZ", "002460.SZ"),
  "FOCUS:LIAN-TECH": YAHOO("300784.SZ", "300784.SZ"),
  "FOCUS:LEXIN-MEDICAL": YAHOO("300562.SZ", "300562.SZ"),
  "FOCUS:CXMT": YAHOO("688825.SS", "688825.SS"),
  "FOCUS:ASTEROID": null,
  "FOCUS:SANDISK": YAHOO("SNDK"),
  "FOCUS:NBIS": YAHOO("NBIS"),
  "FOCUS:MU": YAHOO("MU"),
  "FOCUS:HYPE": BITGET("HYPE"),
  "FOCUS:SOL": BITGET("SOL"),
  "FOCUS:ETH": BITGET("ETH"),
  "FOCUS:BTC": BITGET("BTC"),
  "FOCUS:GOOGL": YAHOO("GOOGL"),
  "FOCUS:MSFT": YAHOO("MSFT"),
  "FOCUS:TENCENT": YAHOO("0700.HK", "0700.HK"),
  "FOCUS:KINGSOFT-OFFICE": YAHOO("688111.SS", "688111.SS"),
  "FOCUS:TSLA": YAHOO("TSLA"),
  "FOCUS:LITE": YAHOO("LITE"),
  "FOCUS:SPCX": YAHOO("SPCX"),
  "FOCUS:INTEL": YAHOO("INTC"),
});

function canonicalKey(input: string): string {
  const key = input.trim().toUpperCase();
  if (["GLD", "XAU", "GC=F"].includes(key)) return "GOLD";
  if (["SI", "XAG", "SI=F"].includes(key)) return "SILVER";
  if (["CL", "CL=F"].includes(key)) return "WTI";
  if (["SSEC", "000001.SS", "SSE"].includes(key)) return "SHCOMP";
  return key;
}

export function intradayFocusKey(assetId: string): string {
  return `FOCUS:${assetId.trim().toUpperCase()}`;
}

export function hasIntradayTechnicalTarget(keyInput: string): boolean {
  const key = keyInput.startsWith("FOCUS:") ? keyInput.toUpperCase() : canonicalKey(keyInput);
  return key === "FOCUS:ASTEROID" || Object.prototype.hasOwnProperty.call(TARGETS, key) && TARGETS[key] !== null;
}

export function listIntradayTechnicalTargetKeys(): string[] {
  return Object.keys(TARGETS).filter((key) => key === "FOCUS:ASTEROID" || TARGETS[key] !== null);
}

function validCandles(rows: ChanCandle[]): ChanCandle[] {
  return rows
    .filter((row) => Number.isFinite(row.timestamp) && row.open > 0 && row.high >= row.low && row.low > 0 && row.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-72);
}

function trueRange(row: ChanCandle, previous?: ChanCandle): number {
  if (!previous) return row.high - row.low;
  return Math.max(row.high - row.low, Math.abs(row.high - previous.close), Math.abs(row.low - previous.close));
}

function atr(rows: ChanCandle[]): number {
  const sample = rows.slice(-14);
  if (!sample.length) return 0;
  return sample.reduce((sum, row, index) => sum + trueRange(row, index ? sample[index - 1] : undefined), 0) / sample.length;
}

function nearestBelow(values: number[], price: number): number | null {
  return values.filter((value) => Number.isFinite(value) && value > 0 && value < price).sort((a, b) => b - a)[0] ?? null;
}
function nearestAbove(values: number[], price: number): number | null {
  return values.filter((value) => Number.isFinite(value) && value > price).sort((a, b) => a - b)[0] ?? null;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function decimals(price: number): number {
  if (price >= 10_000) return 0;
  if (price >= 1_000) return 1;
  if (price >= 1) return 2;
  if (price >= 0.01) return 4;
  return 6;
}

export function formatIntradayPrice(value: number): string {
  const places = decimals(Math.abs(value));
  return value.toLocaleString("en-US", { minimumFractionDigits: places, maximumFractionDigits: places });
}

function formatZone(base: number, width: number): string {
  const low = base - width;
  const high = base + width;
  const a = formatIntradayPrice(low);
  const b = formatIntradayPrice(high);
  return a === b ? a : `${a}—${b}`;
}

export function deriveIntradayTechnicalLevels(key: string, candlesInput: ChanCandle[], capturedAt: string): IntradayTechnicalLevels | null {
  const candles = validCandles(candlesInput);
  const last = candles.at(-1);
  if (!last || candles.length < 12) return null;
  const price = last.close;
  const reference24h = candles.at(Math.max(0, candles.length - 25))?.close ?? candles[0]?.close ?? price;
  const move24hPct = reference24h > 0 ? ((price - reference24h) / reference24h) * 100 : null;
  const structure = analyzeChanStructure(candles);
  const recent = candles.slice(-36);
  const volatility = Math.max(atr(candles), price * 0.0015);

  const belowCandidates: number[] = [];
  const aboveCandidates: number[] = [];
  for (const zone of structure.zones.slice(-4)) {
    if (zone.low < price) belowCandidates.push(zone.low, Math.min(zone.high, price - Number.EPSILON));
    if (zone.high > price) aboveCandidates.push(zone.high, Math.max(zone.low, price + Number.EPSILON));
  }
  for (const fractal of structure.fractals.slice(-10)) {
    if (fractal.kind === "BOTTOM") belowCandidates.push(fractal.price);
    else aboveCandidates.push(fractal.price);
  }
  belowCandidates.push(...recent.map((row) => row.low));
  aboveCandidates.push(...recent.map((row) => row.high));

  const supportValue = nearestBelow(belowCandidates, price) ?? price - volatility * 0.75;
  const resistanceValue = nearestAbove(aboveCandidates, price) ?? price + volatility * 0.75;
  // Tight 1H tactical zones: half-width is capped at 0.25% of price and 12% of 1H ATR.
  const width = clamp(volatility * 0.12, price * 0.0004, price * 0.0025);
  const source = structure.sufficient && structure.zones.length ? "CHAN_1H" as const : "SWING_1H" as const;
  return {
    key,
    support: formatZone(supportValue, width),
    resistance: formatZone(resistanceValue, width),
    invalidation: "—",
    currentPrice: price,
    move24hPct,
    supportValue,
    resistanceValue,
    source,
    sourceLabel: source === "CHAN_1H" ? "缠论1H近端结构" : "1H近端摆动",
    capturedAt,
    error: null,
  };
}

const ASTEROID_CONTRACT = "0xf280b16ef293d8e534e370794ef26bf312694126";

type DexScreenerPair = {
  chainId?: string;
  pairAddress?: string;
  liquidity?: { usd?: number };
  baseToken?: { address?: string };
};
type DexScreenerPayload = DexScreenerPair[] | { pairs?: DexScreenerPair[] };
type GeckoTerminalOhlcvPayload = {
  data?: {
    attributes?: {
      ohlcv_list?: Array<[number, number, number, number, number, number]>;
    };
  };
};

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number, headers: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", headers, cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

function dexPairs(payload: DexScreenerPayload): DexScreenerPair[] {
  return Array.isArray(payload) ? payload : Array.isArray(payload.pairs) ? payload.pairs : [];
}

async function loadAsteroid1hCandles(): Promise<ChanCandle[]> {
  const dex = await fetchJsonWithTimeout<DexScreenerPayload>(
    `https://api.dexscreener.com/latest/dex/tokens/${ASTEROID_CONTRACT}`,
    4_200,
    { Accept: "application/json", "User-Agent": "MOOX-Intraday-Levels/1.0" },
  );
  const contract = ASTEROID_CONTRACT.toLowerCase();
  const selected = dexPairs(dex)
    .filter((row) => row.chainId?.toLowerCase() === "ethereum" && row.baseToken?.address?.toLowerCase() === contract && Boolean(row.pairAddress))
    .sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0))[0];
  if (!selected?.pairAddress) throw new Error("ASTEROID_POOL_UNAVAILABLE");

  const gecko = await fetchJsonWithTimeout<GeckoTerminalOhlcvPayload>(
    `https://api.geckoterminal.com/api/v2/networks/eth/pools/${selected.pairAddress}/ohlcv/hour?aggregate=1&limit=72&currency=usd&token=base`,
    4_200,
    { Accept: "application/json;version=20230203", "User-Agent": "MOOX-Intraday-Levels/1.0" },
  );
  const rows = gecko.data?.attributes?.ohlcv_list ?? [];
  return rows.map((row) => ({
    timestamp: Number(row[0]) * 1000,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}

function unavailableLevel(keyInput: string, error: string, label = "1H行情刷新中"): IntradayTechnicalLevels {
  const key = keyInput.startsWith("FOCUS:") ? keyInput.toUpperCase() : canonicalKey(keyInput);
  return {
    key, support: "—", resistance: "—", invalidation: "—", currentPrice: null, move24hPct: null,
    supportValue: null, resistanceValue: null, source: "UNAVAILABLE", sourceLabel: label,
    capturedAt: new Date().toISOString(), error,
  };
}

/**
 * Load only successful 1H snapshots into Next cache. Transient network failures throw so
 * unstable_cache will not freeze an "UNAVAILABLE" result for the full five-minute TTL.
 */
async function loadRawSuccessful(keyInput: string): Promise<IntradayTechnicalLevels> {
  const key = keyInput.startsWith("FOCUS:") ? keyInput.toUpperCase() : canonicalKey(keyInput);
  const instrument = TARGETS[key] ?? null;
  const capturedAt = new Date().toISOString();
  if (!instrument) {
    if (key !== "FOCUS:ASTEROID") throw new Error("INSTRUMENT_UNAVAILABLE");
    const computed = deriveIntradayTechnicalLevels(key, await loadAsteroid1hCandles(), capturedAt);
    if (!computed) throw new Error("INSUFFICIENT_1H_BARS");
    return computed;
  }
  const loaded = await loadChanCandles({ symbol: instrument.symbol, timeframe: "1H", instrument, timeoutMs: 4_500 });
  const computed = deriveIntradayTechnicalLevels(key, loaded.candles, capturedAt);
  if (!computed) throw new Error(loaded.error ?? "INSUFFICIENT_1H_BARS");
  return computed;
}

const cachedLoad = unstable_cache(loadRawSuccessful, [MOOX_INTRADAY_LEVEL_VERSION], { revalidate: 300 });

export async function getIntradayTechnicalLevels(key: string, direction?: string | null): Promise<IntradayTechnicalLevels> {
  let level: IntradayTechnicalLevels;
  try {
    level = await cachedLoad(key);
  } catch (error) {
    return unavailableLevel(key, error instanceof Error ? error.message : "INTRADAY_1H_UNAVAILABLE");
  }
  const family = classifyDailyDirection(direction);
  const invalidation = family === "UP"
    ? `跌破 ${level.support}`
    : family === "DOWN"
      ? `站上 ${level.resistance}`
      : `上破 ${level.resistance} / 下破 ${level.support}`;
  return { ...level, invalidation };
}

export async function getIntradayTechnicalLevelMap(keys: readonly string[]): Promise<Record<string, IntradayTechnicalLevels>> {
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  const rows = await Promise.all(unique.map(async (key) => [key, await getIntradayTechnicalLevels(key)] as const));
  return Object.fromEntries(rows);
}
