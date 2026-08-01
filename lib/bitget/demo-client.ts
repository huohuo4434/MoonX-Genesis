import "server-only";

import { createHash, createHmac } from "crypto";

const BASE_URL = "https://api.bitget.com";
const PRODUCT_TYPE = "USDT-FUTURES";
const MARGIN_COIN = "USDT";

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

type BitgetAccountRow = {
  marginCoin?: string;
  available?: string;
  accountEquity?: string;
  equity?: string;
  unrealizedPL?: string;
};

type BitgetContractRow = {
  symbol?: string;
  minTradeNum?: string;
  sizeMultiplier?: string;
  volumePlace?: string;
  symbolStatus?: string;
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
      "User-Agent": "MoonX-Bitget-Demo/1.0",
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

export async function testBitgetDemoConnection(): Promise<{
  availableUsdt: number;
  equityUsdt: number;
  symbols: BitgetContractConfig[];
}> {
  const accounts = await signedRequest<BitgetAccountRow[]>({
    method: "GET",
    path: "/api/v2/mix/account/accounts",
    query: { productType: PRODUCT_TYPE },
  });
  const usdt = accounts.find(
    (row) => String(row.marginCoin ?? "").toUpperCase() === "USDT"
  );
  const symbols = await Promise.all(
    (["BTCUSDT", "ETHUSDT", "HYPEUSDT"] as BitgetSupportedSymbol[]).map(
      getContractConfig
    )
  );
  return {
    availableUsdt: Number(usdt?.available ?? 0),
    equityUsdt: Number(usdt?.accountEquity ?? usdt?.equity ?? 0),
    symbols,
  };
}

export async function getContractConfig(
  symbol: BitgetSupportedSymbol
): Promise<BitgetContractConfig> {
  try {
    const rows = await signedRequest<BitgetContractRow[]>({
      method: "GET",
      path: "/api/v2/mix/market/contracts",
      query: { productType: PRODUCT_TYPE, symbol },
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
        symbolStatus: "missing",
      };
    }
    return {
      symbol,
      available: true,
      minTradeNum: Number(row.minTradeNum ?? 0),
      sizeMultiplier: Number(row.sizeMultiplier ?? 0),
      volumePlace: Number(row.volumePlace ?? 8),
      symbolStatus: String(row.symbolStatus ?? "unknown"),
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
  const step = contract.sizeMultiplier > 0 ? contract.sizeMultiplier : 10 ** -contract.volumePlace;
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

async function safeConfigureSymbol(symbol: BitgetSupportedSymbol): Promise<string[]> {
  const warnings: string[] = [];
  const env = getBitgetDemoEnvironment();
  const calls: Array<{ label: string; path: string; body: Record<string, unknown> }> = [
    {
      label: "单向持仓",
      path: "/api/v2/mix/account/set-position-mode",
      body: { productType: PRODUCT_TYPE, posMode: "one_way_mode" },
    },
    {
      label: "逐仓",
      path: "/api/v2/mix/account/set-margin-mode",
      body: {
        symbol,
        productType: PRODUCT_TYPE,
        marginCoin: MARGIN_COIN,
        marginMode: "isolated",
      },
    },
    {
      label: `${env.leverage}倍杠杆`,
      path: "/api/v2/mix/account/set-leverage",
      body: {
        symbol,
        productType: PRODUCT_TYPE,
        marginCoin: MARGIN_COIN,
        leverage: String(env.leverage),
      },
    },
  ];
  for (const call of calls) {
    try {
      await signedRequest<unknown>({
        method: "POST",
        path: call.path,
        body: call.body,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "配置失败";
      if (/already|same|无需|一致|重复/i.test(message)) continue;
      warnings.push(`${call.label}：${message}`);
    }
  }
  return warnings;
}

function clientOid(paperOrderId: string): string {
  const hash = createHash("sha256").update(paperOrderId).digest("hex").slice(0, 22);
  return `mx${hash}`;
}

async function findOrderByClientOid(
  symbol: BitgetSupportedSymbol,
  oid: string
): Promise<BitgetOrderResponse | null> {
  try {
    return await signedRequest<BitgetOrderResponse>({
      method: "GET",
      path: "/api/v2/mix/order/detail",
      query: {
        symbol,
        productType: PRODUCT_TYPE,
        clientOid: oid,
      },
    });
  } catch {
    return null;
  }
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
  const contract = await getContractConfig(input.symbol);
  const size = normalizeOrderSize(input.quantity, contract);
  const warnings = input.reduceOnly ? [] : await safeConfigureSymbol(input.symbol);
  const oid = clientOid(input.paperOrderId);

  const existing = await findOrderByClientOid(input.symbol, oid);
  if (existing?.orderId) {
    return {
      orderId: existing.orderId,
      clientOid: existing.clientOid ?? oid,
      size,
      warnings: [...warnings, "检测到相同clientOid，已复用原订单，未重复下单"],
      raw: existing,
    };
  }

  try {
    const response = await signedRequest<BitgetOrderResponse>({
      method: "POST",
      path: "/api/v2/mix/order/place-order",
      body: {
        symbol: input.symbol,
        productType: PRODUCT_TYPE,
        marginMode: "isolated",
        marginCoin: MARGIN_COIN,
        size,
        side: input.side,
        orderType: "market",
        force: "gtc",
        clientOid: oid,
        reduceOnly: input.reduceOnly ? "YES" : "NO",
      },
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
    const afterError = await findOrderByClientOid(input.symbol, oid);
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
