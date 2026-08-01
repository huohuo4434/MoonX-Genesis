import "server-only";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  ensureTradeSignalTables,
  getTradeSignalById,
  getTradeSignalDashboardSnapshot,
  createTradeSignal,
} from "@/lib/trading-signals/store";
import { buildAdminFullCycleSnapshot } from "@/lib/admin/full-cycle-control";
import { calculatePositionSizing } from "@/lib/trading-signals/risk-engine";
import type {
  TradeSignalDirection,
  TradeSignalEntryMode,
  TradeSignalRecord,
} from "@/types/trading-signal";
import type {
  ForecastDraftGenerationResult,
  MonitorResult,
  PaperEquitySnapshot,
  PaperOrder,
  PaperPosition,
  PaperTradingAccount,
  SignalAlertSeverity,
  TradePlanReadiness,
  TradeRiskSettings,
  TradeSignalAction,
  TradeSignalAlert,
  TradingV2Snapshot,
} from "@/types/trading-v2";
import type {
  AdminCycleAsset,
  AdminCycleForecastRow,
  AdminKeyDateRecord,
  AdminPriceZone,
} from "@/types/admin-full-cycle";

type DbRisk = {
  id: string;
  risk_per_trade_pct: number;
  max_position_pct: number;
  star_1_position_pct: number;
  star_2_position_pct: number;
  star_3_position_pct: number;
  star_4_position_pct: number;
  star_5_position_pct: number;
  daily_loss_stop_pct: number;
  max_consecutive_losses: number;
  breakeven_after_target1: boolean;
  target1_close_pct: number;
  target2_close_pct: number;
  updated_at: Date | string;
};

type DbAccount = {
  id: string;
  name: string;
  base_currency: string;
  initial_cash: number;
  cash_balance: number;
  realized_pnl: number;
  unrealized_pnl: number;
  current_equity: number;
  peak_equity: number;
  max_drawdown_pct: number;
  consecutive_losses: number;
  paused: boolean;
  pause_reason: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbPosition = {
  id: string;
  account_id: string;
  signal_id: string;
  symbol: string;
  asset_name: string;
  direction: TradeSignalDirection;
  status: "OPEN" | "PARTIAL" | "CLOSED";
  original_quantity: number;
  remaining_quantity: number;
  average_entry_price: number;
  current_price: number;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  target_3: number | null;
  realized_pnl: number;
  unrealized_pnl: number;
  opened_at: Date | string;
  closed_at: Date | string | null;
  updated_at: Date | string;
};

type DbOrder = {
  id: string;
  account_id: string;
  signal_id: string;
  position_id: string | null;
  order_type: string;
  side: string;
  status: "FILLED" | "CANCELLED";
  quantity: number;
  price: number;
  notional: number;
  note: string;
  created_at: Date | string;
  filled_at: Date | string | null;
};

type DbEquity = {
  id: string;
  account_id: string;
  equity: number;
  cash: number;
  realized_pnl: number;
  unrealized_pnl: number;
  drawdown_pct: number;
  captured_at: Date | string;
};

type DbAlert = {
  id: string;
  signal_id: string;
  alert_type: string;
  severity: SignalAlertSeverity;
  price: number | null;
  message: string;
  action_required: string;
  resolved: boolean;
  created_at: Date | string;
  resolved_at: Date | string | null;
};

function iso(value: Date | string | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

let v2Ensured = false;

export async function ensureTradingV2Tables(): Promise<boolean> {
  if (!(await ensureTradeSignalTables()) || !prisma) return false;
  if (v2Ensured) return true;

  const statements = [
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS auto_draft_key TEXT`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS draft_source TEXT`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS revision_of_id TEXT`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS revision_reason TEXT`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS last_price DOUBLE PRECISION`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS entered_at TIMESTAMPTZ`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS target1_hit_at TIMESTAMPTZ`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS target2_hit_at TIMESTAMPTZ`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS target3_hit_at TIMESTAMPTZ`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ`,
    `ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ`,
    `CREATE UNIQUE INDEX IF NOT EXISTS trade_signals_auto_draft_key_idx
       ON trade_signals(auto_draft_key) WHERE auto_draft_key IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS trade_risk_settings (
      id TEXT PRIMARY KEY,
      risk_per_trade_pct DOUBLE PRECISION NOT NULL DEFAULT 1,
      max_position_pct DOUBLE PRECISION NOT NULL DEFAULT 20,
      star_1_position_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
      star_2_position_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
      star_3_position_pct DOUBLE PRECISION NOT NULL DEFAULT 5,
      star_4_position_pct DOUBLE PRECISION NOT NULL DEFAULT 12,
      star_5_position_pct DOUBLE PRECISION NOT NULL DEFAULT 20,
      daily_loss_stop_pct DOUBLE PRECISION NOT NULL DEFAULT 3,
      max_consecutive_losses INTEGER NOT NULL DEFAULT 3,
      breakeven_after_target1 BOOLEAN NOT NULL DEFAULT TRUE,
      target1_close_pct DOUBLE PRECISION NOT NULL DEFAULT 50,
      target2_close_pct DOUBLE PRECISION NOT NULL DEFAULT 25,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS trade_paper_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_currency TEXT NOT NULL DEFAULT 'USD',
      initial_cash DOUBLE PRECISION NOT NULL,
      cash_balance DOUBLE PRECISION NOT NULL,
      realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
      unrealized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
      current_equity DOUBLE PRECISION NOT NULL,
      peak_equity DOUBLE PRECISION NOT NULL,
      max_drawdown_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
      consecutive_losses INTEGER NOT NULL DEFAULT 0,
      paused BOOLEAN NOT NULL DEFAULT FALSE,
      pause_reason TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS trade_paper_positions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES trade_paper_accounts(id) ON DELETE CASCADE,
      signal_id TEXT NOT NULL UNIQUE REFERENCES trade_signals(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      original_quantity DOUBLE PRECISION NOT NULL,
      remaining_quantity DOUBLE PRECISION NOT NULL,
      average_entry_price DOUBLE PRECISION NOT NULL,
      current_price DOUBLE PRECISION NOT NULL,
      stop_loss DOUBLE PRECISION,
      target_1 DOUBLE PRECISION,
      target_2 DOUBLE PRECISION,
      target_3 DOUBLE PRECISION,
      realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
      unrealized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS trade_paper_positions_status_idx
       ON trade_paper_positions(status, updated_at DESC)`,
    `CREATE TABLE IF NOT EXISTS trade_paper_orders (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES trade_paper_accounts(id) ON DELETE CASCADE,
      signal_id TEXT NOT NULL REFERENCES trade_signals(id) ON DELETE CASCADE,
      position_id TEXT REFERENCES trade_paper_positions(id) ON DELETE SET NULL,
      order_type TEXT NOT NULL,
      side TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'FILLED',
      quantity DOUBLE PRECISION NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      notional DOUBLE PRECISION NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      filled_at TIMESTAMPTZ
    )`,
    `CREATE INDEX IF NOT EXISTS trade_paper_orders_signal_idx
       ON trade_paper_orders(signal_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS trade_paper_equity_snapshots (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES trade_paper_accounts(id) ON DELETE CASCADE,
      equity DOUBLE PRECISION NOT NULL,
      cash DOUBLE PRECISION NOT NULL,
      realized_pnl DOUBLE PRECISION NOT NULL,
      unrealized_pnl DOUBLE PRECISION NOT NULL,
      drawdown_pct DOUBLE PRECISION NOT NULL,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS trade_paper_equity_time_idx
       ON trade_paper_equity_snapshots(account_id, captured_at DESC)`,
    `CREATE TABLE IF NOT EXISTS trade_signal_alerts (
      id TEXT PRIMARY KEY,
      signal_id TEXT NOT NULL REFERENCES trade_signals(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'INFO',
      price DOUBLE PRECISION,
      message TEXT NOT NULL,
      action_required TEXT NOT NULL DEFAULT '',
      resolved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )`,
    `CREATE INDEX IF NOT EXISTS trade_signal_alerts_open_idx
       ON trade_signal_alerts(resolved, created_at DESC)`,
  ];

  try {
    for (const statement of statements) await prisma.$executeRawUnsafe(statement);
    await prisma.$executeRawUnsafe(
      `INSERT INTO trade_risk_settings (id) VALUES ('default')
       ON CONFLICT (id) DO NOTHING`
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO trade_paper_accounts (
         id, name, base_currency, initial_cash, cash_balance,
         current_equity, peak_equity
       ) VALUES ('default', 'MoonX模拟账户', 'USD', 100000, 100000, 100000, 100000)
       ON CONFLICT (id) DO NOTHING`
    );
    v2Ensured = true;
    return true;
  } catch (error) {
    console.error("trading v2 tables unavailable", error);
    return false;
  }
}

function mapRisk(row: DbRisk): TradeRiskSettings {
  return {
    id: row.id,
    riskPerTradePct: Number(row.risk_per_trade_pct),
    maxPositionPct: Number(row.max_position_pct),
    star1PositionPct: Number(row.star_1_position_pct),
    star2PositionPct: Number(row.star_2_position_pct),
    star3PositionPct: Number(row.star_3_position_pct),
    star4PositionPct: Number(row.star_4_position_pct),
    star5PositionPct: Number(row.star_5_position_pct),
    dailyLossStopPct: Number(row.daily_loss_stop_pct),
    maxConsecutiveLosses: Number(row.max_consecutive_losses),
    breakevenAfterTarget1: row.breakeven_after_target1,
    target1ClosePct: Number(row.target1_close_pct),
    target2ClosePct: Number(row.target2_close_pct),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapAccount(row: DbAccount): PaperTradingAccount {
  return {
    id: row.id,
    name: row.name,
    baseCurrency: row.base_currency,
    initialCash: Number(row.initial_cash),
    cashBalance: Number(row.cash_balance),
    realizedPnl: Number(row.realized_pnl),
    unrealizedPnl: Number(row.unrealized_pnl),
    currentEquity: Number(row.current_equity),
    peakEquity: Number(row.peak_equity),
    maxDrawdownPct: Number(row.max_drawdown_pct),
    consecutiveLosses: Number(row.consecutive_losses),
    paused: row.paused,
    pauseReason: row.pause_reason,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapPosition(row: DbPosition): PaperPosition {
  return {
    id: row.id,
    accountId: row.account_id,
    signalId: row.signal_id,
    symbol: row.symbol,
    assetName: row.asset_name,
    direction: row.direction,
    status: row.status,
    originalQuantity: Number(row.original_quantity),
    remainingQuantity: Number(row.remaining_quantity),
    averageEntryPrice: Number(row.average_entry_price),
    currentPrice: Number(row.current_price),
    stopLoss: row.stop_loss == null ? null : Number(row.stop_loss),
    target1: row.target_1 == null ? null : Number(row.target_1),
    target2: row.target_2 == null ? null : Number(row.target_2),
    target3: row.target_3 == null ? null : Number(row.target_3),
    realizedPnl: Number(row.realized_pnl),
    unrealizedPnl: Number(row.unrealized_pnl),
    openedAt: iso(row.opened_at) ?? new Date().toISOString(),
    closedAt: iso(row.closed_at),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapOrder(row: DbOrder): PaperOrder {
  return {
    id: row.id,
    accountId: row.account_id,
    signalId: row.signal_id,
    positionId: row.position_id,
    orderType: row.order_type,
    side: row.side,
    status: row.status,
    quantity: Number(row.quantity),
    price: Number(row.price),
    notional: Number(row.notional),
    note: row.note,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    filledAt: iso(row.filled_at),
  };
}

function mapEquity(row: DbEquity): PaperEquitySnapshot {
  return {
    id: row.id,
    accountId: row.account_id,
    equity: Number(row.equity),
    cash: Number(row.cash),
    realizedPnl: Number(row.realized_pnl),
    unrealizedPnl: Number(row.unrealized_pnl),
    drawdownPct: Number(row.drawdown_pct),
    capturedAt: iso(row.captured_at) ?? new Date().toISOString(),
  };
}

function mapAlert(row: DbAlert): TradeSignalAlert {
  return {
    id: row.id,
    signalId: row.signal_id,
    alertType: row.alert_type,
    severity: row.severity,
    price: row.price == null ? null : Number(row.price),
    message: row.message,
    actionRequired: row.action_required,
    resolved: row.resolved,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    resolvedAt: iso(row.resolved_at),
  };
}

export async function getRiskSettings(): Promise<TradeRiskSettings> {
  if (!(await ensureTradingV2Tables()) || !prisma) throw new Error("交易数据库未连接");
  const rows = await prisma.$queryRawUnsafe<DbRisk[]>(
    `SELECT * FROM trade_risk_settings WHERE id = 'default' LIMIT 1`
  );
  if (!rows[0]) throw new Error("风险设置不存在");
  return mapRisk(rows[0]);
}

export async function updateRiskSettings(
  input: Omit<TradeRiskSettings, "id" | "updatedAt">
): Promise<TradeRiskSettings> {
  if (!(await ensureTradingV2Tables()) || !prisma) throw new Error("交易数据库未连接");
  await prisma.$executeRaw`
    UPDATE trade_risk_settings SET
      risk_per_trade_pct = ${input.riskPerTradePct},
      max_position_pct = ${input.maxPositionPct},
      star_1_position_pct = ${input.star1PositionPct},
      star_2_position_pct = ${input.star2PositionPct},
      star_3_position_pct = ${input.star3PositionPct},
      star_4_position_pct = ${input.star4PositionPct},
      star_5_position_pct = ${input.star5PositionPct},
      daily_loss_stop_pct = ${input.dailyLossStopPct},
      max_consecutive_losses = ${input.maxConsecutiveLosses},
      breakeven_after_target1 = ${input.breakevenAfterTarget1},
      target1_close_pct = ${input.target1ClosePct},
      target2_close_pct = ${input.target2ClosePct},
      updated_at = NOW()
    WHERE id = 'default'
  `;
  return getRiskSettings();
}

export async function getPaperAccount(): Promise<PaperTradingAccount> {
  if (!(await ensureTradingV2Tables()) || !prisma) throw new Error("交易数据库未连接");
  const rows = await prisma.$queryRawUnsafe<DbAccount[]>(
    `SELECT * FROM trade_paper_accounts WHERE id = 'default' LIMIT 1`
  );
  if (!rows[0]) throw new Error("模拟账户不存在");
  return mapAccount(rows[0]);
}

export async function updatePaperInitialCash(initialCash: number): Promise<PaperTradingAccount> {
  if (!(await ensureTradingV2Tables()) || !prisma) throw new Error("交易数据库未连接");
  const open = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM trade_paper_positions`
  );
  if (Number(open[0]?.count ?? 0) > 0) throw new Error("已经产生模拟交易记录，不能修改初始资金");
  await prisma.$executeRaw`
    UPDATE trade_paper_accounts SET
      initial_cash = ${initialCash},
      cash_balance = ${initialCash},
      realized_pnl = 0,
      unrealized_pnl = 0,
      current_equity = ${initialCash},
      peak_equity = ${initialCash},
      max_drawdown_pct = 0,
      consecutive_losses = 0,
      paused = FALSE,
      pause_reason = '',
      updated_at = NOW()
    WHERE id = 'default'
  `;
  await prisma.$executeRawUnsafe(`DELETE FROM trade_paper_equity_snapshots WHERE account_id = 'default'`);
  await snapshotEquity();
  return getPaperAccount();
}

async function listPositions(limit = 200): Promise<PaperPosition[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbPosition[]>(
    `SELECT * FROM trade_paper_positions ORDER BY updated_at DESC LIMIT ${Math.min(limit, 1000)}`
  );
  return rows.map(mapPosition);
}

async function listOrders(limit = 200): Promise<PaperOrder[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbOrder[]>(
    `SELECT * FROM trade_paper_orders ORDER BY created_at DESC LIMIT ${Math.min(limit, 1000)}`
  );
  return rows.map(mapOrder);
}

async function listEquity(limit = 160): Promise<PaperEquitySnapshot[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbEquity[]>(
    `SELECT * FROM trade_paper_equity_snapshots
     WHERE account_id = 'default' ORDER BY captured_at DESC LIMIT ${Math.min(limit, 1000)}`
  );
  return rows.reverse().map(mapEquity);
}

async function listAlerts(limit = 100): Promise<TradeSignalAlert[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbAlert[]>(
    `SELECT * FROM trade_signal_alerts ORDER BY created_at DESC LIMIT ${Math.min(limit, 1000)}`
  );
  return rows.map(mapAlert);
}

function pnlFor(
  direction: TradeSignalDirection,
  entry: number,
  exit: number,
  quantity: number
): number {
  const multiplier = direction === "SHORT" ? -1 : 1;
  return (exit - entry) * quantity * multiplier;
}

async function refreshAccountAndSnapshot(): Promise<PaperTradingAccount> {
  if (!prisma) throw new Error("交易数据库未连接");
  const totals = await prisma.$queryRawUnsafe<Array<{ unrealized: number | null }>>(
    `SELECT COALESCE(SUM(unrealized_pnl), 0) AS unrealized
     FROM trade_paper_positions WHERE status <> 'CLOSED'`
  );
  const account = await getPaperAccount();
  const unrealized = Number(totals[0]?.unrealized ?? 0);
  const equity = account.initialCash + account.realizedPnl + unrealized;
  const peak = Math.max(account.peakEquity, equity);
  const drawdown = peak > 0 ? Math.max(0, ((peak - equity) / peak) * 100) : 0;
  await prisma.$executeRaw`
    UPDATE trade_paper_accounts SET
      cash_balance = ${account.initialCash + account.realizedPnl},
      unrealized_pnl = ${unrealized},
      current_equity = ${equity},
      peak_equity = ${peak},
      max_drawdown_pct = GREATEST(max_drawdown_pct, ${drawdown}),
      updated_at = NOW()
    WHERE id = 'default'
  `;
  await snapshotEquity();
  return getPaperAccount();
}

async function snapshotEquity(): Promise<void> {
  if (!prisma) return;
  const rows = await prisma.$queryRawUnsafe<DbAccount[]>(
    `SELECT * FROM trade_paper_accounts WHERE id = 'default' LIMIT 1`
  );
  const account = rows[0];
  if (!account) return;
  const drawdown =
    Number(account.peak_equity) > 0
      ? Math.max(
          0,
          ((Number(account.peak_equity) - Number(account.current_equity)) /
            Number(account.peak_equity)) *
            100
        )
      : 0;
  await prisma.$executeRaw`
    INSERT INTO trade_paper_equity_snapshots (
      id, account_id, equity, cash, realized_pnl, unrealized_pnl,
      drawdown_pct, captured_at
    ) VALUES (
      ${`eq_${randomUUID()}`}, 'default', ${Number(account.current_equity)},
      ${Number(account.cash_balance)}, ${Number(account.realized_pnl)},
      ${Number(account.unrealized_pnl)}, ${drawdown}, NOW()
    )
  `;
}

export function validateTradePlan(signal: TradeSignalRecord): TradePlanReadiness {
  const missing: string[] = [];
  if (signal.direction === "NEUTRAL") missing.push("明确做多或做空方向");
  if (
    signal.entryMode !== "MARKET" &&
    signal.triggerPrice == null &&
    (signal.entryLow == null || signal.entryHigh == null)
  ) {
    missing.push("入场区间或触发价");
  }
  if (signal.stopLoss == null) missing.push("止损价");
  if (signal.target1 == null) missing.push("至少一个止盈目标");
  if (!signal.invalidation.trim() || signal.invalidation.includes("尚未录入")) {
    missing.push("明确失效条件");
  }
  if (signal.validUntil && new Date(signal.validUntil).getTime() < Date.now()) {
    missing.push("有效期已结束");
  }
  return { ready: missing.length === 0, missing };
}

function parseDirection(text: string): TradeSignalDirection {
  if (/下跌|偏弱|走弱|回落|下行|先涨后跌|冲高回落|低位/.test(text)) return "SHORT";
  if (/上涨|偏强|走强|反弹|修复|震荡上行|先跌后涨/.test(text)) return "LONG";
  return "NEUTRAL";
}

function extractRange(text: string): [number, number] | null {
  const matches = text
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!matches?.length) return null;
  if (matches.length === 1) return [matches[0]!, matches[0]!];
  const pair = matches.slice(-2);
  return [Math.min(pair[0]!, pair[1]!), Math.max(pair[0]!, pair[1]!)];
}

function pickZone(
  zones: AdminPriceZone[],
  direction: TradeSignalDirection
): {
  entryMode: TradeSignalEntryMode;
  entryLow: number | null;
  entryHigh: number | null;
  triggerPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  target3: number | null;
  invalidation: string;
  evidence: string;
} {
  const zone = [...zones]
    .filter((item) => item.enabled)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!zone) {
    return {
      entryMode: "MANUAL",
      entryLow: null,
      entryHigh: null,
      triggerPrice: null,
      stopLoss: null,
      target1: null,
      target2: null,
      target3: null,
      invalidation: "尚未录入明确失效条件，不能进入等待触发状态。",
      evidence: "尚未录入支撑压力区。",
    };
  }

  const supports = zone.supportLevels.map(extractRange).filter(Boolean) as [number, number][];
  const resistances = zone.resistanceLevels.map(extractRange).filter(Boolean) as [number, number][];

  if (direction === "LONG" && supports[0]) {
    const entry = supports[0];
    const firstResistance = resistances[0] ?? null;
    const secondResistance = resistances[1] ?? null;
    return {
      entryMode: "BUY_ZONE",
      entryLow: entry[0],
      entryHigh: entry[1],
      triggerPrice: firstResistance?.[1] ?? null,
      stopLoss: entry[0],
      target1: firstResistance?.[0] ?? null,
      target2: firstResistance?.[1] ?? null,
      target3: secondResistance?.[1] ?? null,
      invalidation:
        zone.invalidation ||
        `${zone.timeframe}收盘确认跌破支撑区下沿 ${entry[0]}，原做多判断失效。`,
      evidence: `支撑：${zone.supportLevels.join("；")}；压力：${zone.resistanceLevels.join("；") || "未录入"}`,
    };
  }

  if (direction === "SHORT" && resistances[0]) {
    const entry = resistances[0];
    const firstSupport = supports[0] ?? null;
    const secondSupport = supports[1] ?? null;
    return {
      entryMode: "PULLBACK",
      entryLow: entry[0],
      entryHigh: entry[1],
      triggerPrice: firstSupport?.[0] ?? null,
      stopLoss: entry[1],
      target1: firstSupport?.[1] ?? null,
      target2: firstSupport?.[0] ?? null,
      target3: secondSupport?.[0] ?? null,
      invalidation:
        zone.invalidation ||
        `${zone.timeframe}收盘确认突破压力区上沿 ${entry[1]}，原做空判断失效。`,
      evidence: `压力：${zone.resistanceLevels.join("；")}；支撑：${zone.supportLevels.join("；") || "未录入"}`,
    };
  }

  return {
    entryMode: "MANUAL",
    entryLow: null,
    entryHigh: null,
    triggerPrice: null,
    stopLoss: null,
    target1: null,
    target2: null,
    target3: null,
    invalidation: zone.invalidation || "尚未形成可执行价位。",
    evidence: "已有区间，但与当前方向无法形成完整入场、止损和止盈计划。",
  };
}

function confidenceFromLabel(label: string): number {
  const pct = label.match(/(\d{1,3})(?:\.\d+)?%/)?.[1];
  if (pct) return Math.min(100, Math.max(0, Number(pct)));
  if (/高|强/.test(label)) return 75;
  if (/中/.test(label)) return 60;
  if (/低|不确定/.test(label)) return 40;
  return 55;
}

function dateTime(dateKey: string, end = false): string {
  return `${dateKey}T${end ? "23:59:59" : "00:00:00"}+08:00`;
}

function keyDateEvidence(
  dates: AdminKeyDateRecord[],
  forecast: AdminCycleForecastRow,
  direction: TradeSignalDirection
): { confidence: number; evidence: string } | null {
  const related = dates.filter(
    (item) =>
      item.enabled &&
      item.assetId === forecast.assetId &&
      item.date >= forecast.periodStart &&
      item.date <= forecast.periodEnd
  );
  if (!related.length) return null;
  const sameDirection = related.filter((item) => parseDirection(`${item.effect}${item.label}`) === direction);
  return {
    confidence: sameDirection.length ? 70 : 50,
    evidence: related
      .map((item) => `${item.date}${item.ganzhi ? `（${item.ganzhi}）` : ""}：${item.label}`)
      .join("；"),
  };
}

function marketLabel(asset: AdminCycleAsset): string {
  if (asset.market === "crypto") return "CRYPTO";
  if (asset.market === "us") return "US_STOCK";
  if (asset.market === "cn") return "CN_STOCK";
  if (asset.market === "hk") return "HK_STOCK";
  if (asset.market === "commodity") return "COMMODITY";
  return "STOCK";
}

async function autoDraftExists(key: string): Promise<boolean> {
  if (!prisma) return false;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM trade_signals WHERE auto_draft_key = $1 LIMIT 1`,
    key
  );
  return Boolean(rows[0]);
}

export async function generateForecastSignalDrafts(
  createdBy: string | null
): Promise<ForecastDraftGenerationResult> {
  if (!(await ensureTradingV2Tables()) || !prisma) throw new Error("交易数据库未连接");
  const snapshot = await buildAdminFullCycleSnapshot();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const selected: AdminCycleForecastRow[] = [];
  for (const asset of snapshot.assets) {
    const allowed =
      asset.assetClass === "CORE" ? new Set(["DAY", "WEEK"]) : new Set(["WEEK"]);
    const candidates = snapshot.forecasts
      .filter(
        (row) =>
          row.assetId === asset.id &&
          allowed.has(row.horizon) &&
          row.periodEnd >= today
      )
      .sort((a, b) => `${a.periodStart}:${a.horizon}`.localeCompare(`${b.periodStart}:${b.horizon}`));
    const day = candidates.find((row) => row.horizon === "DAY");
    const week = candidates.find((row) => row.horizon === "WEEK");
    if (day) selected.push(day);
    if (week) selected.push(week);
  }

  const result: ForecastDraftGenerationResult = {
    created: 0,
    existing: 0,
    skipped: 0,
    details: [],
  };

  for (const forecast of selected) {
    const asset = snapshot.assets.find((item) => item.id === forecast.assetId);
    if (!asset) continue;
    const direction = parseDirection(`${forecast.direction} ${forecast.path}`);
    if (direction === "NEUTRAL") {
      result.skipped += 1;
      result.details.push({
        assetId: asset.id,
        forecastId: forecast.id,
        result: "SKIPPED",
        reason: "方向不确定，仅保留预测，不生成交易草稿。",
      });
      continue;
    }

    const key = `forecast:${forecast.id}:v${forecast.version ?? 0}`;
    if (await autoDraftExists(key)) {
      result.existing += 1;
      result.details.push({
        assetId: asset.id,
        forecastId: forecast.id,
        result: "EXISTS",
        reason: "该版本预测已经生成过草稿。",
      });
      continue;
    }

    const zones = snapshot.priceZones.filter((item) => item.assetId === asset.id);
    const zone = pickZone(zones, direction);
    const keyEvidence = keyDateEvidence(snapshot.keyDates, forecast, direction);
    const sourceConfidence = confidenceFromLabel(forecast.probabilityLabel);
    const hasCompleteLevels =
      zone.stopLoss != null &&
      zone.target1 != null &&
      (zone.triggerPrice != null || (zone.entryLow != null && zone.entryHigh != null));
    const starLevel = Math.min(5, 3 + (hasCompleteLevels ? 1 : 0) + (keyEvidence?.confidence === 70 ? 1 : 0));
    const consensusScore = Math.min(
      90,
      Math.round(sourceConfidence * 0.65 + (hasCompleteLevels ? 20 : 5) + (keyEvidence ? 10 : 0))
    );

    const methods = [
      {
        method: forecast.sourceLabel.includes("六爻") || forecast.status.includes("六爻") ? "六爻" : "原始预测",
        direction,
        weight: 30,
        confidence: sourceConfidence,
        evidence: `${forecast.sourceLabel}；${forecast.direction}；${forecast.path}`,
      },
      {
        method: "技术结构",
        direction: hasCompleteLevels ? direction : ("NEUTRAL" as TradeSignalDirection),
        weight: 25,
        confidence: hasCompleteLevels ? 70 : 30,
        evidence: zone.evidence,
      },
    ];
    if (keyEvidence) {
      methods.push({
        method: "奇门／关键日",
        direction: keyEvidence.confidence >= 70 ? direction : ("NEUTRAL" as TradeSignalDirection),
        weight: 10,
        confidence: keyEvidence.confidence,
        evidence: keyEvidence.evidence,
      });
    }

    const signal = await createTradeSignal({
      assetId: asset.id,
      symbol: asset.symbol,
      assetName: asset.name,
      market: marketLabel(asset),
      timeframe: forecast.horizon === "DAY" ? "1D" : forecast.horizon === "WEEK" ? "1W" : "1M",
      direction,
      status: "DRAFT",
      starLevel,
      consensusScore,
      entryMode: zone.entryMode,
      entryLow: zone.entryLow,
      entryHigh: zone.entryHigh,
      triggerPrice: zone.triggerPrice,
      stopLoss: zone.stopLoss,
      stopConfirmTimeframe: forecast.horizon === "DAY" ? "4H" : "1D",
      target1: zone.target1,
      target2: zone.target2,
      target3: zone.target3,
      quantity: null,
      notionalAmount: null,
      positionSizePct: null,
      maxRiskPct: null,
      validFrom: dateTime(forecast.periodStart),
      validUntil: dateTime(forecast.periodEnd, true),
      rationale: `来源：${forecast.sourceLabel}。方向：${forecast.direction}。路径：${forecast.path}`,
      executionPlan: hasCompleteLevels
        ? `按支撑压力计划等待触发；达到目标1减仓，剩余仓位止损移至成本附近。`
        : `当前只有方向草稿。管理员补齐入场、止损和止盈后，才能进入等待触发。`,
      invalidation: zone.invalidation,
      sourceForecastId: forecast.id,
      apiVisible: false,
      paperOnly: true,
      createdBy,
      methods,
    });
    await prisma.$executeRaw`
      UPDATE trade_signals SET
        auto_draft_key = ${key},
        draft_source = 'FORECAST_AUTO',
        updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    result.created += 1;
    result.details.push({
      assetId: asset.id,
      forecastId: forecast.id,
      result: "CREATED",
      reason: hasCompleteLevels ? "已生成完整草稿，等待管理员审核。" : "已生成方向草稿，仍需补齐价位。",
    });
  }

  return result;
}

export async function updateSignalDraftPlan(
  signalId: string,
  input: {
    entryMode: TradeSignalEntryMode;
    entryLow: number | null;
    entryHigh: number | null;
    triggerPrice: number | null;
    stopLoss: number | null;
    stopConfirmTimeframe: string;
    target1: number | null;
    target2: number | null;
    target3: number | null;
    starLevel: number;
    consensusScore: number;
    validFrom: string;
    validUntil: string | null;
    rationale: string;
    executionPlan: string;
    invalidation: string;
  },
  revisionReason: string
): Promise<{ signalId: string; revised: boolean }> {
  if (!(await ensureTradingV2Tables()) || !prisma) throw new Error("交易数据库未连接");
  const signal = await getTradeSignalById(signalId);
  if (!signal) throw new Error("信号不存在");

  if (signal.status === "DRAFT") {
    await prisma.$executeRaw`
      UPDATE trade_signals SET
        entry_mode = ${input.entryMode},
        entry_low = ${input.entryLow},
        entry_high = ${input.entryHigh},
        trigger_price = ${input.triggerPrice},
        stop_loss = ${input.stopLoss},
        stop_confirm_timeframe = ${input.stopConfirmTimeframe},
        target_1 = ${input.target1},
        target_2 = ${input.target2},
        target_3 = ${input.target3},
        star_level = ${input.starLevel},
        consensus_score = ${input.consensusScore},
        valid_from = ${new Date(input.validFrom)},
        valid_until = ${input.validUntil ? new Date(input.validUntil) : null},
        rationale = ${input.rationale},
        execution_plan = ${input.executionPlan},
        invalidation = ${input.invalidation},
        updated_at = NOW()
      WHERE id = ${signalId}
    `;
    return { signalId, revised: false };
  }

  const newId = `sig_${randomUUID()}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_signals (
      id, asset_id, symbol, asset_name, market, timeframe, direction, status,
      star_level, consensus_score, entry_mode, entry_low, entry_high, trigger_price,
      stop_loss, stop_confirm_timeframe, target_1, target_2, target_3,
      quantity, notional_amount, position_size_pct, max_risk_pct,
      valid_from, valid_until, rationale, execution_plan, invalidation,
      source_forecast_id, api_visible, paper_only, version,
      revision_of_id, revision_reason, draft_source, created_by, created_at, updated_at
    )
    SELECT
      $1, asset_id, symbol, asset_name, market, timeframe, direction, 'DRAFT',
      $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12,
      NULL, NULL, NULL, NULL,
      $13::timestamptz, $14::timestamptz, $15, $16, $17,
      source_forecast_id, FALSE, TRUE, version + 1,
      id, $18, 'REVISION', created_by, NOW(), NOW()
    FROM trade_signals WHERE id = $19`,
    newId,
    input.starLevel,
    input.consensusScore,
    input.entryMode,
    input.entryLow,
    input.entryHigh,
    input.triggerPrice,
    input.stopLoss,
    input.stopConfirmTimeframe,
    input.target1,
    input.target2,
    input.target3,
    input.validFrom,
    input.validUntil,
    input.rationale,
    input.executionPlan,
    input.invalidation,
    revisionReason,
    signalId
  );
  const methodRows = await prisma.$queryRawUnsafe<
    Array<{
      method: string;
      direction: TradeSignalDirection;
      weight: number;
      confidence: number;
      evidence: string;
    }>
  >(
    `SELECT method, direction, weight, confidence, evidence
     FROM trade_signal_methods WHERE signal_id = $1 ORDER BY created_at ASC`,
    signalId
  );
  for (const method of methodRows) {
    await prisma.$executeRaw`
      INSERT INTO trade_signal_methods (
        id, signal_id, method, direction, weight, confidence, evidence, created_at
      ) VALUES (
        ${`sm_${randomUUID()}`}, ${newId}, ${method.method}, ${method.direction},
        ${Number(method.weight)}, ${Number(method.confidence)}, ${method.evidence}, NOW()
      )
    `;
  }
  return { signalId: newId, revised: true };
}

async function addEvent(
  signalId: string,
  eventType: string,
  price: number | null,
  quantity: number | null,
  note: string,
  payload?: unknown
): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRaw`
    INSERT INTO trade_signal_events (
      id, signal_id, event_type, provider, price, quantity,
      payload, note, occurred_at, created_at
    ) VALUES (
      ${`se_${randomUUID()}`}, ${signalId}, ${eventType}, 'MOONX_V2',
      ${price}, ${quantity}, ${payload ? JSON.stringify(payload) : null}::jsonb,
      ${note}, NOW(), NOW()
    )
  `;
}

async function addAlert(input: {
  signalId: string;
  alertType: string;
  severity: SignalAlertSeverity;
  price: number | null;
  message: string;
  actionRequired: string;
}): Promise<void> {
  if (!prisma) return;
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM trade_signal_alerts
     WHERE signal_id = $1 AND alert_type = $2 AND resolved = FALSE LIMIT 1`,
    input.signalId,
    input.alertType
  );
  if (existing[0]) return;
  await prisma.$executeRaw`
    INSERT INTO trade_signal_alerts (
      id, signal_id, alert_type, severity, price, message,
      action_required, resolved, created_at
    ) VALUES (
      ${`alert_${randomUUID()}`}, ${input.signalId}, ${input.alertType},
      ${input.severity}, ${input.price}, ${input.message},
      ${input.actionRequired}, FALSE, NOW()
    )
  `;
}

async function resolveAlerts(signalId: string, alertType?: string): Promise<void> {
  if (!prisma) return;
  if (alertType) {
    await prisma.$executeRawUnsafe(
      `UPDATE trade_signal_alerts SET resolved = TRUE, resolved_at = NOW()
       WHERE signal_id = $1 AND alert_type = $2 AND resolved = FALSE`,
      signalId,
      alertType
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE trade_signal_alerts SET resolved = TRUE, resolved_at = NOW()
       WHERE signal_id = $1 AND resolved = FALSE`,
      signalId
    );
  }
}

async function getOpenPosition(signalId: string): Promise<PaperPosition | null> {
  if (!prisma) return null;
  const rows = await prisma.$queryRawUnsafe<DbPosition[]>(
    `SELECT * FROM trade_paper_positions
     WHERE signal_id = $1 AND status <> 'CLOSED' LIMIT 1`,
    signalId
  );
  return rows[0] ? mapPosition(rows[0]) : null;
}

async function enterPaperPosition(
  signal: TradeSignalRecord,
  entryPrice: number
): Promise<PaperPosition> {
  if (!prisma) throw new Error("交易数据库未连接");
  const account = await getPaperAccount();
  const settings = await getRiskSettings();
  if (account.paused) throw new Error(`模拟账户已暂停：${account.pauseReason || "风控触发"}`);
  if (account.consecutiveLosses >= settings.maxConsecutiveLosses) {
    await prisma.$executeRaw`
      UPDATE trade_paper_accounts SET paused = TRUE,
        pause_reason = ${`连续亏损达到 ${account.consecutiveLosses} 次`},
        updated_at = NOW() WHERE id = 'default'
    `;
    throw new Error("连续亏损达到上限，已暂停新开仓");
  }
  if (signal.stopLoss == null) throw new Error("未设置止损，禁止入场");

  const dailyRows = await prisma.$queryRawUnsafe<Array<{ realized: number | null }>>(
    `SELECT COALESCE(SUM((payload->>'realized')::double precision), 0) AS realized
     FROM trade_signal_events
     WHERE event_type IN ('TARGET1','TARGET2','TARGET3','STOP','MANUAL_CLOSE')
       AND occurred_at >= date_trunc('day', NOW())`
  );
  const dailyRealized = Number(dailyRows[0]?.realized ?? 0);
  const dailyLossLimit = account.initialCash * (settings.dailyLossStopPct / 100);
  if (dailyRealized <= -dailyLossLimit) {
    await prisma.$executeRaw`
      UPDATE trade_paper_accounts SET paused = TRUE,
        pause_reason = ${`当日亏损达到 ${settings.dailyLossStopPct}% 风控线`},
        updated_at = NOW() WHERE id = 'default'
    `;
    throw new Error("当日亏损达到风控线，已暂停新开仓");
  }

  const plan = calculatePositionSizing({
    equity: account.currentEquity,
    direction: signal.direction,
    starLevel: signal.starLevel,
    entryPrice,
    stopLoss: signal.stopLoss,
    settings,
  });
  if (!plan.allowed) throw new Error(plan.reason);

  const manualQuantity =
    signal.quantity ??
    (signal.notionalAmount && signal.notionalAmount > 0
      ? signal.notionalAmount / entryPrice
      : null);
  const quantity = manualQuantity
    ? Math.min(manualQuantity, plan.quantity)
    : plan.quantity;
  if (quantity <= 0) throw new Error("计算仓位为0，禁止入场");

  const positionId = `pos_${randomUUID()}`;
  const notional = quantity * entryPrice;
  await prisma.$executeRaw`
    INSERT INTO trade_paper_positions (
      id, account_id, signal_id, symbol, asset_name, direction, status,
      original_quantity, remaining_quantity, average_entry_price, current_price,
      stop_loss, target_1, target_2, target_3, realized_pnl, unrealized_pnl,
      opened_at, updated_at
    ) VALUES (
      ${positionId}, 'default', ${signal.id}, ${signal.symbol}, ${signal.assetName},
      ${signal.direction}, 'OPEN', ${quantity}, ${quantity}, ${entryPrice}, ${entryPrice},
      ${signal.stopLoss}, ${signal.target1}, ${signal.target2}, ${signal.target3},
      0, 0, NOW(), NOW()
    )
  `;
  await prisma.$executeRaw`
    INSERT INTO trade_paper_orders (
      id, account_id, signal_id, position_id, order_type, side, status,
      quantity, price, notional, note, created_at, filled_at
    ) VALUES (
      ${`ord_${randomUUID()}`}, 'default', ${signal.id}, ${positionId},
      'ENTRY', ${signal.direction === "SHORT" ? "SELL_SHORT" : "BUY"}, 'FILLED',
      ${quantity}, ${entryPrice}, ${notional}, ${plan.reason}, NOW(), NOW()
    )
  `;
  await prisma.$executeRaw`
    UPDATE trade_signals SET
      status = 'ACTIVE',
      quantity = ${quantity},
      notional_amount = ${notional},
      position_size_pct = ${Math.round(plan.positionSizePct)},
      max_risk_pct = ${(plan.riskBudget / account.currentEquity) * 100},
      triggered_at = COALESCE(triggered_at, NOW()),
      entered_at = NOW(),
      last_price = ${entryPrice},
      last_checked_at = NOW(),
      updated_at = NOW()
    WHERE id = ${signal.id}
  `;
  await addEvent(signal.id, "PAPER_ENTRY", entryPrice, quantity, plan.reason, plan);
  await resolveAlerts(signal.id);
  await refreshAccountAndSnapshot();
  const position = await getOpenPosition(signal.id);
  if (!position) throw new Error("模拟持仓创建失败");
  return position;
}

async function markPosition(signalId: string, price: number): Promise<void> {
  if (!prisma) return;
  const position = await getOpenPosition(signalId);
  if (!position) {
    await prisma.$executeRaw`
      UPDATE trade_signals SET last_price = ${price}, last_checked_at = NOW(), updated_at = NOW()
      WHERE id = ${signalId}
    `;
    return;
  }
  const unrealized = pnlFor(
    position.direction,
    position.averageEntryPrice,
    price,
    position.remainingQuantity
  );
  await prisma.$executeRaw`
    UPDATE trade_paper_positions SET
      current_price = ${price},
      unrealized_pnl = ${unrealized},
      updated_at = NOW()
    WHERE id = ${position.id}
  `;
  await prisma.$executeRaw`
    UPDATE trade_signals SET last_price = ${price}, last_checked_at = NOW(), updated_at = NOW()
    WHERE id = ${signalId}
  `;
  await refreshAccountAndSnapshot();
}

async function closePositionQuantity(
  signal: TradeSignalRecord,
  price: number,
  quantityToClose: number,
  orderType: string,
  note: string
): Promise<{ closed: boolean; realized: number }> {
  if (!prisma) throw new Error("交易数据库未连接");
  const position = await getOpenPosition(signal.id);
  if (!position) throw new Error("没有可结算的模拟持仓");
  const quantity = Math.min(position.remainingQuantity, Math.max(0, quantityToClose));
  if (quantity <= 0) throw new Error("结算数量为0");
  const realized = pnlFor(
    position.direction,
    position.averageEntryPrice,
    price,
    quantity
  );
  const remaining = Math.max(0, position.remainingQuantity - quantity);
  const totalRealized = position.realizedPnl + realized;
  const closed = remaining <= 0.00000001;
  await prisma.$executeRaw`
    UPDATE trade_paper_positions SET
      remaining_quantity = ${remaining},
      current_price = ${price},
      realized_pnl = ${totalRealized},
      unrealized_pnl = ${closed ? 0 : pnlFor(position.direction, position.averageEntryPrice, price, remaining)},
      status = ${closed ? "CLOSED" : "PARTIAL"},
      closed_at = ${closed ? new Date() : null},
      updated_at = NOW()
    WHERE id = ${position.id}
  `;
  await prisma.$executeRaw`
    INSERT INTO trade_paper_orders (
      id, account_id, signal_id, position_id, order_type, side, status,
      quantity, price, notional, note, created_at, filled_at
    ) VALUES (
      ${`ord_${randomUUID()}`}, 'default', ${signal.id}, ${position.id},
      ${orderType}, ${position.direction === "SHORT" ? "BUY_TO_COVER" : "SELL"}, 'FILLED',
      ${quantity}, ${price}, ${quantity * price}, ${note}, NOW(), NOW()
    )
  `;
  await prisma.$executeRaw`
    UPDATE trade_paper_accounts SET
      realized_pnl = realized_pnl + ${realized},
      updated_at = NOW()
    WHERE id = 'default'
  `;
  await addEvent(signal.id, orderType, price, quantity, note, { realized });
  await refreshAccountAndSnapshot();
  return { closed, realized };
}

async function finalizeSignal(
  signal: TradeSignalRecord,
  exitPrice: number,
  finalStatus: "CLOSED" | "STOPPED",
  note: string
): Promise<void> {
  if (!prisma) return;
  const rows = await prisma.$queryRawUnsafe<DbPosition[]>(
    `SELECT * FROM trade_paper_positions WHERE signal_id = $1 LIMIT 1`,
    signal.id
  );
  const position = rows[0] ? mapPosition(rows[0]) : null;
  if (!position) return;
  const notional = position.averageEntryPrice * position.originalQuantity;
  const returnPct = notional > 0 ? (position.realizedPnl / notional) * 100 : 0;
  const verdict = returnPct > 0.01 ? "WIN" : returnPct < -0.01 ? "LOSS" : "FLAT";
  await prisma.$executeRaw`
    INSERT INTO trade_signal_results (
      id, signal_id, entry_price, exit_price, return_pct,
      max_favorable_pct, max_adverse_pct, verdict, note, closed_at, created_at
    ) VALUES (
      ${`sr_${randomUUID()}`}, ${signal.id}, ${position.averageEntryPrice},
      ${exitPrice}, ${returnPct}, NULL, NULL, ${verdict}, ${note}, NOW(), NOW()
    )
    ON CONFLICT (signal_id) DO UPDATE SET
      exit_price = EXCLUDED.exit_price,
      return_pct = EXCLUDED.return_pct,
      verdict = EXCLUDED.verdict,
      note = EXCLUDED.note,
      closed_at = EXCLUDED.closed_at
  `;
  await prisma.$executeRaw`
    UPDATE trade_signals SET
      status = ${finalStatus},
      api_visible = FALSE,
      stopped_at = ${finalStatus === "STOPPED" ? new Date() : null},
      closed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${signal.id}
  `;
  const account = await getPaperAccount();
  const nextLosses = verdict === "LOSS" ? account.consecutiveLosses + 1 : 0;
  const settings = await getRiskSettings();
  const paused = nextLosses >= settings.maxConsecutiveLosses;
  await prisma.$executeRaw`
    UPDATE trade_paper_accounts SET
      consecutive_losses = ${nextLosses},
      paused = ${paused},
      pause_reason = ${paused ? `连续亏损 ${nextLosses} 次，暂停新开仓` : ""},
      updated_at = NOW()
    WHERE id = 'default'
  `;
  await resolveAlerts(signal.id);
  await refreshAccountAndSnapshot();
}

export async function performSignalAction(input: {
  signalId: string;
  action: TradeSignalAction;
  price?: number | null;
  note?: string;
  confirmed?: boolean;
}): Promise<void> {
  if (!(await ensureTradingV2Tables()) || !prisma) throw new Error("交易数据库未连接");
  const signal = await getTradeSignalById(input.signalId);
  if (!signal) throw new Error("信号不存在");
  const price = input.price ?? null;
  const note = input.note?.trim() || input.action;

  if (input.action === "PUBLISH" || input.action === "ARM") {
    const readiness = validateTradePlan(signal);
    if (!readiness.ready) throw new Error(`计划不完整：${readiness.missing.join("、")}`);
  }

  if (input.action === "PUBLISH") {
    if (signal.status !== "DRAFT") throw new Error("只有草稿可以发布");
    await prisma.$executeRaw`
      UPDATE trade_signals SET
        status = 'PUBLISHED', api_visible = TRUE,
        published_at = NOW(), locked_at = NOW(), updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    await addEvent(signal.id, "PUBLISHED", null, null, note);
    return;
  }

  if (input.action === "ARM") {
    if (!["DRAFT", "PUBLISHED"].includes(signal.status)) throw new Error("当前状态不能进入等待触发");
    await prisma.$executeRaw`
      UPDATE trade_signals SET
        status = 'ARMED', api_visible = TRUE,
        published_at = COALESCE(published_at, NOW()),
        locked_at = COALESCE(locked_at, NOW()), updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    await addEvent(signal.id, "ARMED", null, null, note);
    return;
  }

  if (input.action === "CANCEL") {
    if (["ACTIVE", "TAKE_PROFIT", "CLOSED", "STOPPED"].includes(signal.status)) {
      throw new Error("持仓中或已结算信号不能直接取消");
    }
    await prisma.$executeRaw`
      UPDATE trade_signals SET status = 'CANCELLED', api_visible = FALSE, updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    await addEvent(signal.id, "CANCELLED", price, null, note);
    await resolveAlerts(signal.id);
    return;
  }

  if (input.action === "TRIGGER") {
    if (signal.status !== "ARMED") throw new Error("只有等待触发状态可以标记触发");
    if (price == null || price <= 0) throw new Error("请输入触发价格");
    await prisma.$executeRaw`
      UPDATE trade_signals SET
        status = 'TRIGGERED', triggered_at = NOW(),
        last_price = ${price}, last_checked_at = NOW(), updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    await addEvent(signal.id, "TRIGGERED", price, null, note);
    return;
  }

  if (input.action === "ENTER") {
    if (!["ARMED", "TRIGGERED"].includes(signal.status)) throw new Error("当前状态不能入场");
    if (price == null || price <= 0) throw new Error("请输入实际入场价");
    await enterPaperPosition(signal, price);
    return;
  }

  if (input.action === "MOVE_STOP_BREAKEVEN") {
    if (!["ACTIVE", "TAKE_PROFIT"].includes(signal.status)) throw new Error("当前没有持仓");
    const position = await getOpenPosition(signal.id);
    if (!position) throw new Error("当前没有模拟持仓");
    await prisma.$executeRaw`
      UPDATE trade_signals SET stop_loss = ${position.averageEntryPrice}, updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    await prisma.$executeRaw`
      UPDATE trade_paper_positions SET stop_loss = ${position.averageEntryPrice}, updated_at = NOW()
      WHERE id = ${position.id}
    `;
    await addEvent(signal.id, "STOP_TO_BREAKEVEN", position.averageEntryPrice, null, note);
    return;
  }

  if (!["ACTIVE", "TAKE_PROFIT"].includes(signal.status)) throw new Error("当前没有可管理的持仓");
  if (price == null || price <= 0) throw new Error("请输入成交价格");
  const position = await getOpenPosition(signal.id);
  if (!position) throw new Error("当前没有模拟持仓");
  const settings = await getRiskSettings();

  if (input.action === "TARGET1") {
    const quantity = position.originalQuantity * (settings.target1ClosePct / 100);
    await closePositionQuantity(signal, price, quantity, "TARGET1", note);
    await prisma.$executeRaw`
      UPDATE trade_signals SET
        status = 'TAKE_PROFIT', target1_hit_at = COALESCE(target1_hit_at, NOW()),
        updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    if (settings.breakevenAfterTarget1) {
      await performSignalAction({
        signalId: signal.id,
        action: "MOVE_STOP_BREAKEVEN",
        note: "目标1完成后止损自动移至成本价",
      });
    }
    return;
  }

  if (input.action === "TARGET2") {
    const quantity = position.originalQuantity * (settings.target2ClosePct / 100);
    await closePositionQuantity(signal, price, quantity, "TARGET2", note);
    await prisma.$executeRaw`
      UPDATE trade_signals SET
        status = 'TAKE_PROFIT', target2_hit_at = COALESCE(target2_hit_at, NOW()),
        updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    return;
  }

  if (input.action === "TARGET3") {
    await closePositionQuantity(signal, price, position.remainingQuantity, "TARGET3", note);
    await prisma.$executeRaw`
      UPDATE trade_signals SET target3_hit_at = COALESCE(target3_hit_at, NOW()), updated_at = NOW()
      WHERE id = ${signal.id}
    `;
    await finalizeSignal(signal, price, "CLOSED", note);
    return;
  }

  if (input.action === "STOP") {
    if (!input.confirmed && signal.stopConfirmTimeframe !== "INTRADAY") {
      await addAlert({
        signalId: signal.id,
        alertType: "STOP_CONFIRM_REQUIRED",
        severity: "CRITICAL",
        price,
        message: `价格已触及止损 ${signal.stopLoss ?? "—"}，但仍需${signal.stopConfirmTimeframe}收盘确认。`,
        actionRequired: "确认K线收盘后执行止损",
      });
      return;
    }
    await closePositionQuantity(signal, price, position.remainingQuantity, "STOP", note);
    await finalizeSignal(signal, price, "STOPPED", note);
    return;
  }

  if (input.action === "CLOSE") {
    await closePositionQuantity(signal, price, position.remainingQuantity, "MANUAL_CLOSE", note);
    await finalizeSignal(signal, price, "CLOSED", note);
  }
}

function inEntryZone(signal: TradeSignalRecord, price: number): boolean {
  if (signal.entryLow == null || signal.entryHigh == null) return false;
  return price >= Math.min(signal.entryLow, signal.entryHigh) &&
    price <= Math.max(signal.entryLow, signal.entryHigh);
}

function breakoutReached(signal: TradeSignalRecord, price: number): boolean {
  if (signal.triggerPrice == null) return false;
  return signal.direction === "SHORT"
    ? price <= signal.triggerPrice
    : price >= signal.triggerPrice;
}

function stopReached(signal: TradeSignalRecord, price: number): boolean {
  if (signal.stopLoss == null) return false;
  return signal.direction === "SHORT" ? price >= signal.stopLoss : price <= signal.stopLoss;
}

function targetReached(
  direction: TradeSignalDirection,
  target: number | null,
  price: number
): boolean {
  if (target == null) return false;
  return direction === "SHORT" ? price <= target : price >= target;
}

async function signalExtra(signalId: string): Promise<{
  target1_hit_at: Date | string | null;
  target2_hit_at: Date | string | null;
  target3_hit_at: Date | string | null;
}> {
  if (!prisma) return { target1_hit_at: null, target2_hit_at: null, target3_hit_at: null };
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      target1_hit_at: Date | string | null;
      target2_hit_at: Date | string | null;
      target3_hit_at: Date | string | null;
    }>
  >(
    `SELECT target1_hit_at, target2_hit_at, target3_hit_at
     FROM trade_signals WHERE id = $1 LIMIT 1`,
    signalId
  );
  return rows[0] ?? { target1_hit_at: null, target2_hit_at: null, target3_hit_at: null };
}

export async function monitorTradeSignal(input: {
  signalId: string;
  price: number;
  confirmed: boolean;
  execute: boolean;
}): Promise<MonitorResult> {
  if (!(await ensureTradingV2Tables())) throw new Error("交易数据库未连接");
  const signal = await getTradeSignalById(input.signalId);
  if (!signal) throw new Error("信号不存在");
  await markPosition(signal.id, input.price);

  const executedActions: TradeSignalAction[] = [];

  if (signal.status === "ARMED") {
    const reached =
      signal.entryMode === "MARKET" ||
      (signal.entryMode === "BREAKOUT"
        ? breakoutReached(signal, input.price)
        : inEntryZone(signal, input.price));
    if (!reached) {
      return {
        signalId: signal.id,
        price: input.price,
        recommendation: "NONE",
        message: "尚未进入买入区或突破触发价，继续等待。",
        executedActions,
      };
    }
    await addAlert({
      signalId: signal.id,
      alertType: "ENTRY_TRIGGER",
      severity: "WARNING",
      price: input.price,
      message: "入场条件已经满足。",
      actionRequired: "确认后建立模拟仓位",
    });
    if (input.execute) {
      await performSignalAction({
        signalId: signal.id,
        action: "ENTER",
        price: input.price,
        note: "价格监控触发模拟入场",
        confirmed: input.confirmed,
      });
      executedActions.push("ENTER");
    }
    return {
      signalId: signal.id,
      price: input.price,
      recommendation: "ENTER",
      message: input.execute ? "已按规则建立模拟仓位。" : "入场条件满足，等待管理员确认。",
      executedActions,
    };
  }

  if (!["ACTIVE", "TAKE_PROFIT"].includes(signal.status)) {
    return {
      signalId: signal.id,
      price: input.price,
      recommendation: "NONE",
      message: "当前状态不需要价格监控。",
      executedActions,
    };
  }

  if (stopReached(signal, input.price)) {
    if (!input.confirmed && signal.stopConfirmTimeframe !== "INTRADAY") {
      await addAlert({
        signalId: signal.id,
        alertType: "STOP_CONFIRM_REQUIRED",
        severity: "CRITICAL",
        price: input.price,
        message: `已触及止损，等待${signal.stopConfirmTimeframe}收盘确认。`,
        actionRequired: "确认后强制退出",
      });
      return {
        signalId: signal.id,
        price: input.price,
        recommendation: "CONFIRM_REQUIRED",
        message: `已触及止损，但需要${signal.stopConfirmTimeframe}确认。`,
        executedActions,
      };
    }
    if (input.execute) {
      await performSignalAction({
        signalId: signal.id,
        action: "STOP",
        price: input.price,
        note: "价格监控触发止损",
        confirmed: true,
      });
      executedActions.push("STOP");
    }
    return {
      signalId: signal.id,
      price: input.price,
      recommendation: "STOP",
      message: input.execute ? "已按纪律止损退出。" : "止损条件满足，必须退出。",
      executedActions,
    };
  }

  const extra = await signalExtra(signal.id);
  const targetActions: TradeSignalAction[] = [];
  if (!extra.target1_hit_at && targetReached(signal.direction, signal.target1, input.price)) {
    targetActions.push("TARGET1");
  }
  if (!extra.target2_hit_at && targetReached(signal.direction, signal.target2, input.price)) {
    targetActions.push("TARGET2");
  }
  if (!extra.target3_hit_at && targetReached(signal.direction, signal.target3, input.price)) {
    targetActions.push("TARGET3");
  }

  if (targetActions.length) {
    await addAlert({
      signalId: signal.id,
      alertType: `TARGET_${targetActions[targetActions.length - 1]}`,
      severity: "INFO",
      price: input.price,
      message: `价格达到${targetActions.join("、")}条件。`,
      actionRequired: "按预定比例减仓",
    });
    if (input.execute) {
      for (const action of targetActions) {
        await performSignalAction({
          signalId: signal.id,
          action,
          price: input.price,
          note: "价格监控触发分批止盈",
          confirmed: true,
        });
        executedActions.push(action);
        if (action === "TARGET3") break;
      }
    }
    return {
      signalId: signal.id,
      price: input.price,
      recommendation: targetActions[targetActions.length - 1]!,
      message: input.execute ? "已按规则分批止盈。" : "达到止盈条件，等待执行。",
      executedActions,
    };
  }

  return {
    signalId: signal.id,
    price: input.price,
    recommendation: "NONE",
    message: "趋势尚未触发止盈或止损，继续持有。",
    executedActions,
  };
}

export async function getTradingV2Snapshot(): Promise<TradingV2Snapshot> {
  const databaseReady = await ensureTradingV2Tables();
  if (!databaseReady) throw new Error("交易数据库未连接");
  const [signalSnapshot, riskSettings, account, positions, orders, equityCurve, alerts] =
    await Promise.all([
      getTradeSignalDashboardSnapshot(),
      getRiskSettings(),
      getPaperAccount(),
      listPositions(),
      listOrders(),
      listEquity(),
      listAlerts(),
    ]);
  const drafts = signalSnapshot.signals
    .filter((signal) => signal.status === "DRAFT")
    .map((signal) => ({ ...signal, readiness: validateTradePlan(signal) }));
  const actionableSignals = signalSnapshot.signals.filter((signal) =>
    ["PUBLISHED", "ARMED", "TRIGGERED", "ACTIVE", "TAKE_PROFIT"].includes(signal.status)
  );
  return {
    generatedAt: new Date().toISOString(),
    databaseReady,
    signalSnapshot,
    riskSettings,
    account,
    positions,
    orders,
    equityCurve,
    alerts,
    drafts,
    actionableSignals,
  };
}
