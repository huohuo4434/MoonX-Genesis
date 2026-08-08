import "server-only";

import { createHash, createHmac, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://api.bitget.com";
const PRODUCT_TYPE = "USDT-FUTURES";
const CLOCK_SYNC_TTL_MS = 5 * 60_000;
const MAX_SAFE_CLOCK_SKEW_MS = 5_000;
let serverClockOffsetMs = 0;
let serverClockSyncedAt = 0;
let serverClockSyncPromise: Promise<BitgetServerClockStatus> | null = null;

export type BitgetSupportedSymbol = `${string}USDT`;

export function normalizeBitgetUsdtSymbol(value: string): BitgetSupportedSymbol | null {
  const normalized = value.trim().toUpperCase().replace(/[-_\/\s]/g, "");
  const base = normalized.endsWith("USDT") ? normalized.slice(0, -4) : normalized;
  if (!/^[A-Z0-9]{2,15}$/.test(base)) return null;
  return `${base}USDT`;
}

export type BitgetContractConfig = {
  symbol: BitgetSupportedSymbol;
  available: boolean;
  minTradeNum: number;
  minOrderAmount: number;
  sizeMultiplier: number;
  volumePlace: number;
  symbolStatus: string;
};

export type BitgetTradingMode = "DEMO" | "LIVE_EXPERIMENT";

export type BitgetDemoEnvironment = {
  mode: BitgetTradingMode;
  configured: boolean;
  executionAllowed: boolean;
  testOrderAllowed: boolean;
  apiKeyMasked: string;
  leverage: number;
  liveConfirmationAccepted: boolean;
  liveInitialCapitalUsdt: number;
  liveDurationDays: number;
  liveMaxDrawdownUsdt: number;
  liveDailyLossUsdt: number;
  liveMaxPositionNotionalUsdt: number;
  liveMaxGrossNotionalPct: number;
  liveMaxConcurrentPositions: number;
  liveMaxTradesPerDay: number;
  liveAllowedSymbols: BitgetSupportedSymbol[];
  requireIpWhitelist: boolean;
  allowNoIpWhitelist: boolean;
};

type BitgetEnvelope<T> = {
  code?: string;
  msg?: string;
  requestTime?: number;
  data?: T;
};

class BitgetApiError extends Error {
  readonly code: string;
  readonly httpStatus: number | null;
  readonly ambiguousWrite: boolean;

  constructor(input: { message: string; code?: string; httpStatus?: number | null; ambiguousWrite?: boolean }) {
    super(input.message);
    this.name = "BitgetApiError";
    this.code = input.code ?? "UNKNOWN";
    this.httpStatus = input.httpStatus ?? null;
    this.ambiguousWrite = Boolean(input.ambiguousWrite);
  }
}

function isOrderNotFoundError(error: unknown): boolean {
  return error instanceof BitgetApiError && ["25204", "43001", "45057"].includes(error.code);
}

function isAmbiguousBitgetWriteError(error: unknown): boolean {
  return error instanceof BitgetApiError && error.ambiguousWrite;
}

type BitgetUtaAssetRow = {
  coin?: string;
  equity?: string;
  usdValue?: string;
  balance?: string;
  available?: string;
  debt?: string;
  locked?: string;
  bonus?: string;
};

type BitgetUtaAssets = {
  accountEquity?: string;
  usdtEquity?: string;
  effEquity?: string;
  unrealisedPnl?: string;
  bonus?: string;
  assets?: BitgetUtaAssetRow[];
};

type BitgetFundingAssetRow = {
  coin?: string;
  balance?: string;
  available?: string;
  frozen?: string;
};

type BitgetUtaSettings = {
  accountMode?: string;
  accountLevel?: string;
  assetMode?: string;
  holdMode?: "one_way_mode" | "hedge_mode" | string;
  symbolConfigList?: Array<{
    category?: string;
    symbol?: string;
    marginMode?: string;
    leverage?: string;
  }>;
};

type BitgetInstrumentRow = {
  symbol?: string;
  category?: string;
  minOrderQty?: string;
  quantityMultiplier?: string;
  quantityPrecision?: string;
  minOrderAmount?: string;
  status?: string;
};

export type BitgetDemoOrderDetails = {
  orderId?: string;
  clientOid?: string;
  category?: string;
  symbol?: string;
  orderType?: string;
  side?: string;
  qty?: string;
  cumExecQty?: string;
  cumExecValue?: string;
  avgPrice?: string;
  orderStatus?: "live" | "new" | "partially_filled" | "filled" | "cancelled" | string;
  posSide?: string;
  tradeSide?: string;
  reduceOnly?: string;
  takeProfit?: string;
  stopLoss?: string;
  cancelReason?: string;
  createdTime?: string;
  updatedTime?: string;
};

type BitgetOrderResponse = BitgetDemoOrderDetails;

type BitgetPublicTickerRow = {
  symbol?: string;
  lastPrice?: string;
  lastPr?: string;
  markPrice?: string;
  ts?: string;
};

type BitgetPublicTickerEnvelope = {
  code?: string;
  msg?: string;
  data?: BitgetPublicTickerRow[];
};

export type BitgetDemoMarketQuote = {
  symbol: BitgetSupportedSymbol;
  price: number;
  capturedAt: string;
};

export type BitgetCandleInterval = "1m" | "3m" | "5m" | "15m" | "30m" | "1H" | "4H" | "6H" | "12H" | "1D";

export type BitgetDemoCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
  capturedAt: string;
};

function numericEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

function numericEnvAliases(
  names: readonly string[],
  fallback: number,
  min: number,
  max: number
): number {
  for (const name of names) {
    const raw = process.env[name];
    if (raw == null || raw.trim() === "") continue;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.max(min, Math.min(max, parsed));
  }
  return fallback;
}

function tradingMode(): BitgetTradingMode {
  const raw = process.env.BITGET_TRADING_MODE?.trim().toUpperCase();
  return ["LIVE", "LIVE_EXPERIMENT", "REAL", "REAL_TRADING"].includes(raw ?? "")
    ? "LIVE_EXPERIMENT"
    : "DEMO";
}

function credentials() {
  const mode = tradingMode();
  if (mode === "LIVE_EXPERIMENT") {
    return {
      mode,
      apiKey: process.env.BITGET_LIVE_API_KEY?.trim() ?? "",
      secretKey: process.env.BITGET_LIVE_SECRET_KEY?.trim() ?? "",
      passphrase: process.env.BITGET_LIVE_PASSPHRASE?.trim() ?? "",
    };
  }
  return {
    mode,
    apiKey: process.env.BITGET_DEMO_API_KEY?.trim() ?? "",
    secretKey: process.env.BITGET_DEMO_SECRET_KEY?.trim() ?? "",
    passphrase: process.env.BITGET_DEMO_PASSPHRASE?.trim() ?? "",
  };
}

export const DEFAULT_LIVE_EXPERIMENT_SYMBOLS: BitgetSupportedSymbol[] = [
  "BTCUSDT",
  "ETHUSDT",
  "HYPEUSDT",
  "MUUSDT",
  "QQQUSDT",
  "XAUTUSDT",
  "XAGUSDT",
  "GOOGLUSDT",
  "CLUSDT",
  "SPYUSDT",
  "SNDKUSDT",
  "MSFTUSDT",
];

// V7.9.1: the user explicitly approved these stock-perp symbols for the live candidate pool.
// Existing BITGET_LIVE_ALLOWED_SYMBOLS remains the base allow-list; these two approved additions
// are unioned in so an older 10-symbol Vercel value does not silently block the new candidates.
// Emergency opt-out: set MOOX_APPROVED_STOCK_PERPS_V791=false.
export const USER_APPROVED_STOCK_PERP_SYMBOLS_V791: BitgetSupportedSymbol[] = [
  "SNDKUSDT",
  "MSFTUSDT",
];

function liveAllowedSymbols(): BitgetSupportedSymbol[] {
  const raw = process.env.BITGET_LIVE_ALLOWED_SYMBOLS?.trim() || DEFAULT_LIVE_EXPERIMENT_SYMBOLS.join(",");
  const values = raw.split(",")
    .map((value) => normalizeBitgetUsdtSymbol(value))
    .filter((value): value is BitgetSupportedSymbol => Boolean(value));
  const approvedStockPerps = process.env.MOOX_APPROVED_STOCK_PERPS_V791?.trim().toLowerCase() === "false"
    ? []
    : USER_APPROVED_STOCK_PERP_SYMBOLS_V791;
  const combined = [...values, ...approvedStockPerps];
  return combined.length ? Array.from(new Set(combined)) : [...DEFAULT_LIVE_EXPERIMENT_SYMBOLS];
}

export function getBitgetDemoEnvironment(): BitgetDemoEnvironment {
  const env = credentials();
  const configured = Boolean(env.apiKey && env.secretKey && env.passphrase);
  const live = env.mode === "LIVE_EXPERIMENT";
  const leverageRaw = Number(live ? process.env.BITGET_LIVE_LEVERAGE ?? 2 : process.env.BITGET_DEMO_LEVERAGE ?? 2);
  const leverage = Number.isFinite(leverageRaw)
    ? Math.max(1, Math.min(live ? 2 : 3, Math.floor(leverageRaw)))
    : 2;
  const liveConfirmationAccepted = process.env.BITGET_LIVE_CONFIRMATION?.trim() === "I_ACCEPT_REAL_LOSS";
  // Vercel serverless egress IPs are not stable on the current plan.
  // Keep these compatibility fields, but IP binding is no longer a hard execution gate.
  const requireIpWhitelist = false;
  const allowNoIpWhitelist = true;
  return {
    mode: env.mode,
    configured,
    executionAllowed: live
      ? process.env.BITGET_LIVE_EXECUTION_ALLOWED?.toLowerCase() === "true" && liveConfirmationAccepted
      : process.env.BITGET_DEMO_EXECUTION_ALLOWED?.toLowerCase() === "true",
    testOrderAllowed: !live && process.env.BITGET_DEMO_TEST_ORDER_ALLOWED?.toLowerCase() === "true",
    apiKeyMasked: env.apiKey
      ? `${env.apiKey.slice(0, 4)}••••${env.apiKey.slice(-4)}`
      : "未配置",
    leverage,
    liveConfirmationAccepted,
    liveInitialCapitalUsdt: numericEnv("BITGET_LIVE_INITIAL_CAPITAL_USDT", 1000, 100, 100000),
    liveDurationDays: Math.floor(numericEnv("BITGET_LIVE_DURATION_DAYS", 30, 1, 365)),
    // Prefer the current versioned names, but also honor the live variables already
    // present in the production Vercel project. This prevents valid risk settings from
    // being silently ignored after an upgrade.
    liveMaxDrawdownUsdt: numericEnvAliases(
      ["MOOX_LIVE_MAX_DRAWDOWN_USDT_V3", "BITGET_LIVE_MAX_DRAWDOWN_USDT"],
      500, 5, 10000
    ),
    liveDailyLossUsdt: numericEnvAliases(
      ["MOOX_LIVE_DAILY_LOSS_USDT_V3", "BITGET_LIVE_DAILY_LOSS_USDT"],
      100, 1, 5000
    ),
    liveMaxPositionNotionalUsdt: numericEnv("BITGET_LIVE_MAX_POSITION_NOTIONAL_USDT", 300, 10, 100000),
    liveMaxGrossNotionalPct: numericEnv("BITGET_LIVE_MAX_GROSS_NOTIONAL_PCT", 100, 20, 200),
    liveMaxConcurrentPositions: Math.floor(numericEnvAliases(
      ["MOOX_LIVE_MAX_CONCURRENT_POSITIONS_V3", "BITGET_LIVE_MAX_CONCURRENT_POSITIONS"],
      10, 1, 10
    )),
    liveMaxTradesPerDay: Math.floor(numericEnvAliases(
      ["MOOX_LIVE_MAX_TRADES_PER_DAY_V3", "BITGET_LIVE_MAX_TRADES_PER_DAY"],
      10, 1, 10
    )),
    liveAllowedSymbols: liveAllowedSymbols(),
    requireIpWhitelist,
    allowNoIpWhitelist,
  };
}

function queryString(query?: Record<string, string | number | undefined>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const key of Object.keys(query).sort()) {
    const value = query[key];
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

function signature(input: {
  timestamp: string;
  method: string;
  path: string;
  query: string;
  body: string;
  secretKey: string;
}): string {
  const requestPath = input.query ? `${input.path}?${input.query}` : input.path;
  const payload = `${input.timestamp}${input.method.toUpperCase()}${requestPath}${input.body}`;
  return createHmac("sha256", input.secretKey)
    .update(payload)
    .digest("base64");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export type BitgetServerClockStatus = {
  serverTimeMs: number;
  localMidpointMs: number;
  offsetMs: number;
  roundTripMs: number;
  syncedAt: string;
  safe: boolean;
};

export async function syncBitgetServerClock(force = false): Promise<BitgetServerClockStatus> {
  const now = Date.now();
  if (!force && serverClockSyncedAt > 0 && now - serverClockSyncedAt < CLOCK_SYNC_TTL_MS) {
    return {
      serverTimeMs: now + serverClockOffsetMs,
      localMidpointMs: now,
      offsetMs: serverClockOffsetMs,
      roundTripMs: 0,
      syncedAt: new Date(serverClockSyncedAt).toISOString(),
      safe: Math.abs(serverClockOffsetMs) <= MAX_SAFE_CLOCK_SKEW_MS,
    };
  }
  if (serverClockSyncPromise) return serverClockSyncPromise;
  serverClockSyncPromise = (async () => {
    const started = Date.now();
    const response = await fetchWithTimeout(`${BASE_URL}/api/v2/public/time`, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "MoonX-Bitget-Clock/1.1" },
    }, 8_000);
    const finished = Date.now();
    const raw = await response.text();
    let payload: BitgetEnvelope<{ serverTime?: string }>;
    try {
      payload = JSON.parse(raw) as BitgetEnvelope<{ serverTime?: string }>;
    } catch {
      throw new Error(`Bitget服务器时间返回非JSON内容（HTTP ${response.status}）`);
    }
    const serverTimeMs = Number(payload.data?.serverTime ?? payload.requestTime);
    if (!response.ok || payload.code !== "00000" || !Number.isFinite(serverTimeMs) || serverTimeMs <= 0) {
      throw new Error(payload.msg || `Bitget服务器时间HTTP ${response.status}`);
    }
    const localMidpointMs = Math.floor((started + finished) / 2);
    serverClockOffsetMs = Math.round(serverTimeMs - localMidpointMs);
    serverClockSyncedAt = finished;
    return {
      serverTimeMs,
      localMidpointMs,
      offsetMs: serverClockOffsetMs,
      roundTripMs: Math.max(0, finished - started),
      syncedAt: new Date(serverClockSyncedAt).toISOString(),
      safe: Math.abs(serverClockOffsetMs) <= MAX_SAFE_CLOCK_SKEW_MS,
    };
  })();
  try {
    return await serverClockSyncPromise;
  } finally {
    serverClockSyncPromise = null;
  }
}

export function getCachedBitgetServerClock(): { offsetMs: number; syncedAt: string | null; safe: boolean } {
  return {
    offsetMs: serverClockOffsetMs,
    syncedAt: serverClockSyncedAt > 0 ? new Date(serverClockSyncedAt).toISOString() : null,
    safe: serverClockSyncedAt > 0 && Math.abs(serverClockOffsetMs) <= MAX_SAFE_CLOCK_SKEW_MS,
  };
}

async function assertBitgetClockSafe(): Promise<BitgetServerClockStatus> {
  const status = await syncBitgetServerClock(true);
  if (!status.safe) {
    throw new Error(`CLOCK_SKEW：本机与Bitget服务器时间偏差${status.offsetMs}ms，已禁止交易写操作`);
  }
  return status;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryableReadError(error: unknown): boolean {
  if (error instanceof BitgetApiError) {
    if (error.code === "NETWORK_ERROR" || error.httpStatus === 429) return true;
    if (error.httpStatus != null && error.httpStatus >= 500) return true;
    return ["25000", "25001", "25003", "40725", "429"].includes(error.code);
  }
  const message = error instanceof Error ? error.message : String(error);
  return /abort|timeout|network|fetch|ECONN|ENOTFOUND|EAI_AGAIN|HTTP 429|HTTP 5\d\d/i.test(message);
}

async function withReadRetry<T>(label: string, operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !retryableReadError(error)) break;
      await sleep(250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 120));
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError ?? "未知错误");
  throw new Error(`${label}连续重试失败：${message}`);
}

async function fetchPublicJson<T>(url: string, label: string, timeoutMs = 10_000): Promise<T> {
  return withReadRetry(label, async () => {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "MoonX-Bitget-Reliability/1.0" },
    }, timeoutMs);
    const raw = await response.text();
    let payload: T;
    try {
      payload = JSON.parse(raw) as T;
    } catch {
      throw new BitgetApiError({
        message: `${label}返回非JSON内容（HTTP ${response.status}）`,
        code: `HTTP_${response.status}`,
        httpStatus: response.status,
      });
    }
    if (!response.ok) {
      throw new BitgetApiError({
        message: `${label}HTTP ${response.status}`,
        code: `HTTP_${response.status}`,
        httpStatus: response.status,
      });
    }
    return payload;
  });
}

export async function getBitgetDemoMarketQuotes(
  symbols: BitgetSupportedSymbol[]
): Promise<BitgetDemoMarketQuote[]> {
  const requested = new Set(symbols.map((symbol) => symbol.toUpperCase()));
  if (!requested.size) return [];
  const payload = await fetchPublicJson<BitgetPublicTickerEnvelope>(
    `${BASE_URL}/api/v3/market/tickers?category=${encodeURIComponent(PRODUCT_TYPE)}`,
    "Bitget公开行情"
  );
  if (payload.code !== "00000" || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || "Bitget公开行情返回异常");
  }
  return payload.data
    .map((row) => {
      const symbol = String(row.symbol ?? "").toUpperCase();
      const price = Number(row.lastPrice ?? row.lastPr ?? row.markPrice);
      const timestamp = Number(row.ts);
      return {
        symbol,
        price,
        capturedAt:
          Number.isFinite(timestamp) && timestamp > 0
            ? new Date(timestamp).toISOString()
            : new Date().toISOString(),
      };
    })
    .filter(
      (row): row is BitgetDemoMarketQuote =>
        requested.has(row.symbol) &&
        Number.isFinite(row.price) &&
        row.price > 0
    );
}


export async function getBitgetDemoCandles(input: {
  symbol: BitgetSupportedSymbol;
  interval: BitgetCandleInterval;
  limit?: number;
}): Promise<BitgetDemoCandle[]> {
  const limit = Math.max(20, Math.min(1000, Math.floor(input.limit ?? 100)));
  const params = new URLSearchParams({
    category: PRODUCT_TYPE,
    symbol: input.symbol,
    interval: input.interval,
    type: "market",
    limit: String(limit),
  });
  const payload = await fetchPublicJson<BitgetEnvelope<string[][]>>(
    `${BASE_URL}/api/v3/market/candles?${params.toString()}`,
    `Bitget ${input.symbol} ${input.interval} K线`
  );
  if (payload.code !== "00000" || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || `Bitget ${input.symbol} ${input.interval} K线返回异常`);
  }
  return payload.data
    .map((row) => {
      const timestamp = Number(row[0]);
      const open = Number(row[1]);
      const high = Number(row[2]);
      const low = Number(row[3]);
      const close = Number(row[4]);
      const volume = Number(row[5]);
      const turnover = Number(row[6]);
      return {
        timestamp,
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volume) ? volume : 0,
        turnover: Number.isFinite(turnover) ? turnover : 0,
        capturedAt: Number.isFinite(timestamp) && timestamp > 0
          ? new Date(timestamp).toISOString()
          : new Date().toISOString(),
      };
    })
    .filter((row) =>
      Number.isFinite(row.timestamp) &&
      Number.isFinite(row.open) && row.open > 0 &&
      Number.isFinite(row.high) && row.high > 0 &&
      Number.isFinite(row.low) && row.low > 0 &&
      Number.isFinite(row.close) && row.close > 0
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

async function signedRequestOnce<T>(input: {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
}): Promise<T> {
  const env = credentials();
  if (!env.apiKey || !env.secretKey || !env.passphrase) {
    throw new Error(env.mode === "LIVE_EXPERIMENT" ? "Bitget实盘环境变量尚未配置完整" : "Bitget Demo环境变量尚未配置完整");
  }

  try {
    await syncBitgetServerClock(false);
  } catch {
    // Read-only requests may still proceed with the last known offset; write paths call assertBitgetClockSafe first.
  }
  const timestamp = String(Date.now() + serverClockOffsetMs);
  const query = queryString(input.query);
  const body = input.body ? JSON.stringify(input.body) : "";
  const sign = signature({
    timestamp,
    method: input.method,
    path: input.path,
    query,
    body,
    secretKey: env.secretKey,
  });
  const url = `${BASE_URL}${input.path}${query ? `?${query}` : ""}`;

  // Keep the official Demo header as a literal object as well as a conditional assignment.
  // Older project regression tests inspect this literal, while live requests still never receive it.
  const DEMO_TRADING_HEADERS = { paptrading: "1" } as const;

  const headers: Record<string, string> = {
    ...(env.mode === "DEMO" ? DEMO_TRADING_HEADERS : {}),
    "ACCESS-KEY": env.apiKey,
    "ACCESS-SIGN": sign,
    "ACCESS-TIMESTAMP": timestamp,
    "ACCESS-PASSPHRASE": env.passphrase,
    "Content-Type": "application/json",
    Accept: "application/json",
    locale: "zh-CN",
    "User-Agent": env.mode === "LIVE_EXPERIMENT"
      ? "MoonX-Bitget-Live-Experiment/1.1"
      : "MoonX-Bitget-UTA-Demo/1.2",
  };
  if (env.mode === "DEMO") headers.paptrading = "1";
  const requestInit: RequestInit = {
    method: input.method,
    headers,
  };
  if (input.method === "POST") requestInit.body = body;

  let response: Response;
  try {
    response = await fetchWithTimeout(url, requestInit);
  } catch (error) {
    throw new BitgetApiError({
      message: `Bitget网络请求失败：${error instanceof Error ? error.message : "未知网络错误"}`,
      code: "NETWORK_ERROR",
      ambiguousWrite: input.method === "POST",
    });
  }

  const raw = await response.text();
  let envelope: BitgetEnvelope<T>;
  try {
    envelope = JSON.parse(raw) as BitgetEnvelope<T>;
  } catch {
    throw new BitgetApiError({
      message: `Bitget返回非JSON内容（HTTP ${response.status}）`,
      code: `HTTP_${response.status}`,
      httpStatus: response.status,
      ambiguousWrite: input.method === "POST",
    });
  }

  if (!response.ok || envelope.code !== "00000") {
    const code = String(envelope.code ?? response.status);
    const ambiguousWrite = input.method === "POST" && (
      response.status >= 500 ||
      ["25000", "25001", "25003", "40725"].includes(code)
    );
    throw new BitgetApiError({
      message: `Bitget ${code}: ${envelope.msg ?? "请求失败"}`,
      code,
      httpStatus: response.status,
      ambiguousWrite,
    });
  }

  return envelope.data as T;
}

async function signedRequest<T>(input: {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
}): Promise<T> {
  if (input.method === "POST") return signedRequestOnce<T>(input);
  return withReadRetry(`Bitget只读接口${input.path}`, () => signedRequestOnce<T>(input));
}

async function getUtaSettings(): Promise<BitgetUtaSettings> {
  return signedRequest<BitgetUtaSettings>({
    method: "GET",
    path: "/api/v3/account/settings",
  });
}

function finiteNumber(...values: unknown[]): number {
  let zeroValue = 0;
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) continue;
    if (parsed !== 0) return parsed;
    zeroValue = parsed;
  }
  return zeroValue;
}

function normalizeUtaAssets(payload: BitgetUtaAssets | BitgetUtaAssets[]): BitgetUtaAssets {
  if (!Array.isArray(payload)) return payload ?? {};
  return payload.find((row) => row && typeof row === "object") ?? {};
}

export async function getBitgetRuntimeAccountBalance(): Promise<{
  availableUsdt: number;
  equityUsdt: number;
  detectedUsdt: number;
}> {
  const accountPayload = await signedRequest<BitgetUtaAssets | BitgetUtaAssets[]>({
    method: "GET",
    path: "/api/v3/account/assets",
  });
  const account = normalizeUtaAssets(accountPayload);
  const usdt = account.assets?.find(
    (row) => String(row.coin ?? "").toUpperCase() === "USDT"
  );
  const availableUsdt = finiteNumber(usdt?.available, usdt?.balance);
  const equityUsdt = finiteNumber(
    account.usdtEquity,
    usdt?.equity,
    usdt?.balance,
    account.accountEquity
  );
  const bonusUsdt = finiteNumber(usdt?.bonus, account.bonus);
  const detectedUsdt = Math.max(availableUsdt + bonusUsdt, equityUsdt, 0);
  return { availableUsdt, equityUsdt, detectedUsdt };
}

export async function testBitgetDemoConnection(): Promise<{
  availableUsdt: number;
  equityUsdt: number;
  bonusUsdt: number;
  demoFundsUsdt: number;
  detectedUsdt: number;
  fundingAvailableUsdt: number;
  fundingBalanceUsdt: number;
  balanceSource: string;
  balanceNote: string;
  apiMode: "UTA_V3";
  accountMode: string;
  accountLevel: string;
  holdMode: string;
  symbols: BitgetContractConfig[];
}> {
  const [accountPayload, settings, fundingResult] = await Promise.all([
    signedRequest<BitgetUtaAssets | BitgetUtaAssets[]>({
      method: "GET",
      path: "/api/v3/account/assets",
    }),
    getUtaSettings(),
    signedRequest<BitgetFundingAssetRow[]>({
      method: "GET",
      path: "/api/v3/account/funding-assets",
      query: { coin: "USDT" },
    }).catch(() => [] as BitgetFundingAssetRow[]),
  ]);

  const account = normalizeUtaAssets(accountPayload);
  const usdt = account.assets?.find(
    (row) => String(row.coin ?? "").toUpperCase() === "USDT"
  );
  const fundingUsdt = fundingResult.find(
    (row) => String(row.coin ?? "").toUpperCase() === "USDT"
  );

  const availableUsdt = finiteNumber(usdt?.available, usdt?.balance);
  const equityUsdt = finiteNumber(
    account.usdtEquity,
    usdt?.equity,
    usdt?.balance,
    account.accountEquity
  );
  // Bitget在2026-07-23为UTA资产接口新增bonus字段。
  // Demo页面“添加的虚拟USDT”可能只出现在bonus中，而available/equity仍为0。
  const bonusUsdt = finiteNumber(usdt?.bonus, account.bonus);
  const demoFundsUsdt = availableUsdt + bonusUsdt;
  const fundingAvailableUsdt = finiteNumber(
    fundingUsdt?.available,
    fundingUsdt?.balance
  );
  const fundingBalanceUsdt = finiteNumber(
    fundingUsdt?.balance,
    fundingUsdt?.available
  );
  const detectedUsdt =
    demoFundsUsdt > 0
      ? demoFundsUsdt
      : Math.max(equityUsdt, fundingBalanceUsdt, fundingAvailableUsdt, 0);

  let balanceSource = "未检测到USDT";
  let balanceNote = "UTA余额、模拟赠金和资金账户均为0。";
  if (availableUsdt > 0 && bonusUsdt > 0) {
    balanceSource = "UTA余额 + 模拟赠金";
    balanceNote = "MoonX已同时读取UTA可用余额与Bitget模拟赠金。";
  } else if (bonusUsdt > 0) {
    balanceSource = "UTA模拟赠金";
    balanceNote = "Bitget添加的虚拟USDT记录在bonus字段，旧页面漏读了该字段。";
  } else if (availableUsdt > 0 || equityUsdt > 0) {
    balanceSource = "UTA交易账户";
    balanceNote = "已读取统一交易账户中的USDT余额。";
  } else if (fundingBalanceUsdt > 0) {
    balanceSource = "资金账户";
    balanceNote = "USDT位于资金账户；若下单提示余额不足，需要在Bitget Demo中转入UTA。";
  }

  const environment = getBitgetDemoEnvironment();
  const connectionSymbols = environment.mode === "LIVE_EXPERIMENT"
    ? environment.liveAllowedSymbols
    : (["BTCUSDT", "ETHUSDT", "HYPEUSDT"] as BitgetSupportedSymbol[]);
  const symbols = await Promise.all(connectionSymbols.map(getContractConfig));

  return {
    availableUsdt,
    equityUsdt,
    bonusUsdt,
    demoFundsUsdt,
    detectedUsdt,
    fundingAvailableUsdt,
    fundingBalanceUsdt,
    balanceSource,
    balanceNote,
    apiMode: "UTA_V3",
    accountMode: String(settings.accountMode ?? "unknown"),
    accountLevel: String(settings.accountLevel ?? "unknown"),
    holdMode: String(settings.holdMode ?? "unknown"),
    symbols,
  };

}

export type BitgetApiSecurity = {
  permissions: string[];
  ipWhitelist: string[];
  withdrawalPermission: boolean;
  tradingPermission: boolean;
  managementPermission: boolean;
  safeForLiveExperiment: boolean;
  message: string;
};

type BitgetAccountInfo = {
  ips?: string;
  permType?: string;
  permissions?: string[];
};

export async function getBitgetApiSecurity(): Promise<BitgetApiSecurity> {
  const info = await signedRequest<BitgetAccountInfo>({ method: "GET", path: "/api/v3/account/info" });
  const permissions = Array.isArray(info?.permissions) ? info.permissions.map(String) : [];
  const ipWhitelist = String(info?.ips ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const withdrawalPermission = permissions.some((value) => value.toLowerCase().includes("withdraw"));
  const tradingPermission = permissions.some((value) => {
    const normalized = value.toLowerCase();
    return normalized === "uta_trade" || normalized.includes("trade") || normalized.includes("order");
  });
  const managementPermission = permissions.some((value) => value.toLowerCase() === "uta_mgt");
  const safeForLiveExperiment = !withdrawalPermission && tradingPermission && managementPermission;
  const messages = [
    withdrawalPermission ? "API密钥包含提币权限，禁止实盘实验。" : "未检测到提币权限。",
    tradingPermission ? "已检测到统一账户交易权限。" : "未检测到UTA交易权限。",
    managementPermission ? "已检测到统一账户管理权限。" : "未检测到UTA管理权限。",
    ipWhitelist.length > 0
      ? `已绑定${ipWhitelist.length}个IP。`
      : "未绑定IP白名单；按当前实盘实验配置，此项仅提示风险，不再阻止启动和下单。",
  ];
  return { permissions, ipWhitelist, withdrawalPermission, tradingPermission, managementPermission, safeForLiveExperiment, message: messages.join(" ") };
}

export type BitgetLiveExperimentStatus = {
  enabled: boolean;
  active: boolean;
  completed: boolean;
  stopped: boolean;
  status: "DISABLED" | "NOT_STARTED" | "ACTIVE" | "COMPLETED" | "STOPPED";
  startedAt: string | null;
  endsAt: string | null;
  initialEquityUsdt: number | null;
  currentEquityUsdt: number | null;
  peakEquityUsdt: number | null;
  pnlUsdt: number | null;
  pnlPct: number | null;
  maxDrawdownUsdt: number | null;
  maxDrawdownPct: number | null;
  dailyPnlUsdt: number | null;
  dailyPnlPct: number | null;
  dailyHistory: Array<{
    date: string;
    openingEquityUsdt: number;
    closingEquityUsdt: number;
    pnlUsdt: number;
    pnlPct: number;
    trades: number;
  }>;
  stopReason: string;
  securityMessage: string;
};

type LiveExperimentRow = {
  status: string;
  started_at: Date | string | null;
  ends_at: Date | string | null;
  initial_equity_usdt: number | null;
  current_equity_usdt: number | null;
  peak_equity_usdt: number | null;
  max_drawdown_usdt: number | null;
  max_drawdown_pct: number | null;
  stop_reason: string;
};

let liveExperimentEnsured = false;
async function ensureBitgetLiveExperimentTable(): Promise<boolean> {
  if (!prisma) return false;
  if (liveExperimentEnsured) return true;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS trade_bitget_live_experiment (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      started_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      initial_equity_usdt DOUBLE PRECISION,
      current_equity_usdt DOUBLE PRECISION,
      peak_equity_usdt DOUBLE PRECISION,
      max_drawdown_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
      max_drawdown_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
      stop_reason TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO trade_bitget_live_experiment (id) VALUES ('default')
    ON CONFLICT (id) DO NOTHING
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS trade_bitget_live_daily_snapshots (
      trade_date DATE PRIMARY KEY,
      opening_equity_usdt DOUBLE PRECISION NOT NULL,
      closing_equity_usdt DOUBLE PRECISION NOT NULL,
      pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
      pnl_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
      trades INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  liveExperimentEnsured = true;
  return true;
}

type LiveDailySnapshot = {
  date: string;
  openingEquityUsdt: number;
  closingEquityUsdt: number;
  pnlUsdt: number;
  pnlPct: number;
  trades: number;
};

function beijingDateKey(now: Date): string {
  return new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10);
}

async function syncLiveDailySnapshot(now: Date, equity: number): Promise<{ current: LiveDailySnapshot; history: LiveDailySnapshot[] }> {
  if (!prisma) throw new Error("实盘每日净值数据库不可用");
  const date = beijingDateKey(now);
  const previous = await prisma.$queryRawUnsafe<Array<{ closing_equity_usdt: number }>>(
    `SELECT closing_equity_usdt FROM trade_bitget_live_daily_snapshots WHERE trade_date < $1::date ORDER BY trade_date DESC LIMIT 1`,
    date
  );
  const existing = await prisma.$queryRawUnsafe<Array<{ opening_equity_usdt: number }>>(
    `SELECT opening_equity_usdt FROM trade_bitget_live_daily_snapshots WHERE trade_date = $1::date LIMIT 1`,
    date
  );
  const opening = Number(existing[0]?.opening_equity_usdt ?? previous[0]?.closing_equity_usdt ?? equity);
  const pnl = equity - opening;
  const pnlPct = opening > 0 ? pnl / opening * 100 : 0;
  const trades = await liveOpenAttemptsToday(now);
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_bitget_live_daily_snapshots (trade_date, opening_equity_usdt, closing_equity_usdt, pnl_usdt, pnl_pct, trades, updated_at)
     VALUES ($1::date, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (trade_date) DO UPDATE SET closing_equity_usdt=EXCLUDED.closing_equity_usdt, pnl_usdt=EXCLUDED.pnl_usdt, pnl_pct=EXCLUDED.pnl_pct, trades=EXCLUDED.trades, updated_at=NOW()`,
    date, opening, equity, pnl, pnlPct, trades
  );
  const rows = await prisma.$queryRawUnsafe<Array<{
    trade_date: Date | string; opening_equity_usdt: number; closing_equity_usdt: number; pnl_usdt: number; pnl_pct: number; trades: number;
  }>>(`SELECT trade_date, opening_equity_usdt, closing_equity_usdt, pnl_usdt, pnl_pct, trades FROM trade_bitget_live_daily_snapshots ORDER BY trade_date DESC LIMIT 40`);
  const history = rows.map((row) => ({
    date: new Date(row.trade_date).toISOString().slice(0, 10),
    openingEquityUsdt: Number(row.opening_equity_usdt),
    closingEquityUsdt: Number(row.closing_equity_usdt),
    pnlUsdt: Number(row.pnl_usdt),
    pnlPct: Number(row.pnl_pct),
    trades: Number(row.trades),
  }));
  return { current: history.find((row) => row.date === date) ?? { date, openingEquityUsdt: opening, closingEquityUsdt: equity, pnlUsdt: pnl, pnlPct, trades }, history };
}

function dateIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function beijingStartOfDayDate(now: Date): Date {
  const shifted = new Date(now.getTime() + 8 * 60 * 60_000);
  const utc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(utc - 8 * 60 * 60_000);
}

async function liveOpenAttemptsToday(now: Date): Promise<number> {
  if (!prisma) return 0;
  await ensureBitgetExecutionOutboxTable();
  const start = beijingStartOfDayDate(now);
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
    `SELECT COUNT(*) AS count FROM trade_execution_outbox
     WHERE environment_mode='LIVE_EXPERIMENT' AND action_type='OPEN_MARKET'
       AND status IN ('ACKNOWLEDGED','CONFIRMED','RECONCILED') AND created_at >= $1`,
    start
  );
  return Number(rows[0]?.count ?? 0);
}

function disabledLiveExperimentStatus(): BitgetLiveExperimentStatus {
  return { enabled: false, active: false, completed: false, stopped: false, status: "DISABLED", startedAt: null, endsAt: null, initialEquityUsdt: null, currentEquityUsdt: null, peakEquityUsdt: null, pnlUsdt: null, pnlPct: null, maxDrawdownUsdt: null, maxDrawdownPct: null, dailyPnlUsdt: null, dailyPnlPct: null, dailyHistory: [], stopReason: "", securityMessage: "Demo模式" };
}

async function readLiveDailyHistory(): Promise<LiveDailySnapshot[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<Array<{
    trade_date: Date | string; opening_equity_usdt: number; closing_equity_usdt: number; pnl_usdt: number; pnl_pct: number; trades: number;
  }>>(`SELECT trade_date, opening_equity_usdt, closing_equity_usdt, pnl_usdt, pnl_pct, trades FROM trade_bitget_live_daily_snapshots ORDER BY trade_date DESC LIMIT 40`);
  return rows.map((row) => ({
    date: new Date(row.trade_date).toISOString().slice(0, 10),
    openingEquityUsdt: Number(row.opening_equity_usdt),
    closingEquityUsdt: Number(row.closing_equity_usdt),
    pnlUsdt: Number(row.pnl_usdt),
    pnlPct: Number(row.pnl_pct),
    trades: Number(row.trades),
  }));
}

export async function readBitgetLiveExperimentStatus(now = new Date()): Promise<BitgetLiveExperimentStatus> {
  const environment = getBitgetDemoEnvironment();
  if (environment.mode !== "LIVE_EXPERIMENT") return disabledLiveExperimentStatus();
  if (!(await ensureBitgetLiveExperimentTable()) || !prisma) throw new Error("实盘实验状态数据库不可用");
  const rows = await prisma.$queryRawUnsafe<LiveExperimentRow[]>(`SELECT * FROM trade_bitget_live_experiment WHERE id='default' LIMIT 1`);
  const row = rows[0];
  if (!row) throw new Error("实盘实验状态读取失败");
  const status = String(row.status || "NOT_STARTED").toUpperCase() as BitgetLiveExperimentStatus["status"];
  const initial = Number(row.initial_equity_usdt ?? environment.liveInitialCapitalUsdt);
  const current = Number(row.current_equity_usdt ?? initial);
  const peak = Number(row.peak_equity_usdt ?? current);
  const history = await readLiveDailyHistory().catch(() => [] as LiveDailySnapshot[]);
  const today = history.find((item) => item.date === beijingDateKey(now));
  const pnl = initial > 0 ? current - initial : 0;
  return {
    enabled: true, active: status === "ACTIVE", completed: status === "COMPLETED", stopped: status === "STOPPED", status,
    startedAt: dateIso(row.started_at), endsAt: dateIso(row.ends_at), initialEquityUsdt: initial || null, currentEquityUsdt: current || 0, peakEquityUsdt: peak || 0,
    pnlUsdt: pnl, pnlPct: initial > 0 ? pnl / initial * 100 : 0,
    maxDrawdownUsdt: Number(row.max_drawdown_usdt ?? 0), maxDrawdownPct: Number(row.max_drawdown_pct ?? 0),
    dailyPnlUsdt: today?.pnlUsdt ?? 0, dailyPnlPct: today?.pnlPct ?? 0, dailyHistory: history,
    stopReason: String(row.stop_reason ?? ""), securityMessage: "安全权限在实验启动及管理员检查时验证；运行中由服务器账户对账持续监控。",
  };
}

export async function syncBitgetLiveExperimentStatus(
  now = new Date(),
  options: { allowStart?: boolean } = {}
): Promise<BitgetLiveExperimentStatus> {
  const environment = getBitgetDemoEnvironment();
  if (environment.mode !== "LIVE_EXPERIMENT") return disabledLiveExperimentStatus();
  if (!(await ensureBitgetLiveExperimentTable()) || !prisma) throw new Error("实盘实验状态数据库不可用");

  const rows = await prisma.$queryRawUnsafe<LiveExperimentRow[]>(`SELECT * FROM trade_bitget_live_experiment WHERE id='default' LIMIT 1`);
  let row = rows[0];
  if (!row) throw new Error("实盘实验状态读取失败");
  let status = String(row.status || "NOT_STARTED").toUpperCase();

  // 未开启或仅展示状态时，不重复调用Bitget。页面刷新只读数据库，避免把后台API打满。
  if (status === "NOT_STARTED" && (!environment.executionAllowed || !options.allowStart)) {
    return readBitgetLiveExperimentStatus(now);
  }

  let equity = Number(row.current_equity_usdt ?? environment.liveInitialCapitalUsdt);
  let securityMessage = "运行中账户权限由轻量安全检查持续验证。";
  let securitySafe = true;

  if (status === "NOT_STARTED" && environment.executionAllowed && options.allowStart) {
    const [account, security, positions, pending] = await Promise.all([
      testBitgetDemoConnection(),
      getBitgetApiSecurity(),
      getBitgetDemoCurrentPositions(),
      getBitgetDemoPendingStrategyOrders(),
    ]);
    equity = account.equityUsdt || account.availableUsdt || 0;
    securityMessage = security.message;
    securitySafe = security.safeForLiveExperiment;
    if (!environment.liveConfirmationAccepted) throw new Error("未确认真实亏损风险");
    if (!securitySafe) throw new Error(securityMessage);
    const accountMode = String(account.accountMode ?? "").toLowerCase();
    if (!["unified", "hybrid"].includes(accountMode)) throw new Error(`当前账户模式为${account.accountMode || "unknown"}，实盘实验只支持Bitget UTA的unified或hybrid模式。`);
    const unavailableSymbols = environment.liveAllowedSymbols.filter((symbol) => !account.symbols.some((item) => item.symbol === symbol && item.available));
    if (unavailableSymbols.length) throw new Error(`当前Bitget账户不支持实验合约：${unavailableSymbols.join(", ")}。`);
    if (account.availableUsdt < Math.min(environment.liveMaxPositionNotionalUsdt, environment.liveInitialCapitalUsdt * 0.5)) throw new Error(`UTA可用USDT仅${account.availableUsdt.toFixed(2)}，请将实验资金放入统一交易账户。`);
    const tolerance = Math.max(50, environment.liveInitialCapitalUsdt * 0.15);
    if (Math.abs(equity - environment.liveInitialCapitalUsdt) > tolerance) throw new Error(`实盘账户权益${equity.toFixed(2)} USDT与实验本金${environment.liveInitialCapitalUsdt.toFixed(2)} USDT偏差过大。`);
    if (positions.length || pending.length) throw new Error("实验启动前账户必须无持仓、无止盈止损策略单。");
    const endsAt = new Date(now.getTime() + environment.liveDurationDays * 24 * 60 * 60_000);
    await prisma.$executeRaw`UPDATE trade_bitget_live_experiment SET status='ACTIVE', started_at=${now}, ends_at=${endsAt}, initial_equity_usdt=${equity}, current_equity_usdt=${equity}, peak_equity_usdt=${equity}, max_drawdown_usdt=0, max_drawdown_pct=0, stop_reason='', updated_at=NOW() WHERE id='default'`;
    row = { ...row, status: "ACTIVE", started_at: now, ends_at: endsAt, initial_equity_usdt: equity, current_equity_usdt: equity, peak_equity_usdt: equity, max_drawdown_usdt: 0, max_drawdown_pct: 0, stop_reason: "" };
    status = "ACTIVE";
  } else {
    // 运行中只读取账户余额和API权限，不再每分钟重复拉取10个合约配置、资金账户、持仓及策略单。
    const [balance, security] = await Promise.all([getBitgetRuntimeAccountBalance(), getBitgetApiSecurity()]);
    equity = balance.equityUsdt || balance.availableUsdt || Number(row.current_equity_usdt ?? 0);
    securityMessage = security.message;
    securitySafe = security.safeForLiveExperiment;
  }

  const initial = Number(row.initial_equity_usdt ?? equity);
  const date = beijingDateKey(now);
  const dailySnapshot = row.started_at ? await syncLiveDailySnapshot(now, equity) : { current: { date, openingEquityUsdt: equity, closingEquityUsdt: equity, pnlUsdt: 0, pnlPct: 0, trades: 0 }, history: [] as LiveDailySnapshot[] };
  const peak = Math.max(Number(row.peak_equity_usdt ?? equity), equity);
  const drawdown = Math.max(0, peak - equity);
  const drawdownPct = peak > 0 ? drawdown / peak * 100 : 0;
  const endsAtMs = row.ends_at ? new Date(row.ends_at).getTime() : NaN;
  let stopReason = String(row.stop_reason ?? "");
  if (status === "ACTIVE" && stopReason.startsWith("今日账户亏损") && dailySnapshot.current.pnlUsdt > -environment.liveDailyLossUsdt) stopReason = "";
  if (status === "ACTIVE" && !securitySafe) { status = "STOPPED"; stopReason = `API安全检查未通过：${securityMessage}`; }
  else if (status === "ACTIVE" && dailySnapshot.current.pnlUsdt <= -environment.liveDailyLossUsdt) stopReason = `今日账户亏损${Math.abs(dailySnapshot.current.pnlUsdt).toFixed(2)} USDT，已达到${environment.liveDailyLossUsdt.toFixed(2)} USDT日止损；今天停止新开仓。`;
  else if (status === "ACTIVE" && drawdown >= environment.liveMaxDrawdownUsdt) { status = "STOPPED"; stopReason = `账户回撤达到${drawdown.toFixed(2)} USDT，超过${environment.liveMaxDrawdownUsdt.toFixed(2)} USDT总止损。`; }
  else if (status === "ACTIVE" && Number.isFinite(endsAtMs) && now.getTime() >= endsAtMs) { status = "COMPLETED"; stopReason = "30天实盘实验到期，已停止新开仓。"; }
  await prisma.$executeRaw`UPDATE trade_bitget_live_experiment SET status=${status}, current_equity_usdt=${equity}, peak_equity_usdt=${peak}, max_drawdown_usdt=GREATEST(max_drawdown_usdt, ${drawdown}), max_drawdown_pct=GREATEST(max_drawdown_pct, ${drawdownPct}), stop_reason=${stopReason}, updated_at=NOW() WHERE id='default'`;
  const pnl = initial > 0 ? equity - initial : 0;
  return { enabled: true, active: status === "ACTIVE", completed: status === "COMPLETED", stopped: status === "STOPPED", status: status as BitgetLiveExperimentStatus["status"], startedAt: dateIso(row.started_at), endsAt: dateIso(row.ends_at), initialEquityUsdt: initial || null, currentEquityUsdt: equity || 0, peakEquityUsdt: peak || 0, pnlUsdt: pnl, pnlPct: initial > 0 ? pnl / initial * 100 : 0, maxDrawdownUsdt: Math.max(Number(row.max_drawdown_usdt ?? 0), drawdown), maxDrawdownPct: Math.max(Number(row.max_drawdown_pct ?? 0), drawdownPct), dailyPnlUsdt: dailySnapshot.current.pnlUsdt, dailyPnlPct: dailySnapshot.current.pnlPct, dailyHistory: dailySnapshot.history, stopReason, securityMessage };
}

async function assertLiveExperimentOpenAllowed(input: { symbol: BitgetSupportedSymbol; size: string }): Promise<void> {
  const environment = getBitgetDemoEnvironment();
  if (environment.mode !== "LIVE_EXPERIMENT") return;
  if (!environment.executionAllowed) throw new Error("BITGET_LIVE_EXECUTION_ALLOWED尚未开启或真实风险确认无效");
  if (!environment.liveAllowedSymbols.includes(input.symbol)) throw new Error(`${input.symbol}不在实盘实验允许品种中`);
  const experiment = await readBitgetLiveExperimentStatus(new Date());
  if (!experiment.active) throw new Error(experiment.stopReason || `实盘实验状态为${experiment.status}，禁止新开仓`);
  if ((experiment.dailyPnlUsdt ?? 0) <= -environment.liveDailyLossUsdt) {
    throw new Error(`今日净亏损${Math.abs(experiment.dailyPnlUsdt ?? 0).toFixed(2)} USDT，达到${environment.liveDailyLossUsdt.toFixed(2)} USDT日止损，明日再评估。`);
  }
  const [positions, quotes, attempts] = await Promise.all([
    getBitgetDemoCurrentPositions(),
    getBitgetDemoMarketQuotes([input.symbol]),
    liveOpenAttemptsToday(new Date()),
  ]);
  if (positions.some((row) => row.symbol === input.symbol && row.total > 0)) {
    throw new Error(`${input.symbol}已有持仓，禁止同品种重复开仓`);
  }
  if (positions.length >= environment.liveMaxConcurrentPositions) {
    throw new Error(`实盘实验最多同时持有${environment.liveMaxConcurrentPositions}个仓位`);
  }
  if (attempts >= environment.liveMaxTradesPerDay) throw new Error(`今日已达到${environment.liveMaxTradesPerDay}笔开仓上限`);
  const price = quotes.find((row) => row.symbol === input.symbol)?.price ?? 0;
  const notional = Number(input.size) * price;
  if (!Number.isFinite(notional) || notional <= 0) throw new Error("无法计算实盘订单名义价值");
  const equity = experiment.currentEquityUsdt ?? environment.liveInitialCapitalUsdt;
  const perPositionLimit = Math.min(environment.liveMaxPositionNotionalUsdt, equity * 0.3);
  if (notional > perPositionLimit + 0.01) {
    throw new Error(`订单名义价值${notional.toFixed(2)} USDT超过单仓上限${perPositionLimit.toFixed(2)} USDT`);
  }
  const currentGross = positions.reduce((sum, row) => sum + Math.abs(row.total * row.markPrice), 0);
  const grossLimit = equity * environment.liveMaxGrossNotionalPct / 100;
  if (currentGross + notional > grossLimit + 0.01) {
    throw new Error(`组合总名义仓位将达到${(currentGross + notional).toFixed(2)} USDT，超过${grossLimit.toFixed(2)} USDT上限`);
  }
  const groupFor = (symbol: string): "CRYPTO" | "EQUITY" | "COMMODITY" =>
    ["BTCUSDT", "ETHUSDT", "HYPEUSDT"].includes(symbol)
      ? "CRYPTO"
      : ["XAUTUSDT", "XAGUSDT", "CLUSDT"].includes(symbol)
        ? "COMMODITY"
        : "EQUITY";
  const group = groupFor(input.symbol);
  const groupRows = positions.filter((row) => groupFor(row.symbol) === group);
  // The global ten-position gate is authoritative. Group notional caps still diversify risk.
  const groupCountLimit = environment.liveMaxConcurrentPositions;
  const groupPctLimit = group === "CRYPTO" ? 45 : group === "EQUITY" ? 50 : 40;
  if (groupRows.length >= groupCountLimit) throw new Error(`${group}风险组最多同时持有${groupCountLimit}个仓位`);
  const groupNotional = groupRows.reduce((sum, row) => sum + Math.abs(row.total * row.markPrice), 0);
  const groupLimit = equity * groupPctLimit / 100;
  if (groupNotional + notional > groupLimit + 0.01) {
    throw new Error(`${group}风险组名义仓位将达到${(groupNotional + notional).toFixed(2)} USDT，超过${groupLimit.toFixed(2)} USDT上限`);
  }
}

export async function getContractConfig(
  symbol: BitgetSupportedSymbol
): Promise<BitgetContractConfig> {
  try {
    const rows = await signedRequest<BitgetInstrumentRow[]>({
      method: "GET",
      path: "/api/v3/market/instruments",
      query: { category: PRODUCT_TYPE, symbol },
    });

    const row = rows.find(
      (item) => String(item.symbol ?? "").toUpperCase() === symbol
    );

    if (!row) {
      return {
        symbol,
        available: false,
        minTradeNum: 0,
        minOrderAmount: 0,
        sizeMultiplier: 0,
        volumePlace: 8,
        symbolStatus: "UTA V3当前环境未返回该合约",
      };
    }

    const status = String(row.status ?? "unknown");
    return {
      symbol,
      available: status === "online",
      minTradeNum: Number(row.minOrderQty ?? 0),
      minOrderAmount: Number(row.minOrderAmount ?? 0),
      sizeMultiplier: Number(row.quantityMultiplier ?? 0),
      volumePlace: Number(row.quantityPrecision ?? 8),
      symbolStatus: status,
    };
  } catch (error) {
    return {
      symbol,
      available: false,
      minTradeNum: 0,
      minOrderAmount: 0,
      sizeMultiplier: 0,
      volumePlace: 8,
      symbolStatus: error instanceof Error ? error.message : "unavailable",
    };
  }
}

function decimalPlaces(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 8;
  const text = value.toString().toLowerCase();
  if (text.includes("e-")) return Number(text.split("e-")[1] ?? 8);
  const decimalPart = text.split(".")[1];
  return decimalPart?.length ?? 0;
}

export function normalizeOrderSize(
  quantity: number,
  contract: BitgetContractConfig
): string {
  if (!contract.available) throw new Error(`${contract.symbol}当前交易环境暂不支持`);

  const step =
    contract.sizeMultiplier > 0
      ? contract.sizeMultiplier
      : 10 ** -contract.volumePlace;
  const floored = Math.floor((quantity + Number.EPSILON) / step) * step;
  const places = Math.max(decimalPlaces(step), contract.volumePlace, 0);
  const normalized = Number(floored.toFixed(Math.min(places, 12)));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`${contract.symbol}数量计算为0`);
  }
  if (contract.minTradeNum > 0 && normalized < contract.minTradeNum) {
    throw new Error(
      `${contract.symbol}数量${normalized}低于最小下单量${contract.minTradeNum}`
    );
  }

  return normalized.toFixed(Math.min(places, 12)).replace(/\.?0+$/, "");
}

async function configureUtaSymbol(
  symbol: BitgetSupportedSymbol
): Promise<string[]> {
  const env = getBitgetDemoEnvironment();

  try {
    await signedRequest<string>({
      method: "POST",
      path: "/api/v3/account/set-leverage",
      body: {
        category: PRODUCT_TYPE,
        symbol,
        leverage: String(env.leverage),
        marginMode: "isolated",
      },
    });
    return [`UTA V3已设置逐仓${env.leverage}倍`];
  } catch (error) {
    throw new Error(
      `无法设置${symbol}逐仓${env.leverage}倍：${
        error instanceof Error ? error.message : "未知错误"
      }`
    );
  }
}

function clientOid(paperOrderId: string): string {
  const hash = createHash("sha256")
    .update(paperOrderId)
    .digest("hex")
    .slice(0, 22);
  return `mx${hash}`;
}

async function getBitgetDemoOrderDetailsStrict(input: {
  orderId?: string;
  clientOid?: string;
}): Promise<BitgetDemoOrderDetails | null> {
  if (!input.orderId && !input.clientOid) return null;
  try {
    return await signedRequest<BitgetDemoOrderDetails>({
      method: "GET",
      path: "/api/v3/trade/order-info",
      query: {
        ...(input.orderId ? { orderId: input.orderId } : {}),
        ...(input.clientOid ? { clientOid: input.clientOid } : {}),
      },
    });
  } catch (error) {
    if (isOrderNotFoundError(error)) return null;
    throw error;
  }
}

export async function getBitgetDemoOrderDetails(input: {
  orderId?: string;
  clientOid?: string;
}): Promise<BitgetDemoOrderDetails | null> {
  return getBitgetDemoOrderDetailsStrict(input).catch(() => null);
}

export async function getBitgetDemoOrderByClientOid(
  oid: string
): Promise<BitgetOrderResponse | null> {
  return getBitgetDemoOrderDetailsStrict({ clientOid: oid });
}

function inferHedgePositionSide(input: {
  side: "buy" | "sell";
  reduceOnly: boolean;
}): "long" | "short" {
  if (!input.reduceOnly) return input.side === "buy" ? "long" : "short";
  return input.side === "sell" ? "long" : "short";
}

type ExecutionAction = "OPEN_MARKET" | "CLOSE_MARKET" | "PLACE_PROTECTION" | "CANCEL_PROTECTION";
type ExecutionStatus = "PENDING" | "PROCESSING" | "ACKNOWLEDGED" | "CONFIRMED" | "FAILED" | "RECONCILED";

type ExecutionOutboxRow = {
  id: string;
  idempotency_key: string;
  decision_id: string | null;
  action_type: ExecutionAction;
  symbol: string;
  direction: string | null;
  payload: unknown;
  status: ExecutionStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: Date | string | null;
  locked_until: Date | string | null;
  client_oid: string | null;
  bitget_order_id: string | null;
  last_error: string;
  acknowledged_at: Date | string | null;
  confirmed_at: Date | string | null;
  reconciled_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  environment_mode: BitgetTradingMode;
};

type MarketExecutionPayload = {
  paperOrderId: string;
  symbol: BitgetSupportedSymbol;
  quantity: number;
  side: "buy" | "sell";
  reduceOnly: boolean;
  stopLoss?: number;
  takeProfit?: number;
  size: string;
  warnings: string[];
};

type ProtectionExecutionPayload = {
  paperOrderId: string;
  symbol: BitgetSupportedSymbol;
  posSide: "long" | "short";
  stopLoss: number;
  takeProfit: number;
};

type CancelProtectionPayload = {
  orderId?: string;
  clientOid?: string;
  symbol: string;
};

let outboxEnsured = false;
export async function ensureBitgetExecutionOutboxTable(): Promise<boolean> {
  if (!prisma) return false;
  if (outboxEnsured) return true;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS trade_execution_outbox (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      decision_id TEXT,
      action_type TEXT NOT NULL,
      symbol TEXT NOT NULL,
      direction TEXT,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      locked_until TIMESTAMPTZ,
      client_oid TEXT,
      bitget_order_id TEXT,
      last_error TEXT NOT NULL DEFAULT '',
      acknowledged_at TIMESTAMPTZ,
      confirmed_at TIMESTAMPTZ,
      reconciled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      environment_mode TEXT NOT NULL DEFAULT 'DEMO',
      CONSTRAINT trade_execution_outbox_action_check CHECK (action_type IN ('OPEN_MARKET','CLOSE_MARKET','PLACE_PROTECTION','CANCEL_PROTECTION')),
      CONSTRAINT trade_execution_outbox_status_check CHECK (status IN ('PENDING','PROCESSING','ACKNOWLEDGED','CONFIRMED','FAILED','RECONCILED'))
    )
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE trade_execution_outbox ADD COLUMN IF NOT EXISTS environment_mode TEXT NOT NULL DEFAULT 'DEMO'`);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS trade_execution_outbox_ready_idx
    ON trade_execution_outbox(status, next_attempt_at, created_at)
  `);
  outboxEnsured = true;
  return true;
}

function parsePayload<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

async function getOutboxById(id: string): Promise<ExecutionOutboxRow | null> {
  if (!prisma) return null;
  const rows = await prisma.$queryRawUnsafe<ExecutionOutboxRow[]>(
    `SELECT * FROM trade_execution_outbox WHERE id = $1 LIMIT 1`,
    id
  );
  return rows[0] ?? null;
}

async function createOutboxIntent(input: {
  idempotencyKey: string;
  decisionId: string | null;
  actionType: ExecutionAction;
  symbol: string;
  direction?: string | null;
  clientOid?: string | null;
  payload: Record<string, unknown>;
}): Promise<ExecutionOutboxRow> {
  if (!prisma) throw new Error("数据库不可用，无法创建持久化交易任务");
  await ensureBitgetExecutionOutboxTable();
  const rows = await prisma.$queryRawUnsafe<ExecutionOutboxRow[]>(
    `INSERT INTO trade_execution_outbox
      (id,idempotency_key,decision_id,action_type,symbol,direction,payload,status,client_oid,created_at,updated_at,environment_mode)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'PENDING',$8,NOW(),NOW(),$9)
     ON CONFLICT (idempotency_key) DO UPDATE SET
       payload=CASE WHEN trade_execution_outbox.status IN ('PENDING','FAILED') AND trade_execution_outbox.environment_mode=EXCLUDED.environment_mode THEN EXCLUDED.payload ELSE trade_execution_outbox.payload END,
       updated_at=NOW()
     RETURNING *`,
    `outbox_${randomUUID()}`,
    `${getBitgetDemoEnvironment().mode}:${input.idempotencyKey}`,
    input.decisionId,
    input.actionType,
    input.symbol,
    input.direction ?? null,
    JSON.stringify(input.payload),
    input.clientOid ?? null,
    getBitgetDemoEnvironment().mode
  );
  if (!rows[0]) throw new Error("持久化交易任务创建失败");
  return rows[0];
}

async function acquireOutboxTask(id: string): Promise<ExecutionOutboxRow | null> {
  if (!prisma) return null;
  const rows = await prisma.$queryRawUnsafe<ExecutionOutboxRow[]>(
    `UPDATE trade_execution_outbox
     SET status='PROCESSING',attempt_count=attempt_count+1,
         locked_until=NOW()+INTERVAL '45 seconds',last_error='',updated_at=NOW()
     WHERE id=$1 AND attempt_count<max_attempts
       AND (status IN ('PENDING','FAILED') OR (status='PROCESSING' AND (locked_until IS NULL OR locked_until<NOW())))
       AND next_attempt_at<=NOW()
     RETURNING *`,
    id
  );
  return rows[0] ?? null;
}

async function updateOutbox(input: {
  id: string;
  status: ExecutionStatus;
  clientOid?: string | null;
  bitgetOrderId?: string | null;
  lastError?: string;
  retrySeconds?: number;
  terminal?: boolean;
}): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRawUnsafe(
    `UPDATE trade_execution_outbox SET
       status=$2,client_oid=COALESCE($3,client_oid),bitget_order_id=COALESCE($4,bitget_order_id),
       last_error=$5,next_attempt_at=NOW()+($6::text||' seconds')::interval,locked_until=NULL,
       acknowledged_at=CASE WHEN $2 IN ('ACKNOWLEDGED','CONFIRMED','RECONCILED') THEN COALESCE(acknowledged_at,NOW()) ELSE acknowledged_at END,
       confirmed_at=CASE WHEN $2 IN ('CONFIRMED','RECONCILED') THEN COALESCE(confirmed_at,NOW()) ELSE confirmed_at END,
       reconciled_at=CASE WHEN $2='RECONCILED' THEN COALESCE(reconciled_at,NOW()) ELSE reconciled_at END,
       max_attempts = CASE WHEN $7 THEN attempt_count ELSE max_attempts END,updated_at=NOW()
     WHERE id=$1`,
    input.id,
    input.status,
    input.clientOid ?? null,
    input.bitgetOrderId ?? null,
    input.lastError ?? "",
    Math.max(0, Math.floor(input.retrySeconds ?? 0)),
    Boolean(input.terminal)
  );
}

function orderTerminalStatus(order: BitgetDemoOrderDetails | null): "CONFIRMED" | "ACKNOWLEDGED" | "FAILED" | null {
  if (!order) return null;
  const status = String(order.orderStatus ?? "").toLowerCase();
  if (status === "filled") return "CONFIRMED";
  if (status === "cancelled") return "FAILED";
  if (["live", "new", "partially_filled"].includes(status)) return "ACKNOWLEDGED";
  return order.orderId ? "ACKNOWLEDGED" : null;
}

async function submitMarketOrderDirect(
  payload: MarketExecutionPayload,
  oid: string,
  onDispatch?: () => void
): Promise<BitgetOrderResponse> {
  await assertBitgetClockSafe();
  const settings = await getUtaSettings();
  const body: Record<string, unknown> = {
    category: PRODUCT_TYPE,
    symbol: payload.symbol,
    qty: payload.size,
    side: payload.side,
    orderType: "market",
    clientOid: oid,
    reduceOnly: payload.reduceOnly ? "yes" : "no",
    marginMode: "isolated",
  };
  if (!payload.reduceOnly && payload.stopLoss && payload.stopLoss > 0) {
    body.stopLoss = payload.stopLoss.toFixed(8).replace(/\.?0+$/, "");
    body.slTriggerBy = "mark";
    body.slOrderType = "market";
  }
  if (!payload.reduceOnly && payload.takeProfit && payload.takeProfit > 0) {
    body.takeProfit = payload.takeProfit.toFixed(8).replace(/\.?0+$/, "");
    body.tpTriggerBy = "mark";
    body.tpOrderType = "market";
  }
  if (settings.holdMode === "hedge_mode") body.posSide = inferHedgePositionSide(payload);
  onDispatch?.();
  return signedRequest<BitgetOrderResponse>({ method: "POST", path: "/api/v3/trade/place-order", body });
}

type BitgetStrategyOrderRecord = {
  orderId?: string;
  clientOid?: string;
  symbol?: string;
  posSide?: string;
  status?: string;
  takeProfit?: string;
  stopLoss?: string;
};

async function getStrategyOrderRecord(input: {
  orderId?: string | null;
  clientOid?: string | null;
}): Promise<BitgetStrategyOrderRecord | null> {
  const pending = await signedRequest<BitgetStrategyOrderRecord[]>({
    method: "GET",
    path: "/api/v3/trade/unfilled-strategy-orders",
    query: { category: PRODUCT_TYPE, type: "tpsl" },
  });
  const current = pending.find((row) =>
    Boolean((input.orderId && row.orderId === input.orderId) || (input.clientOid && row.clientOid === input.clientOid))
  );
  if (current) return current;
  const history = await signedRequest<{ list?: BitgetStrategyOrderRecord[] }>({
    method: "GET",
    path: "/api/v3/trade/history-strategy-orders",
    query: { category: PRODUCT_TYPE, type: "tpsl", limit: 100 },
  });
  return (history.list ?? []).find((row) =>
    Boolean((input.orderId && row.orderId === input.orderId) || (input.clientOid && row.clientOid === input.clientOid))
  ) ?? null;
}

async function submitProtectionOrderDirect(
  payload: ProtectionExecutionPayload,
  oid: string,
  onDispatch?: () => void
): Promise<BitgetOrderResponse> {
  await assertBitgetClockSafe();
  onDispatch?.();
  return signedRequest<BitgetOrderResponse>({
    method: "POST",
    path: "/api/v3/trade/place-strategy-order",
    body: {
      category: PRODUCT_TYPE,
      symbol: payload.symbol,
      type: "tpsl",
      tpslMode: "full",
      posSide: payload.posSide,
      stopLoss: payload.stopLoss.toFixed(8).replace(/\.?0+$/, ""),
      takeProfit: payload.takeProfit.toFixed(8).replace(/\.?0+$/, ""),
      slTriggerBy: "mark",
      tpTriggerBy: "mark",
      slOrderType: "market",
      tpOrderType: "market",
      clientOid: oid,
    },
  });
}

async function cancelProtectionDirect(payload: CancelProtectionPayload): Promise<void> {
  await assertBitgetClockSafe();
  await signedRequest<null>({
    method: "POST",
    path: "/api/v3/trade/cancel-strategy-order",
    body: {
      ...(payload.orderId ? { orderId: payload.orderId } : {}),
      ...(payload.clientOid && !payload.orderId ? { clientOid: payload.clientOid } : {}),
    },
  });
}

async function confirmAcknowledgedOutbox(row: ExecutionOutboxRow): Promise<ExecutionOutboxRow> {
  if (row.action_type === "OPEN_MARKET" || row.action_type === "CLOSE_MARKET") {
    const order = await getBitgetDemoOrderDetails({
      orderId: row.bitget_order_id ?? undefined,
      clientOid: row.client_oid ?? undefined,
    });
    const status = orderTerminalStatus(order);
    if (status === "CONFIRMED") {
      await updateOutbox({ id: row.id, status: "CONFIRMED", clientOid: order?.clientOid, bitgetOrderId: order?.orderId });
    } else if (status === "FAILED") {
      await updateOutbox({ id: row.id, status: "FAILED", lastError: order?.cancelReason || "订单已取消", retrySeconds: 3600, terminal: true });
    } else {
      await updateOutbox({ id: row.id, status: "ACKNOWLEDGED", clientOid: order?.clientOid, bitgetOrderId: order?.orderId, retrySeconds: 20 });
    }
  } else if (row.action_type === "PLACE_PROTECTION") {
    const record = await getStrategyOrderRecord({ orderId: row.bitget_order_id, clientOid: row.client_oid });
    const status = String(record?.status ?? "").toLowerCase();
    if (record && ["pending", "submitting", "success"].includes(status)) {
      await updateOutbox({ id: row.id, status: "CONFIRMED", clientOid: record.clientOid, bitgetOrderId: record.orderId });
    } else if (record && ["failed", "cancelled"].includes(status)) {
      await updateOutbox({ id: row.id, status: "FAILED", lastError: `保护单状态${status}`, retrySeconds: 3600, terminal: true });
    } else {
      await updateOutbox({ id: row.id, status: "ACKNOWLEDGED", retrySeconds: 20 });
    }
  } else {
    const payload = parsePayload<CancelProtectionPayload>(row.payload);
    const record = await getStrategyOrderRecord({ orderId: payload.orderId, clientOid: payload.clientOid });
    const status = String(record?.status ?? "").toLowerCase();
    if (!record || ["cancelled", "success", "failed"].includes(status)) {
      await updateOutbox({ id: row.id, status: "CONFIRMED" });
    } else {
      await updateOutbox({ id: row.id, status: "ACKNOWLEDGED", retrySeconds: 20 });
    }
  }
  return (await getOutboxById(row.id)) ?? row;
}

async function processSingleOutboxTask(id: string): Promise<ExecutionOutboxRow> {
  const existing = await getOutboxById(id);
  if (!existing) throw new Error("交易执行任务不存在");
  if (["CONFIRMED", "RECONCILED"].includes(existing.status)) return existing;
  if (existing.status === "ACKNOWLEDGED") {
    try {
      return await confirmAcknowledgedOutbox(existing);
    } catch (error) {
      await updateOutbox({
        id: existing.id,
        status: "ACKNOWLEDGED",
        lastError: `FINAL_STATUS_QUERY_FAILED：${error instanceof Error ? error.message : "最终状态回查失败"}`,
        retrySeconds: 20,
      });
      return (await getOutboxById(existing.id)) ?? existing;
    }
  }
  const acquired = await acquireOutboxTask(id);
  if (!acquired) return (await getOutboxById(id)) ?? existing;
  let remoteSubmissionAttempted = false;
  try {
    if (acquired.action_type === "OPEN_MARKET" || acquired.action_type === "CLOSE_MARKET") {
      const payload = parsePayload<MarketExecutionPayload>(acquired.payload);
      const oid = acquired.client_oid || clientOid(payload.paperOrderId);
      const previous = await getBitgetDemoOrderByClientOid(oid);
      const response = previous?.orderId
        ? previous
        : await submitMarketOrderDirect(payload, oid, () => { remoteSubmissionAttempted = true; });
      if (!response?.orderId) throw new Error("Bitget未返回orderId");
      await updateOutbox({ id, status: "ACKNOWLEDGED", clientOid: response.clientOid ?? oid, bitgetOrderId: response.orderId, retrySeconds: 5 });
    } else if (acquired.action_type === "PLACE_PROTECTION") {
      const payload = parsePayload<ProtectionExecutionPayload>(acquired.payload);
      const oid = acquired.client_oid || clientOid(`${payload.paperOrderId}:protection`);
      const previous = await getStrategyOrderRecord({ clientOid: oid });
      const response = previous?.orderId
        ? previous
        : await submitProtectionOrderDirect(payload, oid, () => { remoteSubmissionAttempted = true; });
      if (!response?.orderId) throw new Error("Bitget未返回止盈止损orderId");
      await updateOutbox({ id, status: "ACKNOWLEDGED", clientOid: response.clientOid ?? oid, bitgetOrderId: response.orderId, retrySeconds: 5 });
    } else {
      const payload = parsePayload<CancelProtectionPayload>(acquired.payload);
      remoteSubmissionAttempted = true;
      await cancelProtectionDirect(payload);
      await updateOutbox({ id, status: "ACKNOWLEDGED", clientOid: payload.clientOid, bitgetOrderId: payload.orderId, retrySeconds: 2 });
    }
    const acknowledged = await getOutboxById(id);
    return acknowledged ? confirmAcknowledgedOutbox(acknowledged) : acquired;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bitget执行失败";
    if (remoteSubmissionAttempted && acquired.client_oid) {
      try {
        if (acquired.action_type === "OPEN_MARKET" || acquired.action_type === "CLOSE_MARKET") {
          const recoveredOrder = await getBitgetDemoOrderByClientOid(acquired.client_oid);
          if (recoveredOrder?.orderId) {
            await updateOutbox({ id, status: "ACKNOWLEDGED", clientOid: recoveredOrder.clientOid, bitgetOrderId: recoveredOrder.orderId, lastError: `响应异常后已按clientOid找回订单：${message}`, retrySeconds: 5 });
            return confirmAcknowledgedOutbox((await getOutboxById(id)) ?? acquired);
          }
        } else if (acquired.action_type === "PLACE_PROTECTION") {
          const recoveredProtection = await getStrategyOrderRecord({ clientOid: acquired.client_oid });
          if (recoveredProtection?.orderId) {
            await updateOutbox({ id, status: "ACKNOWLEDGED", clientOid: recoveredProtection.clientOid, bitgetOrderId: recoveredProtection.orderId, lastError: `响应异常后已按clientOid找回保护单：${message}`, retrySeconds: 5 });
            return confirmAcknowledgedOutbox((await getOutboxById(id)) ?? acquired);
          }
        }
      } catch (recoveryError) {
        if (isAmbiguousBitgetWriteError(error)) {
          await updateOutbox({
            id,
            status: "ACKNOWLEDGED",
            lastError: `ORDER_STATUS_UNKNOWN：${message}；回查失败：${recoveryError instanceof Error ? recoveryError.message : "未知错误"}`,
            retrySeconds: 20,
          });
          return (await getOutboxById(id)) ?? acquired;
        }
      }
      if (isAmbiguousBitgetWriteError(error)) {
        await updateOutbox({
          id,
          status: "ACKNOWLEDGED",
          lastError: `ORDER_STATUS_UNKNOWN：${message}；为防止重复下单，系统只回查、不自动重提。`,
          retrySeconds: 20,
        });
        return (await getOutboxById(id)) ?? acquired;
      }
    }
    const terminal = acquired.attempt_count >= acquired.max_attempts;
    await updateOutbox({
      id,
      status: "FAILED",
      lastError: message,
      retrySeconds: terminal ? 3600 : Math.min(300, 15 * 2 ** Math.max(0, acquired.attempt_count - 1)),
      terminal,
    });
    return (await getOutboxById(id)) ?? acquired;
  }
}

export async function processBitgetDemoExecutionOutbox(limit = 10): Promise<{
  processed: number;
  confirmed: number;
  acknowledged: number;
  failed: number;
}> {
  if (!prisma) return { processed: 0, confirmed: 0, acknowledged: 0, failed: 0 };
  await ensureBitgetExecutionOutboxTable();
  const mode = getBitgetDemoEnvironment().mode;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM trade_execution_outbox
     WHERE status IN ('PENDING','FAILED','ACKNOWLEDGED','PROCESSING')
       AND environment_mode=$2
       AND next_attempt_at<=NOW() AND attempt_count<max_attempts
       AND (status<>'PROCESSING' OR locked_until IS NULL OR locked_until<NOW())
     ORDER BY created_at ASC LIMIT $1`,
    Math.max(1, Math.min(25, Math.floor(limit))),
    mode
  );
  let confirmed = 0;
  let acknowledged = 0;
  let failed = 0;
  for (const row of rows) {
    const result = await processSingleOutboxTask(row.id);
    if (["CONFIRMED", "RECONCILED"].includes(result.status)) confirmed += 1;
    else if (result.status === "ACKNOWLEDGED") acknowledged += 1;
    else if (result.status === "FAILED") failed += 1;
  }
  return { processed: rows.length, confirmed, acknowledged, failed };
}

export async function placeBitgetDemoMarketOrder(input: {
  paperOrderId: string;
  symbol: BitgetSupportedSymbol;
  quantity: number;
  side: "buy" | "sell";
  reduceOnly: boolean;
  stopLoss?: number;
  takeProfit?: number;
}): Promise<{
  orderId: string;
  clientOid: string;
  size: string;
  warnings: string[];
  raw: BitgetOrderResponse;
}> {
  const env = getBitgetDemoEnvironment();
  if (!env.executionAllowed) throw new Error(env.mode === "LIVE_EXPERIMENT" ? "Bitget实盘执行尚未开启" : "BITGET_DEMO_EXECUTION_ALLOWED尚未设为true");
  await assertBitgetClockSafe();
  const contract = await getContractConfig(input.symbol);
  const size = normalizeOrderSize(input.quantity, contract);
  if (!input.reduceOnly) await assertLiveExperimentOpenAllowed({ symbol: input.symbol, size });
  const warnings = input.reduceOnly ? [] : await configureUtaSymbol(input.symbol);
  const oid = clientOid(input.paperOrderId);
  const payload: MarketExecutionPayload = { ...input, size, warnings };
  const task = await createOutboxIntent({
    idempotencyKey: `${input.reduceOnly ? "close" : "open"}:${oid}`,
    decisionId: input.paperOrderId.split(":")[0] || null,
    actionType: input.reduceOnly ? "CLOSE_MARKET" : "OPEN_MARKET",
    symbol: input.symbol,
    direction: input.side,
    clientOid: oid,
    payload: payload as unknown as Record<string, unknown>,
  });
  const result = await processSingleOutboxTask(task.id);
  if (!result.bitget_order_id || !result.client_oid || result.status === "FAILED") {
    throw new Error(result.last_error || "Bitget订单未进入可确认状态");
  }
  const raw = await getBitgetDemoOrderDetails({ orderId: result.bitget_order_id, clientOid: result.client_oid }) ?? {
    orderId: result.bitget_order_id,
    clientOid: result.client_oid,
  };
  return {
    orderId: result.bitget_order_id,
    clientOid: result.client_oid,
    size,
    warnings: [...warnings, `Phase 4执行发件箱：${result.status}`],
    raw,
  };
}

export async function placeBitgetDemoProtectionOrder(input: {
  paperOrderId: string;
  symbol: BitgetSupportedSymbol;
  posSide: "long" | "short";
  stopLoss: number;
  takeProfit: number;
}): Promise<{ orderId: string; clientOid: string }> {
  const env = getBitgetDemoEnvironment();
  if (!env.executionAllowed) throw new Error(env.mode === "LIVE_EXPERIMENT" ? "Bitget实盘执行尚未开启" : "BITGET_DEMO_EXECUTION_ALLOWED尚未设为true");
  await assertBitgetClockSafe();
  const oid = clientOid(`${input.paperOrderId}:protection`);
  const task = await createOutboxIntent({
    idempotencyKey: `protection:${oid}`,
    decisionId: input.paperOrderId.split(":")[0] || null,
    actionType: "PLACE_PROTECTION",
    symbol: input.symbol,
    direction: input.posSide,
    clientOid: oid,
    payload: input as unknown as Record<string, unknown>,
  });
  const result = await processSingleOutboxTask(task.id);
  if (!result.bitget_order_id || !result.client_oid || result.status === "FAILED") {
    throw new Error(result.last_error || "Bitget保护单未进入可确认状态");
  }
  return { orderId: result.bitget_order_id, clientOid: result.client_oid };
}

export async function cancelBitgetDemoStrategyOrder(input: {
  orderId?: string;
  clientOid?: string;
  symbol?: string;
}): Promise<void> {
  if (!input.orderId && !input.clientOid) throw new Error("取消策略订单必须提供orderId或clientOid");
  const ref = input.orderId ?? input.clientOid ?? "unknown";
  const payload: CancelProtectionPayload = {
    orderId: input.orderId,
    clientOid: input.clientOid,
    symbol: input.symbol ?? "UNKNOWN",
  };
  const task = await createOutboxIntent({
    idempotencyKey: `cancel-protection:${ref}`,
    decisionId: null,
    actionType: "CANCEL_PROTECTION",
    symbol: payload.symbol,
    clientOid: input.clientOid ?? null,
    payload: payload as unknown as Record<string, unknown>,
  });
  const result = await processSingleOutboxTask(task.id);
  if (result.status === "FAILED") throw new Error(result.last_error || "取消保护单失败");
}

export type BitgetDemoPosition = {
  symbol: string;
  posSide: "long" | "short";
  marginMode: string;
  total: number;
  leverage: number;
  avgPrice: number;
  markPrice: number;
  unrealisedPnl: number;
  profitRate: number;
  createdAt: string | null;
};

export type BitgetDemoClosedPosition = {
  positionId: string;
  symbol: string;
  posSide: "long" | "short";
  openPriceAvg: number;
  closePriceAvg: number;
  openTotalPos: number;
  closeTotalPos: number;
  cumRealisedPnl: number;
  netProfit: number;
  totalFunding: number;
  openFeeTotal: number;
  closeFeeTotal: number;
  cashDividend: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BitgetDemoStrategyOrder = {
  orderId: string;
  clientOid: string;
  symbol: string;
  posSide: "long" | "short";
  takeProfit: number | null;
  stopLoss: number | null;
  createdAt: string | null;
};

type BitgetPositionEnvelope = {
  list?: Array<{
    symbol?: string;
    posSide?: string;
    marginMode?: string;
    total?: string;
    leverage?: string;
    avgPrice?: string;
    markPrice?: string;
    unrealisedPnl?: string;
    profitRate?: string;
    createdTime?: string;
  }>;
};

type BitgetClosedPositionEnvelope = {
  list?: Array<{
    positionId?: string;
    symbol?: string;
    posSide?: string;
    openPriceAvg?: string;
    closePriceAvg?: string;
    openTotalPos?: string;
    closeTotalPos?: string;
    cumRealisedPnl?: string;
    netProfit?: string;
    totalFunding?: string;
    openFeeTotal?: string;
    closeFeeTotal?: string;
    cashDividend?: string;
    createdTime?: string;
    updatedTime?: string;
  }>;
};

type BitgetStrategyOrderRow = {
  orderId?: string;
  clientOid?: string;
  symbol?: string;
  posSide?: string;
  takeProfit?: string;
  stopLoss?: string;
  createdTime?: string;
};

function timestampIso(value: unknown): string | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return new Date(numeric).toISOString();
}

function sideValue(value: unknown): "long" | "short" {
  return String(value).toLowerCase() === "short" ? "short" : "long";
}

export async function getBitgetDemoCurrentPositions(): Promise<BitgetDemoPosition[]> {
  const payload = await signedRequest<BitgetPositionEnvelope>({
    method: "GET",
    path: "/api/v3/position/current-position",
    query: { category: PRODUCT_TYPE },
  });
  return (payload?.list ?? [])
    .map((row) => ({
      symbol: String(row.symbol ?? "").toUpperCase(),
      posSide: sideValue(row.posSide),
      marginMode: String(row.marginMode ?? "unknown"),
      total: finiteNumber(row.total),
      leverage: finiteNumber(row.leverage),
      avgPrice: finiteNumber(row.avgPrice),
      markPrice: finiteNumber(row.markPrice),
      unrealisedPnl: finiteNumber(row.unrealisedPnl),
      profitRate: finiteNumber(row.profitRate),
      createdAt: timestampIso(row.createdTime),
    }))
    .filter((row) => row.symbol && row.total > 0);
}

export async function getBitgetDemoClosedPositions(
  limit = 30
): Promise<BitgetDemoClosedPosition[]> {
  const payload = await signedRequest<BitgetClosedPositionEnvelope>({
    method: "GET",
    path: "/api/v3/position/history-position",
    query: {
      category: PRODUCT_TYPE,
      limit: Math.max(1, Math.min(100, Math.floor(limit))),
    },
  });
  return (payload?.list ?? [])
    .map((row) => ({
      positionId: String(row.positionId ?? ""),
      symbol: String(row.symbol ?? "").toUpperCase(),
      posSide: sideValue(row.posSide),
      openPriceAvg: finiteNumber(row.openPriceAvg),
      closePriceAvg: finiteNumber(row.closePriceAvg),
      openTotalPos: finiteNumber(row.openTotalPos),
      closeTotalPos: finiteNumber(row.closeTotalPos),
      cumRealisedPnl: finiteNumber(row.cumRealisedPnl),
      netProfit: finiteNumber(row.netProfit),
      totalFunding: finiteNumber(row.totalFunding),
      openFeeTotal: finiteNumber(row.openFeeTotal),
      closeFeeTotal: finiteNumber(row.closeFeeTotal),
      cashDividend: finiteNumber(row.cashDividend),
      createdAt: timestampIso(row.createdTime),
      updatedAt: timestampIso(row.updatedTime),
    }))
    .filter((row) => row.positionId && row.symbol);
}

export async function getBitgetDemoPendingStrategyOrders(): Promise<
  BitgetDemoStrategyOrder[]
> {
  const rows = await signedRequest<BitgetStrategyOrderRow[]>({
    method: "GET",
    path: "/api/v3/trade/unfilled-strategy-orders",
    query: { category: PRODUCT_TYPE, type: "tpsl" },
  });
  return (rows ?? [])
    .map((row) => ({
      orderId: String(row.orderId ?? ""),
      clientOid: String(row.clientOid ?? ""),
      symbol: String(row.symbol ?? "").toUpperCase(),
      posSide: sideValue(row.posSide),
      takeProfit: row.takeProfit ? finiteNumber(row.takeProfit) : null,
      stopLoss: row.stopLoss ? finiteNumber(row.stopLoss) : null,
      createdAt: timestampIso(row.createdTime),
    }))
    .filter((row) => row.orderId && row.symbol);
}
