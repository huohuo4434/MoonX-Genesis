import "server-only";

import { prisma } from "@/lib/prisma";
import type { ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";

export type StrategyCenterId = "intraday" | "swing" | "position";

export type StrategyCenterRow = {
  id: StrategyCenterId;
  strategyType: ThreeHorizonStrategyType;
  name: string;
  cycle: string;
  description: string;
  modeLabel: string;
  enabled: boolean;
  lastScanAt: string | null;
  return30dPct: number | null;
  maxDrawdownPct: number | null;
  winRatePct: number | null;
  sharpeRatio: number | null;
  runningTrades: number;
  closedTrades: number;
  netPnlUsdt: number;
};

export type StrategyCenterTrade = {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  status: string;
  confidence: number;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  realizedPnlUsdt: number | null;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  rejectionReason: string;
};

export type StrategyCenterLiveOrder = {
  id: string;
  strategyType: ThreeHorizonStrategyType;
  horizonLabel: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  status: string;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  quantity: number | null;
  riskAmountUsdt: number | null;
  bitgetOrderId: string;
  openedAt: string | null;
  closedAt: string | null;
  metaphysicalReasons: string[];
  executionReasons: string[];
};

export type StrategyCenterSnapshot = {
  generatedAt: string;
  dataReady: boolean;
  dataNotice: string;
  strategies: StrategyCenterRow[];
  decisions: Record<StrategyCenterId, StrategyCenterTrade[]>;
  liveOrders: StrategyCenterLiveOrder[];
};

type ProfileRow = {
  strategy_type: string;
  enabled: boolean;
  mode: string;
  last_scan_at: Date | string | null;
};

type DecisionRow = {
  id: string;
  strategy_type: string;
  symbol: string;
  status: string;
  direction: string;
  confidence: number;
  entry_price: number | null;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  realized_pnl_usdt: number | null;
  opened_at: Date | string | null;
  closed_at: Date | string | null;
  created_at: Date | string;
  rejection_reason: string | null;
};

type MetricRow = {
  strategy_type: string;
  net_pnl_usdt: number;
  closed_at: Date | string | null;
};

type LiveOrderRow = {
  id: string;
  strategy_type: string;
  symbol: string;
  status: string;
  direction: string;
  entry_price: number | null;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  quantity: number | null;
  risk_amount_usdt: number | null;
  bitget_order_id: string | null;
  conditions: unknown;
  opened_at: Date | string | null;
  closed_at: Date | string | null;
};

const STRATEGY_TYPES: ThreeHorizonStrategyType[] = ["INTRADAY", "SWING", "POSITION"];

const STRATEGY_META: Record<ThreeHorizonStrategyType, {
  id: StrategyCenterId;
  name: string;
  cycle: string;
  description: string;
}> = {
  INTRADAY: {
    id: "intraday",
    name: "MOOX 短线策略",
    cycle: "30—90分钟",
    description: "读取现有短线策略记录；策略中心只展示，不改变方向、仓位或订单。",
  },
  SWING: {
    id: "swing",
    name: "MOOX 波段策略",
    cycle: "2—3天（新仓最多72小时）",
    description: "读取现有波段策略记录；方向仍由当前MOOX研究链决定。",
  },
  POSITION: {
    id: "position",
    name: "MOOX 长线策略",
    cycle: "1—4周",
    description: "年度候选窗口内评估，月方向与周节奏一致后再看入场；预测先到期则先结束。",
  },
};

const ACTIVE_STATUSES = new Set(["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING"]);

function strategyType(value: string): ThreeHorizonStrategyType | null {
  const normalized = value.trim().toUpperCase();
  return STRATEGY_TYPES.includes(normalized as ThreeHorizonStrategyType)
    ? normalized as ThreeHorizonStrategyType
    : null;
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function modeLabel(mode: string | undefined): string {
  if (mode === "LIVE") return "实盘实验";
  if (mode === "DEMO") return "Demo";
  if (mode === "SHADOW") return "影子观察";
  return "待读取";
}

const STRATEGY_READ_TIMEOUT_MS = 2_500;

async function readRows<T>(sql: string): Promise<T[]> {
  if (!prisma) return [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      prisma.$queryRawUnsafe<T[]>(sql),
      new Promise<T[]>((resolve) => {
        timer = setTimeout(() => resolve([]), STRATEGY_READ_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.warn("[strategy-center] read degraded", error);
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function safeDecision(row: DecisionRow): StrategyCenterTrade | null {
  const direction = row.direction?.trim().toUpperCase();
  if (direction !== "LONG" && direction !== "SHORT" && direction !== "NEUTRAL") return null;
  return {
    id: row.id,
    symbol: row.symbol,
    direction,
    status: row.status,
    confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : 0,
    entryPrice: row.entry_price == null ? null : Number(row.entry_price),
    stopLoss: row.stop_loss == null ? null : Number(row.stop_loss),
    target1: row.target_1 == null ? null : Number(row.target_1),
    target2: row.target_2 == null ? null : Number(row.target_2),
    realizedPnlUsdt: row.realized_pnl_usdt == null ? null : Number(row.realized_pnl_usdt),
    openedAt: iso(row.opened_at),
    closedAt: iso(row.closed_at),
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
    rejectionReason: row.rejection_reason ?? "",
  };
}

type StoredCondition = { key?: unknown; label?: unknown; value?: unknown };

function storedConditions(value: unknown): StoredCondition[] {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(parsed) ? parsed.filter((item): item is StoredCondition => Boolean(item && typeof item === "object")) : [];
}

function reasonLines(conditions: StoredCondition[], keys: Set<string>): string[] {
  return conditions.flatMap((condition) => {
    const key = typeof condition.key === "string" ? condition.key : "";
    if (!keys.has(key)) return [];
    const label = typeof condition.label === "string" ? condition.label.trim() : "";
    const value = typeof condition.value === "string" ? condition.value.trim() : "";
    if (!value) return [];
    return [`${label || "依据"}：${value}`];
  });
}

function safeLiveOrder(row: LiveOrderRow): StrategyCenterLiveOrder | null {
  const type = strategyType(row.strategy_type);
  const direction = row.direction?.trim().toUpperCase();
  if (!type || (direction !== "LONG" && direction !== "SHORT") || !row.bitget_order_id) return null;
  const conditions = storedConditions(row.conditions);
  const metaphysicalReasons = reasonLines(conditions, new Set(["weekly", "forecast", "hexagram"]));
  const executionReasons = reasonLines(conditions, new Set(["environment", "daily", "direction", "structure", "entry", "risk"]));
  return {
    id: row.id,
    strategyType: type,
    horizonLabel: type === "INTRADAY" ? "短线" : type === "SWING" ? "中线" : "长线",
    symbol: row.symbol,
    direction,
    status: row.status,
    entryPrice: row.entry_price == null ? null : Number(row.entry_price),
    stopLoss: row.stop_loss == null ? null : Number(row.stop_loss),
    target1: row.target_1 == null ? null : Number(row.target_1),
    target2: row.target_2 == null ? null : Number(row.target_2),
    quantity: row.quantity == null ? null : Number(row.quantity),
    riskAmountUsdt: row.risk_amount_usdt == null ? null : Number(row.risk_amount_usdt),
    bitgetOrderId: row.bitget_order_id,
    openedAt: iso(row.opened_at),
    closedAt: iso(row.closed_at),
    metaphysicalReasons: metaphysicalReasons.length
      ? metaphysicalReasons
      : ["该订单没有保存可追溯的六爻/奇门开仓依据，系统不补写事后理由。"],
    executionReasons,
  };
}

export async function getStrategyCenterSnapshot(now = new Date()): Promise<StrategyCenterSnapshot> {
  // V7.20.7 is a read-only UI layer. These are SELECT-only queries on tables
  // already owned by the existing strategy system; this module never creates,
  // alters or updates trading tables and never invokes an execution engine.
  const [profileRows, decisionRows, metricRows, liveOrderRows] = await Promise.all([
    readRows<ProfileRow>(`SELECT strategy_type, enabled, mode, last_scan_at FROM trade_three_horizon_profiles ORDER BY strategy_type`),
    readRows<DecisionRow>(`SELECT id, strategy_type, symbol, status, direction, confidence, entry_price, stop_loss, target_1, target_2, realized_pnl_usdt, opened_at, closed_at, created_at, rejection_reason FROM trade_three_horizon_decisions ORDER BY created_at DESC`),
    readRows<MetricRow>(`SELECT strategy_type, net_pnl_usdt, closed_at FROM trade_strategy_trade_metrics ORDER BY closed_at ASC NULLS LAST`),
    readRows<LiveOrderRow>(`
      SELECT d.id, d.strategy_type, d.symbol, d.status, d.direction, d.entry_price, d.stop_loss,
             d.target_1, d.target_2, d.quantity, d.risk_amount_usdt, d.bitget_order_id,
             d.conditions, d.opened_at, d.closed_at
      FROM trade_three_horizon_decisions d
      WHERE d.mode = 'LIVE'
        AND d.bitget_order_id IS NOT NULL
        AND d.opened_at IS NOT NULL
        AND d.status IN ('ORDER_SUBMITTED', 'OPEN', 'PARTIAL', 'CLOSING', 'CLOSED', 'ERROR')
        AND EXISTS (
          SELECT 1 FROM trade_execution_outbox o
          WHERE o.decision_id = d.id
            AND o.environment_mode = 'LIVE_EXPERIMENT'
            AND o.action_type = 'OPEN_MARKET'
            AND o.status = 'CONFIRMED'
        )
      ORDER BY d.opened_at DESC NULLS LAST
      LIMIT 30
    `),
  ]);

  const profiles = new Map<ThreeHorizonStrategyType, ProfileRow>();
  for (const row of profileRows) {
    const type = strategyType(row.strategy_type);
    if (type) profiles.set(type, row);
  }

  const decisions: Record<StrategyCenterId, StrategyCenterTrade[]> = { intraday: [], swing: [], position: [] };
  for (const row of decisionRows) {
    const type = strategyType(row.strategy_type);
    if (!type) continue;
    const decision = safeDecision(row);
    if (decision) decisions[STRATEGY_META[type].id].push(decision);
  }

  const strategies = STRATEGY_TYPES.map((type) => {
    const meta = STRATEGY_META[type];
    const profile = profiles.get(type);
    const rows = decisions[meta.id];
    const metrics = metricRows.filter((row) => strategyType(row.strategy_type) === type);
    const wins = metrics.filter((row) => Number(row.net_pnl_usdt) > 0).length;
    const netPnlUsdt = metrics.reduce((sum, row) => sum + (Number.isFinite(Number(row.net_pnl_usdt)) ? Number(row.net_pnl_usdt) : 0), 0);

    return {
      id: meta.id,
      strategyType: type,
      name: meta.name,
      cycle: meta.cycle,
      description: meta.description,
      modeLabel: modeLabel(profile?.mode),
      enabled: Boolean(profile?.enabled),
      lastScanAt: iso(profile?.last_scan_at),
      // The current database does not provide a trustworthy per-strategy NAV
      // denominator or daily return series. Keep these fields empty rather than
      // infer percentages or Sharpe from account-wide/cumulative PnL.
      return30dPct: null,
      maxDrawdownPct: null,
      winRatePct: metrics.length ? Math.round((wins / metrics.length) * 1000) / 10 : null,
      sharpeRatio: null,
      runningTrades: rows.filter((row) => ACTIVE_STATUSES.has(row.status)).length,
      closedTrades: metrics.length,
      netPnlUsdt: Math.round(netPnlUsdt * 100) / 100,
    } satisfies StrategyCenterRow;
  });

  const dataReady = profileRows.length > 0 || decisionRows.length > 0 || metricRows.length > 0;
  const liveOrders = liveOrderRows.map(safeLiveOrder).filter((row): row is StrategyCenterLiveOrder => row !== null);
  return {
    generatedAt: now.toISOString(),
    dataReady,
    dataNotice: dataReady
      ? "胜率和累计净盈亏读取现有策略记录；30日收益、最大回撤、Sharpe和净值曲线等待真实策略级NAV序列，不做估算。"
      : "策略数据库暂不可读；页面只保留结构，不填充虚构绩效。",
    strategies,
    decisions,
    liveOrders,
  };
}

export function getStrategyCenterRow(snapshot: StrategyCenterSnapshot, id: string): StrategyCenterRow | null {
  return snapshot.strategies.find((row) => row.id === id) ?? null;
}

export function getStrategyCenterTrades(snapshot: StrategyCenterSnapshot, id: string): StrategyCenterTrade[] {
  if (id !== "intraday" && id !== "swing" && id !== "position") return [];
  return snapshot.decisions[id];
}
