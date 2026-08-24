import "server-only";

import { unstable_cache } from "next/cache";
import { loadChanCandles } from "@/lib/market-data/chan-market-data";
import type { ChanCandle, ChanInstrument } from "@/types/chan-execution";
import { classifyDailyDirection } from "@/lib/forecasts/daily-direction-family";
import { aggregateContinuousFourHourCandles } from "@/lib/market-data/chan-market-data-core";
import {
  deriveChanStructuralLevels,
  formatStructuralPrice,
  type ChanLevelSource,
} from "@/lib/market-data/chan-structural-levels-core";

export const MOOX_INTRADAY_LEVEL_VERSION = "GAOSHAN_CHAN_4H_PRIMARY_V2_20260823";

export type IntradayTechnicalLevels = {
  key: string;
  support: string;
  resistance: string;
  invalidation: string;
  currentPrice: number | null;
  move24hPct: number | null;
  supportValue: number | null;
  resistanceValue: number | null;
  source: ChanLevelSource;
  sourceLabel: string;
  primaryTimeframe: "4H" | "1H" | null;
  structureBasis: "ACTIVE_CENTER" | "CONFIRMED_STRUCTURE" | "SWING_RANGE" | null;
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

/** Read-only chart resolver shared by authenticated member research surfaces. */
export function resolveIntradayTechnicalTarget(keyInput: string): ChanInstrument | null {
  const key = keyInput.startsWith("FOCUS:") ? keyInput.toUpperCase() : canonicalKey(keyInput);
  return TARGETS[key] ?? null;
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

export function formatIntradayPrice(value: number): string {
  return formatStructuralPrice(value);
}

export function deriveIntradayTechnicalLevels(
  key: string,
  candlesInput: ChanCandle[],
  capturedAt: string,
  timeframe: "4H" | "1H" = "4H"
): IntradayTechnicalLevels | null {
  const derived = deriveChanStructuralLevels({ candles: candlesInput, timeframe });
  if (!derived) return null;
  return {
    key,
    support: derived.support,
    resistance: derived.resistance,
    invalidation: "—",
    currentPrice: derived.currentPrice,
    move24hPct: derived.move24hPct,
    supportValue: derived.supportValue,
    resistanceValue: derived.resistanceValue,
    source: derived.source,
    sourceLabel: derived.sourceLabel,
    primaryTimeframe: derived.primaryTimeframe,
    structureBasis: derived.structureBasis,
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

function unavailableLevel(keyInput: string, error: string, label = "4H结构行情刷新中"): IntradayTechnicalLevels {
  const key = keyInput.startsWith("FOCUS:") ? keyInput.toUpperCase() : canonicalKey(keyInput);
  return {
    key, support: "—", resistance: "—", invalidation: "—", currentPrice: null, move24hPct: null,
    supportValue: null, resistanceValue: null, source: "UNAVAILABLE", sourceLabel: label,
    primaryTimeframe: null, structureBasis: null,
    capturedAt: new Date().toISOString(), error,
  };
}

/**
 * Load only successful structural snapshots into Next cache. 4H is the main
 * support/resistance map; 1H is a tactical fallback only when 4H cannot be built.
 * Transient network failures throw so
 * unstable_cache will not freeze an "UNAVAILABLE" result for the full five-minute TTL.
 */
async function loadRawSuccessful(keyInput: string): Promise<IntradayTechnicalLevels> {
  const key = keyInput.startsWith("FOCUS:") ? keyInput.toUpperCase() : canonicalKey(keyInput);
  const instrument = TARGETS[key] ?? null;
  const capturedAt = new Date().toISOString();
  if (!instrument) {
    if (key !== "FOCUS:ASTEROID") throw new Error("INSTRUMENT_UNAVAILABLE");
    const oneHour = await loadAsteroid1hCandles();
    const fourHour = aggregateContinuousFourHourCandles(oneHour, Date.now());
    const computed = deriveIntradayTechnicalLevels(key, fourHour, capturedAt, "4H")
      ?? deriveIntradayTechnicalLevels(key, oneHour, capturedAt, "1H");
    if (!computed) throw new Error("INSUFFICIENT_STRUCTURAL_BARS");
    return computed;
  }
  // Keep the sequential 1H fallback inside the member client's seven-second
  // deadline: 3.2s primary budget + 1.6s fallback budget.
  const fourHour = await loadChanCandles({ symbol: instrument.symbol, timeframe: "4H", instrument, timeoutMs: 3_200 });
  const primary = deriveIntradayTechnicalLevels(key, fourHour.candles, capturedAt, "4H");
  if (primary) return primary;

  const oneHour = await loadChanCandles({ symbol: instrument.symbol, timeframe: "1H", instrument, timeoutMs: 1_600 });
  const tacticalFallback = deriveIntradayTechnicalLevels(key, oneHour.candles, capturedAt, "1H");
  if (!tacticalFallback) throw new Error(fourHour.error ?? oneHour.error ?? "INSUFFICIENT_STRUCTURAL_BARS");
  return tacticalFallback;
}

const cachedLoad = unstable_cache(loadRawSuccessful, [MOOX_INTRADAY_LEVEL_VERSION], { revalidate: 300 });

export async function getIntradayTechnicalLevels(key: string, direction?: string | null): Promise<IntradayTechnicalLevels> {
  let level: IntradayTechnicalLevels;
  try {
    level = await cachedLoad(key);
  } catch (error) {
    return unavailableLevel(key, error instanceof Error ? error.message : "STRUCTURAL_LEVELS_UNAVAILABLE");
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
