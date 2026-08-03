import "server-only";

import { createHash, createHmac } from "crypto";

const BASE_URL = "https://api.bitget.com";
const PRODUCT_TYPE = "USDT-FUTURES";

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

export type BitgetDemoEnvironment = {
  configured: boolean;
  executionAllowed: boolean;
  testOrderAllowed: boolean;
  apiKeyMasked: string;
  leverage: number;
};

type BitgetEnvelope<T> = {
  code?: string;
  msg?: string;
  requestTime?: number;
  data?: T;
};

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

type BitgetOrderResponse = {
  orderId?: string;
  clientOid?: string;
};

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

function credentials() {
  return {
    apiKey: process.env.BITGET_DEMO_API_KEY?.trim() ?? "",
    secretKey: process.env.BITGET_DEMO_SECRET_KEY?.trim() ?? "",
    passphrase: process.env.BITGET_DEMO_PASSPHRASE?.trim() ?? "",
  };
}

export function getBitgetDemoEnvironment(): BitgetDemoEnvironment {
  const env = credentials();
  const configured = Boolean(env.apiKey && env.secretKey && env.passphrase);
  const leverageRaw = Number(process.env.BITGET_DEMO_LEVERAGE ?? 1);
  const leverage = Number.isFinite(leverageRaw)
    ? Math.max(1, Math.min(3, Math.floor(leverageRaw)))
    : 1;
  return {
    configured,
    executionAllowed:
      process.env.BITGET_DEMO_EXECUTION_ALLOWED?.toLowerCase() === "true",
    testOrderAllowed:
      process.env.BITGET_DEMO_TEST_ORDER_ALLOWED?.toLowerCase() === "true",
    apiKeyMasked: env.apiKey
      ? `${env.apiKey.slice(0, 4)}••••${env.apiKey.slice(-4)}`
      : "未配置",
    leverage,
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

export async function getBitgetDemoMarketQuotes(
  symbols: BitgetSupportedSymbol[]
): Promise<BitgetDemoMarketQuote[]> {
  const requested = new Set(symbols.map((symbol) => symbol.toUpperCase()));
  if (!requested.size) return [];
  const response = await fetchWithTimeout(
    `${BASE_URL}/api/v3/market/tickers?category=${encodeURIComponent(PRODUCT_TYPE)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MoonX-Bitget-Demo-Runtime/1.0",
      },
    },
    10_000
  );
  const raw = await response.text();
  let payload: BitgetPublicTickerEnvelope;
  try {
    payload = JSON.parse(raw) as BitgetPublicTickerEnvelope;
  } catch {
    throw new Error(`Bitget公开行情返回非JSON内容（HTTP ${response.status}）`);
  }
  if (!response.ok || payload.code !== "00000" || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || `Bitget公开行情HTTP ${response.status}`);
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
  const response = await fetchWithTimeout(
    `${BASE_URL}/api/v3/market/candles?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MoonX-Three-Horizon/1.0",
      },
    },
    10_000
  );
  const raw = await response.text();
  let payload: BitgetEnvelope<string[][]>;
  try {
    payload = JSON.parse(raw) as BitgetEnvelope<string[][]>;
  } catch {
    throw new Error(`Bitget ${input.symbol} ${input.interval} K线返回非JSON内容（HTTP ${response.status}）`);
  }
  if (!response.ok || payload.code !== "00000" || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || `Bitget K线HTTP ${response.status}`);
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

async function signedRequest<T>(input: {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
}): Promise<T> {
  const env = credentials();
  if (!env.apiKey || !env.secretKey || !env.passphrase) {
    throw new Error("Bitget Demo环境变量尚未配置完整");
  }

  const timestamp = String(Date.now());
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

  const requestInit: RequestInit = {
    method: input.method,
    headers: {
      "ACCESS-KEY": env.apiKey,
      "ACCESS-SIGN": sign,
      "ACCESS-TIMESTAMP": timestamp,
      "ACCESS-PASSPHRASE": env.passphrase,
      "Content-Type": "application/json",
      Accept: "application/json",
      locale: "zh-CN",
      paptrading: "1",
      "User-Agent": "MoonX-Bitget-UTA-Demo/1.1",
    },
  };
  if (input.method === "POST") requestInit.body = body;

  const response = await fetchWithTimeout(url, requestInit);

  const raw = await response.text();
  let envelope: BitgetEnvelope<T>;
  try {
    envelope = JSON.parse(raw) as BitgetEnvelope<T>;
  } catch {
    throw new Error(`Bitget返回非JSON内容（HTTP ${response.status}）`);
  }

  if (!response.ok || envelope.code !== "00000") {
    throw new Error(
      `Bitget ${envelope.code ?? response.status}: ${
        envelope.msg ?? "请求失败"
      }`
    );
  }

  return envelope.data as T;
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

  const symbols = await Promise.all(
    (["BTCUSDT", "ETHUSDT", "HYPEUSDT"] as BitgetSupportedSymbol[]).map(
      getContractConfig
    )
  );

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
        symbolStatus: "UTA V3模拟盘未返回该合约",
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
  if (!contract.available) throw new Error(`${contract.symbol}模拟盘暂不支持`);

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

export async function getBitgetDemoOrderByClientOid(
  oid: string
): Promise<BitgetOrderResponse | null> {
  try {
    return await signedRequest<BitgetOrderResponse>({
      method: "GET",
      path: "/api/v3/trade/order-info",
      query: { clientOid: oid },
    });
  } catch {
    return null;
  }
}

function inferHedgePositionSide(input: {
  side: "buy" | "sell";
  reduceOnly: boolean;
}): "long" | "short" {
  if (!input.reduceOnly) return input.side === "buy" ? "long" : "short";
  return input.side === "sell" ? "long" : "short";
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
  if (!env.executionAllowed) {
    throw new Error("BITGET_DEMO_EXECUTION_ALLOWED尚未设为true");
  }

  const [contract, settings] = await Promise.all([
    getContractConfig(input.symbol),
    getUtaSettings(),
  ]);
  const size = normalizeOrderSize(input.quantity, contract);
  const warnings = input.reduceOnly
    ? []
    : await configureUtaSymbol(input.symbol);
  const oid = clientOid(input.paperOrderId);

  const existing = await getBitgetDemoOrderByClientOid(oid);
  if (existing?.orderId) {
    return {
      orderId: existing.orderId,
      clientOid: existing.clientOid ?? oid,
      size,
      warnings: [...warnings, "检测到相同clientOid，未重复下单"],
      raw: existing,
    };
  }

  const hedgeMode = settings.holdMode === "hedge_mode";
  const body: Record<string, unknown> = {
    category: PRODUCT_TYPE,
    symbol: input.symbol,
    qty: size,
    side: input.side,
    orderType: "market",
    clientOid: oid,
    reduceOnly: input.reduceOnly ? "yes" : "no",
    marginMode: "isolated",
  };

  if (!input.reduceOnly && input.stopLoss && input.stopLoss > 0) {
    body.stopLoss = input.stopLoss.toFixed(8).replace(/\.?0+$/, "");
    body.slTriggerBy = "mark";
    body.slOrderType = "market";
  }
  if (!input.reduceOnly && input.takeProfit && input.takeProfit > 0) {
    body.takeProfit = input.takeProfit.toFixed(8).replace(/\.?0+$/, "");
    body.tpTriggerBy = "mark";
    body.tpOrderType = "market";
  }

  if (hedgeMode) {
    body.posSide = inferHedgePositionSide(input);
  }

  try {
    const response = await signedRequest<BitgetOrderResponse>({
      method: "POST",
      path: "/api/v3/trade/place-order",
      body,
    });

    if (!response?.orderId) throw new Error("Bitget未返回orderId");

    return {
      orderId: response.orderId,
      clientOid: response.clientOid ?? oid,
      size,
      warnings,
      raw: response,
    };
  } catch (error) {
    const afterError = await getBitgetDemoOrderByClientOid(oid);
    if (afterError?.orderId) {
      return {
        orderId: afterError.orderId,
        clientOid: afterError.clientOid ?? oid,
        size,
        warnings: [...warnings, "下单响应异常，但已按clientOid查询到订单"],
        raw: afterError,
      };
    }
    throw error;
  }
}


export async function placeBitgetDemoProtectionOrder(input: {
  paperOrderId: string;
  symbol: BitgetSupportedSymbol;
  posSide: "long" | "short";
  stopLoss: number;
  takeProfit: number;
}): Promise<{ orderId: string; clientOid: string }> {
  const env = getBitgetDemoEnvironment();
  if (!env.executionAllowed) {
    throw new Error("BITGET_DEMO_EXECUTION_ALLOWED尚未设为true");
  }
  const oid = clientOid(`${input.paperOrderId}:protection`);
  const existing = (await getBitgetDemoPendingStrategyOrders()).find(
    (row) => row.clientOid === oid
  );
  if (existing?.orderId) {
    return { orderId: existing.orderId, clientOid: oid };
  }
  const response = await signedRequest<BitgetOrderResponse>({
    method: "POST",
    path: "/api/v3/trade/place-strategy-order",
    body: {
      category: PRODUCT_TYPE,
      symbol: input.symbol,
      type: "tpsl",
      tpslMode: "full",
      posSide: input.posSide,
      stopLoss: input.stopLoss.toFixed(2),
      takeProfit: input.takeProfit.toFixed(2),
      slTriggerBy: "mark",
      tpTriggerBy: "mark",
      slOrderType: "market",
      tpOrderType: "market",
      clientOid: oid,
    },
  });
  if (!response?.orderId) throw new Error("Bitget未返回止盈止损orderId");
  return { orderId: response.orderId, clientOid: response.clientOid ?? oid };
}

export async function cancelBitgetDemoStrategyOrder(input: {
  orderId?: string;
  clientOid?: string;
}): Promise<void> {
  if (!input.orderId && !input.clientOid) {
    throw new Error("取消策略订单必须提供orderId或clientOid");
  }
  await signedRequest<null>({
    method: "POST",
    path: "/api/v3/trade/cancel-strategy-order",
    body: {
      ...(input.orderId ? { orderId: input.orderId } : {}),
      ...(input.clientOid ? { clientOid: input.clientOid } : {}),
    },
  });
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
  netProfit: number;
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
    netProfit?: string;
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
      netProfit: finiteNumber(row.netProfit),
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
