import "server-only";

import { createHash, createHmac } from "crypto";

const BASE_URL = "https://api.bitget.com";
const PRODUCT_TYPE = "USDT-FUTURES";

export type BitgetSupportedSymbol = "BTCUSDT" | "ETHUSDT" | "HYPEUSDT";

export type BitgetContractConfig = {
  symbol: BitgetSupportedSymbol;
  available: boolean;
  minTradeNum: number;
  sizeMultiplier: number;
  volumePlace: number;
  symbolStatus: string;
};

export type BitgetDemoEnvironment = {
  configured: boolean;
  executionAllowed: boolean;
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
  assets?: BitgetUtaAssetRow[];
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

  const response = await fetchWithTimeout(url, {
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
      "User-Agent": "MoonX-Bitget-UTA-Demo/1.0",
    },
    body: input.method === "POST" ? body : undefined,
  });

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

export async function testBitgetDemoConnection(): Promise<{
  availableUsdt: number;
  equityUsdt: number;
  apiMode: "UTA_V3";
  accountMode: string;
  accountLevel: string;
  holdMode: string;
  symbols: BitgetContractConfig[];
}> {
  const [account, settings] = await Promise.all([
    signedRequest<BitgetUtaAssets>({
      method: "GET",
      path: "/api/v3/account/assets",
    }),
    getUtaSettings(),
  ]);

  const usdt = account.assets?.find(
    (row) => String(row.coin ?? "").toUpperCase() === "USDT"
  );

  const symbols = await Promise.all(
    (["BTCUSDT", "ETHUSDT", "HYPEUSDT"] as BitgetSupportedSymbol[]).map(
      getContractConfig
    )
  );

  return {
    availableUsdt: Number(usdt?.available ?? usdt?.balance ?? 0),
    equityUsdt: Number(
      account.usdtEquity ??
        usdt?.equity ??
        usdt?.balance ??
        account.accountEquity ??
        0
    ),
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
      sizeMultiplier: Number(row.quantityMultiplier ?? 0),
      volumePlace: Number(row.quantityPrecision ?? 8),
      symbolStatus: status,
    };
  } catch (error) {
    return {
      symbol,
      available: false,
      minTradeNum: 0,
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

async function findOrderByClientOid(
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

  const existing = await findOrderByClientOid(oid);
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
    const afterError = await findOrderByClientOid(oid);
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
