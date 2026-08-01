import "server-only";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  getBitgetDemoEnvironment,
  placeBitgetDemoMarketOrder,
  testBitgetDemoConnection,
  type BitgetSupportedSymbol,
} from "@/lib/bitget/demo-client";
import { ensureTradingV2Tables } from "@/lib/trading-signals/v2-store";

export type BitgetMirrorSettings = {
  enabled: boolean;
  startedAt: string | null;
  updatedAt: string;
};

export type BitgetMirrorLog = {
  id: string;
  paperOrderId: string;
  signalId: string;
  symbol: string;
  bitgetSymbol: string;
  action: string;
  side: string;
  quantity: number;
  bitgetSize: string | null;
  status: "SUCCESS" | "ERROR" | "SKIPPED";
  bitgetOrderId: string | null;
  clientOid: string | null;
  message: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

type DbSettings = {
  enabled: boolean;
  started_at: Date | string | null;
  updated_at: Date | string;
};

type DbLog = {
  id: string;
  paper_order_id: string;
  signal_id: string;
  symbol: string;
  bitget_symbol: string;
  action: string;
  side: string;
  quantity: number;
  bitget_size: string | null;
  status: "SUCCESS" | "ERROR" | "SKIPPED";
  bitget_order_id: string | null;
  client_oid: string | null;
  message: string;
  attempts: number;
  created_at: Date | string;
  updated_at: Date | string;
};

type PendingPaperOrder = {
  id: string;
  signal_id: string;
  order_type: string;
  side: string;
  quantity: number;
  symbol: string;
  asset_name: string;
  direction: string;
  created_at: Date | string;
  mirror_status: string | null;
  attempts: number | null;
};

function iso(value: Date | string | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function mapSettings(row: DbSettings | undefined): BitgetMirrorSettings {
  return {
    enabled: Boolean(row?.enabled),
    startedAt: iso(row?.started_at ?? null),
    updatedAt: iso(row?.updated_at ?? new Date()) ?? new Date().toISOString(),
  };
}

function mapLog(row: DbLog): BitgetMirrorLog {
  return {
    id: row.id,
    paperOrderId: row.paper_order_id,
    signalId: row.signal_id,
    symbol: row.symbol,
    bitgetSymbol: row.bitget_symbol,
    action: row.action,
    side: row.side,
    quantity: Number(row.quantity),
    bitgetSize: row.bitget_size,
    status: row.status,
    bitgetOrderId: row.bitget_order_id,
    clientOid: row.client_oid,
    message: row.message,
    attempts: Number(row.attempts),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

let ensured = false;
export async function ensureBitgetDemoTables(): Promise<boolean> {
  if (!(await ensureTradingV2Tables()) || !prisma) return false;
  if (ensured) return true;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_bitget_demo_settings (
        id TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        started_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO trade_bitget_demo_settings (id, enabled)
      VALUES ('default', FALSE)
      ON CONFLICT (id) DO NOTHING
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_bitget_demo_mirrors (
        id TEXT PRIMARY KEY,
        paper_order_id TEXT NOT NULL UNIQUE,
        signal_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        bitget_symbol TEXT NOT NULL,
        action TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity DOUBLE PRECISION NOT NULL,
        bitget_size TEXT,
        status TEXT NOT NULL,
        bitget_order_id TEXT,
        client_oid TEXT,
        message TEXT NOT NULL DEFAULT '',
        attempts INTEGER NOT NULL DEFAULT 0,
        request_json JSONB,
        response_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_bitget_demo_mirrors_status_idx
      ON trade_bitget_demo_mirrors(status, updated_at DESC)
    `);
    ensured = true;
    return true;
  } catch (error) {
    console.error("Bitget demo tables unavailable", error);
    return false;
  }
}

export async function getBitgetMirrorSettings(): Promise<BitgetMirrorSettings> {
  if (!(await ensureBitgetDemoTables()) || !prisma) return mapSettings(undefined);
  const rows = await prisma.$queryRawUnsafe<DbSettings[]>(
    `SELECT enabled, started_at, updated_at
     FROM trade_bitget_demo_settings WHERE id = 'default' LIMIT 1`
  );
  return mapSettings(rows[0]);
}

export async function setBitgetMirrorEnabled(
  enabled: boolean
): Promise<BitgetMirrorSettings> {
  if (!(await ensureBitgetDemoTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }
  const env = getBitgetDemoEnvironment();
  if (enabled) {
    if (!env.configured) throw new Error("Bitget Demo密钥尚未配置完整");
    if (!env.executionAllowed) {
      throw new Error("BITGET_DEMO_EXECUTION_ALLOWED尚未设为true");
    }
    await testBitgetDemoConnection();
  }
  await prisma.$executeRaw`
    UPDATE trade_bitget_demo_settings SET
      enabled = ${enabled},
      started_at = CASE
        WHEN ${enabled} = TRUE AND enabled = FALSE THEN NOW()
        ELSE started_at
      END,
      updated_at = NOW()
    WHERE id = 'default'
  `;
  return getBitgetMirrorSettings();
}

function mapBitgetSymbol(symbol: string): BitgetSupportedSymbol | null {
  const normalized = symbol.trim().toUpperCase().replace(/[-_/]/g, "");
  if (normalized === "BTC" || normalized === "BTCUSDT") return "BTCUSDT";
  if (normalized === "ETH" || normalized === "ETHUSDT") return "ETHUSDT";
  if (normalized === "HYPE" || normalized === "HYPEUSDT") return "HYPEUSDT";
  return null;
}

function bitgetSide(side: string): "buy" | "sell" {
  return side === "BUY" || side === "BUY_TO_COVER" ? "buy" : "sell";
}

async function pendingOrders(startedAt: string): Promise<PendingPaperOrder[]> {
  if (!prisma) return [];
  return prisma.$queryRawUnsafe<PendingPaperOrder[]>(
    `SELECT
       o.id, o.signal_id, o.order_type, o.side, o.quantity,
       p.symbol, p.asset_name, p.direction, o.created_at,
       m.status AS mirror_status, m.attempts
     FROM trade_paper_orders o
     JOIN trade_paper_positions p ON p.id = o.position_id
     LEFT JOIN trade_bitget_demo_mirrors m ON m.paper_order_id = o.id
     WHERE o.status = 'FILLED'
       AND o.created_at >= $1::timestamptz
       AND (
         m.id IS NULL OR
         (m.status = 'ERROR' AND m.attempts < 3 AND m.updated_at < NOW() - INTERVAL '2 minutes')
       )
     ORDER BY o.created_at ASC
     LIMIT 30`,
    startedAt
  );
}

async function saveMirrorAttempt(input: {
  order: PendingPaperOrder;
  bitgetSymbol: string;
  status: "SUCCESS" | "ERROR" | "SKIPPED";
  bitgetSize?: string | null;
  bitgetOrderId?: string | null;
  clientOid?: string | null;
  message: string;
  requestJson?: unknown;
  responseJson?: unknown;
}): Promise<void> {
  if (!prisma) return;
  const id = `bg_${randomUUID()}`;
  await prisma.$executeRaw`
    INSERT INTO trade_bitget_demo_mirrors (
      id, paper_order_id, signal_id, symbol, bitget_symbol,
      action, side, quantity, bitget_size, status,
      bitget_order_id, client_oid, message, attempts,
      request_json, response_json, created_at, updated_at
    ) VALUES (
      ${id}, ${input.order.id}, ${input.order.signal_id}, ${input.order.symbol},
      ${input.bitgetSymbol}, ${input.order.order_type}, ${input.order.side},
      ${Number(input.order.quantity)}, ${input.bitgetSize ?? null}, ${input.status},
      ${input.bitgetOrderId ?? null}, ${input.clientOid ?? null}, ${input.message},
      1, ${input.requestJson ? JSON.stringify(input.requestJson) : null}::jsonb,
      ${input.responseJson ? JSON.stringify(input.responseJson) : null}::jsonb,
      NOW(), NOW()
    )
    ON CONFLICT (paper_order_id) DO UPDATE SET
      bitget_symbol = EXCLUDED.bitget_symbol,
      bitget_size = EXCLUDED.bitget_size,
      status = EXCLUDED.status,
      bitget_order_id = EXCLUDED.bitget_order_id,
      client_oid = EXCLUDED.client_oid,
      message = EXCLUDED.message,
      attempts = trade_bitget_demo_mirrors.attempts + 1,
      request_json = EXCLUDED.request_json,
      response_json = EXCLUDED.response_json,
      updated_at = NOW()
  `;
}

export async function syncBitgetDemoOrders(): Promise<{
  enabled: boolean;
  processed: number;
  success: number;
  skipped: number;
  errors: number;
  messages: string[];
}> {
  const settings = await getBitgetMirrorSettings();
  if (!settings.enabled || !settings.startedAt) {
    return {
      enabled: false,
      processed: 0,
      success: 0,
      skipped: 0,
      errors: 0,
      messages: ["Bitget Demo镜像尚未开启"],
    };
  }
  const orders = await pendingOrders(settings.startedAt);
  let success = 0;
  let skipped = 0;
  let errors = 0;
  const messages: string[] = [];

  for (const order of orders) {
    const symbol = mapBitgetSymbol(order.symbol);
    if (!symbol) {
      skipped += 1;
      const message = `${order.symbol}不在BTC/ETH/HYPE支持范围内`;
      await saveMirrorAttempt({
        order,
        bitgetSymbol: "UNSUPPORTED",
        status: "SKIPPED",
        message,
      });
      messages.push(message);
      continue;
    }
    const reduceOnly = order.order_type !== "ENTRY";
    const side = bitgetSide(order.side);
    try {
      const result = await placeBitgetDemoMarketOrder({
        paperOrderId: order.id,
        symbol,
        quantity: Number(order.quantity),
        side,
        reduceOnly,
      });
      success += 1;
      const message = `${symbol} ${order.order_type} 已发送至Bitget Demo`;
      await saveMirrorAttempt({
        order,
        bitgetSymbol: symbol,
        status: "SUCCESS",
        bitgetSize: result.size,
        bitgetOrderId: result.orderId,
        clientOid: result.clientOid,
        message: result.warnings.length
          ? `${message}；${result.warnings.join("；")}`
          : message,
        requestJson: { side, reduceOnly, quantity: order.quantity },
        responseJson: result.raw,
      });
      messages.push(message);
    } catch (error) {
      errors += 1;
      const message = `${symbol} ${order.order_type}：${
        error instanceof Error ? error.message : "下单失败"
      }`;
      await saveMirrorAttempt({
        order,
        bitgetSymbol: symbol,
        status: "ERROR",
        message,
        requestJson: { side, reduceOnly, quantity: order.quantity },
      });
      messages.push(message);
    }
  }

  return {
    enabled: true,
    processed: orders.length,
    success,
    skipped,
    errors,
    messages,
  };
}

export async function listBitgetMirrorLogs(limit = 50): Promise<BitgetMirrorLog[]> {
  if (!(await ensureBitgetDemoTables()) || !prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbLog[]>(
    `SELECT * FROM trade_bitget_demo_mirrors
     ORDER BY updated_at DESC LIMIT $1`,
    Math.max(1, Math.min(200, limit))
  );
  return rows.map(mapLog);
}

export async function getBitgetDemoDashboard() {
  const environment = getBitgetDemoEnvironment();
  const settings = await getBitgetMirrorSettings();
  const logs = await listBitgetMirrorLogs();
  return { environment, settings, logs };
}
