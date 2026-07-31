import "server-only";

import { createHmac } from "crypto";
import type { TradeSignalRecord } from "@/types/trading-signal";
import { toTradeSignalApiPayload } from "@/lib/trading-signals/payload";

export type PaperExecutionProvider = "WEBHOOK" | "ALPACA_PAPER" | "OKX_DEMO";

export interface PaperExecutionResult {
  ok: boolean;
  provider: PaperExecutionProvider;
  externalOrderId: string | null;
  response: Record<string, unknown>;
}

function orderSide(signal: TradeSignalRecord): "buy" | "sell" {
  return signal.direction === "SHORT" ? "sell" : "buy";
}

export async function sendGenericPaperWebhook(signal: TradeSignalRecord): Promise<PaperExecutionResult> {
  const url = process.env.MOONX_EXECUTION_WEBHOOK_URL?.trim();
  if (!url) throw new Error("未配置 MOONX_EXECUTION_WEBHOOK_URL");
  const secret = process.env.MOONX_EXECUTION_WEBHOOK_SECRET?.trim() ?? "";
  const payload = {
    mode: "paper",
    action: "submit_signal",
    ...toTradeSignalApiPayload(signal),
  };
  const raw = JSON.stringify(payload);
  const signature = secret ? createHmac("sha256", secret).update(raw).digest("hex") : "";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MoonX-Signature": signature,
      "X-MoonX-Mode": "paper",
    },
    body: raw,
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({ statusText: response.statusText }))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Webhook执行失败：${response.status}`);
  return {
    ok: true,
    provider: "WEBHOOK",
    externalOrderId: typeof body.orderId === "string" ? body.orderId : null,
    response: body,
  };
}

export async function submitAlpacaPaperOrder(signal: TradeSignalRecord): Promise<PaperExecutionResult> {
  const key = process.env.ALPACA_PAPER_API_KEY?.trim();
  const secret = process.env.ALPACA_PAPER_SECRET_KEY?.trim();
  if (!key || !secret) throw new Error("未配置 Alpaca Paper API Key");
  if (!signal.quantity && !signal.notionalAmount) throw new Error("信号缺少模拟下单数量或金额");

  const body: Record<string, unknown> = {
    symbol: signal.symbol,
    side: orderSide(signal),
    type: signal.entryMode === "MARKET" ? "market" : "limit",
    time_in_force: signal.market.toLowerCase().includes("crypto") ? "gtc" : "day",
  };
  if (signal.quantity) body.qty = String(signal.quantity);
  else if (signal.notionalAmount) body.notional = String(signal.notionalAmount);
  if (body.type === "limit") {
    const price = signal.triggerPrice ?? signal.entryHigh ?? signal.entryLow;
    if (!price) throw new Error("限价信号缺少触发价或入场价");
    body.limit_price = String(price);
  }

  const response = await fetch("https://paper-api.alpaca.markets/v2/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({ statusText: response.statusText }))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Alpaca模拟下单失败：${response.status}`);
  return {
    ok: true,
    provider: "ALPACA_PAPER",
    externalOrderId: typeof json.id === "string" ? json.id : null,
    response: json,
  };
}

function okxSignature(timestamp: string, method: string, path: string, body: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}${method}${path}${body}`).digest("base64");
}

export async function submitOkxDemoOrder(signal: TradeSignalRecord): Promise<PaperExecutionResult> {
  const apiKey = process.env.OKX_DEMO_API_KEY?.trim();
  const secret = process.env.OKX_DEMO_SECRET_KEY?.trim();
  const passphrase = process.env.OKX_DEMO_PASSPHRASE?.trim();
  if (!apiKey || !secret || !passphrase) throw new Error("未配置 OKX Demo API Key");
  if (!signal.quantity) throw new Error("OKX模拟信号缺少下单数量");

  const path = "/api/v5/trade/order";
  const bodyObject = {
    instId: signal.symbol,
    tdMode: "cash",
    side: orderSide(signal),
    ordType: signal.entryMode === "MARKET" ? "market" : "limit",
    sz: String(signal.quantity),
    ...(signal.entryMode === "MARKET"
      ? {}
      : { px: String(signal.triggerPrice ?? signal.entryHigh ?? signal.entryLow ?? "") }),
  };
  if (bodyObject.ordType === "limit" && !bodyObject.px) throw new Error("OKX限价信号缺少价格");
  const body = JSON.stringify(bodyObject);
  const timestamp = new Date().toISOString();
  const response = await fetch(`https://www.okx.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": okxSignature(timestamp, "POST", path, body, secret),
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
      "x-simulated-trading": "1",
    },
    body,
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({ statusText: response.statusText }))) as Record<string, unknown>;
  if (!response.ok || (typeof json.code === "string" && json.code !== "0")) {
    throw new Error(`OKX模拟下单失败：${String(json.msg ?? response.status)}`);
  }
  const data = Array.isArray(json.data) ? (json.data[0] as Record<string, unknown> | undefined) : undefined;
  return {
    ok: true,
    provider: "OKX_DEMO",
    externalOrderId: typeof data?.ordId === "string" ? data.ordId : null,
    response: json,
  };
}

export async function executePaperSignal(
  signal: TradeSignalRecord,
  provider: PaperExecutionProvider
): Promise<PaperExecutionResult> {
  if (!signal.paperOnly) throw new Error("当前版本只允许模拟盘信号");
  if (provider === "ALPACA_PAPER") return submitAlpacaPaperOrder(signal);
  if (provider === "OKX_DEMO") return submitOkxDemoOrder(signal);
  return sendGenericPaperWebhook(signal);
}
