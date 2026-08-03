import "server-only";

import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  getBitgetDemoClosedPositions,
  getBitgetDemoCurrentPositions,
  getBitgetDemoMarketQuotes,
  getBitgetDemoPendingStrategyOrders,
  testBitgetDemoConnection,
  type BitgetDemoClosedPosition,
  type BitgetDemoMarketQuote,
  type BitgetDemoPosition,
  type BitgetDemoStrategyOrder,
} from "@/lib/bitget/demo-client";
import type {
  StrategyExperimentSummary,
  StrategyPerformanceMetrics,
  StrategyReconciliationEvent,
  StrategyValidationCycleReport,
  StrategyValidationDashboard,
  StrategyValidationInvariant,
  StrategyValidationSeverity,
} from "@/types/strategy-validation";
import type {
  ThreeHorizonCondition,
  ThreeHorizonDirection,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";

const STRATEGY_TYPES: ThreeHorizonStrategyType[] = ["INTRADAY", "SWING", "POSITION"];
const MIN_CLOSED_TRADES = 30;
const REQUIRED_STABLE_DAYS = 30;
const REQUIRED_HEARTBEAT_PCT = 99;
const MAX_ACCEPTABLE_DRAWDOWN_PCT = 10;
const SNAPSHOT_INTERVAL_MS = 5 * 60_000;
const ORDER_SUBMITTED_GRACE_MS = 10 * 60_000;

interface RuntimeStateRow {
  last_heartbeat_at: Date | string | null;
  last_market_at: Date | string | null;
}

interface ValidationStateRow {
  last_run_at: Date | string | null;
  last_success_at: Date | string | null;
  consecutive_errors: number;
  last_report: unknown;
}

interface DecisionRow {
  id: string;
  run_id: string;
  strategy_type: ThreeHorizonStrategyType;
  strategy_version: string;
  mode: "SHADOW" | "DEMO";
  symbol: string;
  status: string;
  direction: ThreeHorizonDirection;
  confidence: number;
  conditions: unknown;
  entry_price: number | null;
  stop_loss: number | null;
  target_2: number | null;
  quantity: number | null;
  risk_amount_usdt: number | null;
  client_oid: string | null;
  bitget_order_id: string | null;
  protection_order_id: string | null;
  opened_at: Date | string | null;
  closed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProfileRow {
  strategy_type: ThreeHorizonStrategyType;
  min_confidence: number;
  max_holding_minutes: number;
}

interface MetricRow {
  decision_id: string;
  position_id: string;
  strategy_type: ThreeHorizonStrategyType;
  strategy_version: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  planned_entry: number | null;
  actual_entry: number | null;
  actual_exit: number | null;
  quantity: number | null;
  gross_pnl_usdt: number;
  open_fee_usdt: number;
  close_fee_usdt: number;
  funding_usdt: number;
  cash_dividend_usdt: number;
  net_pnl_usdt: number;
  entry_slippage_usdt: number;
  entry_slippage_bps: number;
  r_multiple: number | null;
  opened_at: Date | string | null;
  closed_at: Date | string | null;
}

interface SnapshotRow {
  equity_usdt: number | null;
  captured_at: Date | string;
}

interface ReconciliationEventRow {
  id: string;
  severity: StrategyValidationSeverity;
  code: string;
  symbol: string | null;
  decision_id: string | null;
  message: string;
  resolved: boolean;
  created_at: Date | string;
  resolved_at: Date | string | null;
}

interface ExperimentRow {
  id: string;
  strategy_type: ThreeHorizonStrategyType;
  name: string;
  version: string;
  enabled: boolean;
  confidence_delta: number;
  description: string;
}

interface TrialRow {
  id: string;
  experiment_id: string;
  strategy_type: ThreeHorizonStrategyType;
  symbol: string;
  direction: "LONG" | "SHORT";
  status: "OPEN" | "TARGET" | "STOP" | "TIME" | "CANCELLED";
  entry_price: number;
  stop_loss: number;
  target_price: number;
  last_price: number;
  max_favorable_price: number;
  max_adverse_price: number;
  r_multiple: number | null;
  expires_at: Date | string;
}

interface CountRow {
  count: bigint | number | string;
}

interface DuplicateRow {
  client_oid: string;
  count: bigint | number | string;
}

interface CurrentIssue {
  severity: StrategyValidationSeverity;
  code: string;
  symbol: string | null;
  decisionId: string | null;
  message: string;
  payload?: Record<string, unknown>;
}

function finite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function countValue(value: bigint | number | string | null | undefined): number {
  return finite(value, 0);
}

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function fingerprint(issue: CurrentIssue): string {
  return createHash("sha256")
    .update([issue.code, issue.symbol ?? "", issue.decisionId ?? ""].join("|"))
    .digest("hex");
}

function sideFor(direction: ThreeHorizonDirection): "long" | "short" {
  return direction === "SHORT" ? "short" : "long";
}

function positionMatchesDecision(position: BitgetDemoPosition, decision: DecisionRow): boolean {
  return position.symbol === decision.symbol && position.posSide === sideFor(decision.direction);
}

function protectionMatchesDecision(order: BitgetDemoStrategyOrder, decision: DecisionRow): boolean {
  return order.symbol === decision.symbol && order.posSide === sideFor(decision.direction);
}

function mandatoryKeys(strategyType: ThreeHorizonStrategyType): string[] {
  if (strategyType === "INTRADAY") return ["environment", "direction", "entry", "risk"];
  if (strategyType === "SWING") return ["weekly", "daily", "structure", "entry", "risk"];
  return ["monthly", "weekly", "daily", "entry", "risk"];
}

function allMandatoryMet(decision: DecisionRow): boolean {
  const conditions = parseJson<ThreeHorizonCondition[]>(decision.conditions, []);
  const required = mandatoryKeys(decision.strategy_type);
  return required.every((key) => conditions.some((row) => row.key === key && row.met));
}

function rMultiple(input: {
  direction: "LONG" | "SHORT";
  entry: number;
  exit: number;
  stop: number;
}): number | null {
  const risk = Math.abs(input.entry - input.stop);
  if (!(risk > 0)) return null;
  const pnl = input.direction === "LONG"
    ? input.exit - input.entry
    : input.entry - input.exit;
  return round(pnl / risk, 4);
}

let ensured = false;
export async function ensureStrategyValidationTables(): Promise<boolean> {
  if (!prisma) return false;
  if (ensured) return true;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_three_horizon_decisions
      ADD COLUMN IF NOT EXISTS strategy_version TEXT NOT NULL DEFAULT 'phase2-v1'
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_strategy_validation_state (
        id TEXT PRIMARY KEY,
        last_run_at TIMESTAMPTZ,
        last_success_at TIMESTAMPTZ,
        consecutive_errors INTEGER NOT NULL DEFAULT 0,
        real_trading_locked BOOLEAN NOT NULL DEFAULT TRUE,
        last_report JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT trade_strategy_validation_real_locked CHECK (real_trading_locked = TRUE)
      )
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO trade_strategy_validation_state (id, real_trading_locked)
      VALUES ('default', TRUE)
      ON CONFLICT (id) DO UPDATE SET real_trading_locked = TRUE
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE trade_strategy_validation_state SET real_trading_locked = TRUE
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'trade_strategy_validation_real_locked'
        ) THEN
          ALTER TABLE trade_strategy_validation_state
          ADD CONSTRAINT trade_strategy_validation_real_locked
          CHECK (real_trading_locked = TRUE);
        END IF;
      END $$
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_strategy_equity_snapshots (
        id TEXT PRIMARY KEY,
        equity_usdt DOUBLE PRECISION,
        available_usdt DOUBLE PRECISION,
        unrealised_pnl_usdt DOUBLE PRECISION,
        positions_count INTEGER NOT NULL DEFAULT 0,
        protected_positions_count INTEGER NOT NULL DEFAULT 0,
        heartbeat_at TIMESTAMPTZ,
        market_at TIMESTAMPTZ,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_strategy_equity_snapshots_time_idx
      ON trade_strategy_equity_snapshots(captured_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_strategy_reconciliation_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL UNIQUE,
        severity TEXT NOT NULL,
        code TEXT NOT NULL,
        symbol TEXT,
        decision_id TEXT,
        message TEXT NOT NULL,
        payload JSONB,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_strategy_reconciliation_open_idx
      ON trade_strategy_reconciliation_events(resolved, severity, created_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_strategy_trade_metrics (
        decision_id TEXT PRIMARY KEY,
        position_id TEXT NOT NULL UNIQUE,
        strategy_type TEXT NOT NULL,
        strategy_version TEXT NOT NULL DEFAULT 'phase2-v1',
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        planned_entry DOUBLE PRECISION,
        actual_entry DOUBLE PRECISION,
        actual_exit DOUBLE PRECISION,
        quantity DOUBLE PRECISION,
        gross_pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        open_fee_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        close_fee_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        funding_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        cash_dividend_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        net_pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        entry_slippage_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        entry_slippage_bps DOUBLE PRECISION NOT NULL DEFAULT 0,
        r_multiple DOUBLE PRECISION,
        opened_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_strategy_trade_metrics_strategy_time_idx
      ON trade_strategy_trade_metrics(strategy_type, closed_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_strategy_daily_reports (
        report_date DATE NOT NULL,
        strategy_type TEXT NOT NULL,
        closed_trades INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        gross_pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        fees_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        funding_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        net_pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
        average_r DOUBLE PRECISION,
        profit_factor DOUBLE PRECISION,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (report_date, strategy_type)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_strategy_experiments (
        id TEXT PRIMARY KEY,
        strategy_type TEXT NOT NULL,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        confidence_delta INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(strategy_type, version)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_strategy_experiment_trials (
        id TEXT PRIMARY KEY,
        experiment_id TEXT NOT NULL,
        decision_id TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        entry_price DOUBLE PRECISION NOT NULL,
        stop_loss DOUBLE PRECISION NOT NULL,
        target_price DOUBLE PRECISION NOT NULL,
        last_price DOUBLE PRECISION NOT NULL,
        max_favorable_price DOUBLE PRECISION NOT NULL,
        max_adverse_price DOUBLE PRECISION NOT NULL,
        exit_price DOUBLE PRECISION,
        r_multiple DOUBLE PRECISION,
        opened_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(experiment_id, decision_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_strategy_experiment_trials_open_idx
      ON trade_strategy_experiment_trials(status, expires_at)
    `);
    const experiments: Array<[string, ThreeHorizonStrategyType, string, string, number, string]> = [
      ["exp_intraday_baseline", "INTRADAY", "短线基线", "phase3-baseline-v1", 0, "完全锁定Phase 2强制条件和原始置信度门槛。"],
      ["exp_intraday_strict", "INTRADAY", "短线严格组", "phase3-strict-v1", 5, "只做影子对照，置信度门槛提高5个百分点。"],
      ["exp_intraday_flex", "INTRADAY", "短线弹性组", "phase3-flex-v1", -5, "只做影子对照，强制技术条件不变，置信度门槛降低5个百分点。"],
      ["exp_swing_baseline", "SWING", "波段基线", "phase3-baseline-v1", 0, "完全锁定Phase 2强制条件和原始置信度门槛。"],
      ["exp_swing_strict", "SWING", "波段严格组", "phase3-strict-v1", 5, "只做影子对照，置信度门槛提高5个百分点。"],
      ["exp_swing_flex", "SWING", "波段弹性组", "phase3-flex-v1", -5, "只做影子对照，强制技术条件不变，置信度门槛降低5个百分点。"],
      ["exp_position_baseline", "POSITION", "中长期基线", "phase3-baseline-v1", 0, "完全锁定Phase 2强制条件和原始置信度门槛。"],
      ["exp_position_strict", "POSITION", "中长期严格组", "phase3-strict-v1", 5, "只做影子对照，置信度门槛提高5个百分点。"],
      ["exp_position_flex", "POSITION", "中长期弹性组", "phase3-flex-v1", -5, "只做影子对照，强制技术条件不变，置信度门槛降低5个百分点。"],
    ];
    for (const row of experiments) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO trade_strategy_experiments
          (id, strategy_type, name, version, enabled, confidence_delta, description)
         VALUES ($1,$2,$3,$4,TRUE,$5,$6)
         ON CONFLICT (strategy_type, version) DO NOTHING`,
        ...row
      );
    }
    ensured = true;
    return true;
  } catch (error) {
    console.error("Phase 3 strategy validation tables unavailable", error);
    return false;
  }
}

async function runtimeState(): Promise<RuntimeStateRow | null> {
  if (!prisma) return null;
  const rows = await prisma.$queryRawUnsafe<RuntimeStateRow[]>(`
    SELECT last_heartbeat_at, last_market_at
    FROM trade_bitget_runtime_state WHERE id = 'default' LIMIT 1
  `).catch(() => [] as RuntimeStateRow[]);
  return rows[0] ?? null;
}

async function listActiveDecisions(): Promise<DecisionRow[]> {
  if (!prisma) return [];
  return prisma.$queryRawUnsafe<DecisionRow[]>(`
    SELECT * FROM trade_three_horizon_decisions
    WHERE mode = 'DEMO'
      AND status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING')
    ORDER BY created_at ASC
  `);
}

async function currentIssues(input: {
  decisions: DecisionRow[];
  positions: BitgetDemoPosition[];
  protections: BitgetDemoStrategyOrder[];
  now: Date;
}): Promise<CurrentIssue[]> {
  if (!prisma) return [];
  const issues: CurrentIssue[] = [];
  for (const decision of input.decisions) {
    const position = input.positions.find((row) => positionMatchesDecision(row, decision));
    const protection = input.protections.find((row) => protectionMatchesDecision(row, decision));
    const age = input.now.getTime() - new Date(decision.updated_at).getTime();
    if (!position && (decision.status !== "ORDER_SUBMITTED" || age > ORDER_SUBMITTED_GRACE_MS)) {
      issues.push({
        severity: "CRITICAL",
        code: "LOCAL_OPEN_WITHOUT_EXCHANGE_POSITION",
        symbol: decision.symbol,
        decisionId: decision.id,
        message: `${decision.strategy_type}账本显示${decision.symbol}仍在持仓流程，但Bitget Demo没有对应方向仓位。`,
        payload: { status: decision.status, clientOid: decision.client_oid },
      });
    }
    if (position && ["OPEN", "PARTIAL"].includes(decision.status) && !protection) {
      issues.push({
        severity: "CRITICAL",
        code: "POSITION_WITHOUT_PROTECTION",
        symbol: decision.symbol,
        decisionId: decision.id,
        message: `${decision.symbol}存在三周期Demo仓位，但没有检测到同方向交易所止盈止损策略单。`,
        payload: { status: decision.status, positionTotal: position.total },
      });
    }
  }
  for (const position of input.positions) {
    const matched = input.decisions.some((decision) => positionMatchesDecision(position, decision));
    if (!matched) {
      issues.push({
        severity: "WARNING",
        code: "EXCHANGE_POSITION_WITHOUT_THREE_HORIZON_DECISION",
        symbol: position.symbol,
        decisionId: null,
        message: `${position.symbol} ${position.posSide}仓位没有匹配到三周期活动决策，可能来自旧镜像、测试订单或人工Demo操作。`,
        payload: { total: position.total, avgPrice: position.avgPrice },
      });
    }
  }
  const duplicates = await prisma.$queryRawUnsafe<DuplicateRow[]>(`
    SELECT client_oid, COUNT(*) AS count
    FROM trade_three_horizon_decisions
    WHERE client_oid IS NOT NULL AND client_oid <> ''
    GROUP BY client_oid HAVING COUNT(*) > 1
  `);
  for (const duplicate of duplicates) {
    issues.push({
      severity: "CRITICAL",
      code: "DUPLICATE_CLIENT_OID",
      symbol: null,
      decisionId: null,
      message: `发现clientOid重复：${duplicate.client_oid}（${countValue(duplicate.count)}条）。`,
      payload: { clientOid: duplicate.client_oid, count: countValue(duplicate.count) },
    });
  }
  return issues;
}

async function persistIssues(runId: string, issues: CurrentIssue[], now: Date): Promise<void> {
  if (!prisma) return;
  const activeFingerprints = issues.map(fingerprint);
  for (const issue of issues) {
    const fp = fingerprint(issue);
    await prisma.$executeRawUnsafe(
      `INSERT INTO trade_strategy_reconciliation_events
        (id, run_id, fingerprint, severity, code, symbol, decision_id, message, payload, resolved, resolved_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,FALSE,NULL,$10,$10)
       ON CONFLICT (fingerprint) DO UPDATE SET
         run_id = EXCLUDED.run_id,
         severity = EXCLUDED.severity,
         message = EXCLUDED.message,
         payload = EXCLUDED.payload,
         resolved = FALSE,
         resolved_at = NULL,
         updated_at = EXCLUDED.updated_at`,
      `rec_${randomUUID()}`,
      runId,
      fp,
      issue.severity,
      issue.code,
      issue.symbol,
      issue.decisionId,
      issue.message,
      JSON.stringify(issue.payload ?? {}),
      now
    );
  }
  const unresolved = await prisma.$queryRawUnsafe<Array<{ fingerprint: string }>>(`
    SELECT fingerprint FROM trade_strategy_reconciliation_events WHERE resolved = FALSE
  `);
  const active = new Set(activeFingerprints);
  for (const row of unresolved) {
    if (active.has(row.fingerprint)) continue;
    await prisma.$executeRawUnsafe(
      `UPDATE trade_strategy_reconciliation_events
       SET resolved = TRUE, resolved_at = $2, updated_at = $2
       WHERE fingerprint = $1 AND resolved = FALSE`,
      row.fingerprint,
      now
    );
  }
}

async function maybeWriteSnapshot(input: {
  now: Date;
  positions: BitgetDemoPosition[];
  protections: BitgetDemoStrategyOrder[];
}): Promise<boolean> {
  if (!prisma) return false;
  const recent = await prisma.$queryRawUnsafe<Array<{ captured_at: Date | string }>>(`
    SELECT captured_at FROM trade_strategy_equity_snapshots
    ORDER BY captured_at DESC LIMIT 1
  `);
  const last = recent[0] ? new Date(recent[0].captured_at).getTime() : 0;
  if (last && input.now.getTime() - last < SNAPSHOT_INTERVAL_MS) return false;
  const [account, runtime] = await Promise.all([
    testBitgetDemoConnection(),
    runtimeState(),
  ]);
  const unrealised = input.positions.reduce((sum, row) => sum + row.unrealisedPnl, 0);
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_strategy_equity_snapshots
      (id, equity_usdt, available_usdt, unrealised_pnl_usdt, positions_count,
       protected_positions_count, heartbeat_at, market_at, captured_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    `eq_${randomUUID()}`,
    account.equityUsdt,
    account.availableUsdt,
    unrealised,
    input.positions.length,
    input.protections.length,
    runtime?.last_heartbeat_at ?? null,
    runtime?.last_market_at ?? null,
    input.now
  );
  return true;
}

function bestClosedMatch(
  decision: DecisionRow,
  closed: BitgetDemoClosedPosition[],
  used: Set<string>
): BitgetDemoClosedPosition | null {
  const openedAt = new Date(decision.opened_at ?? decision.created_at).getTime();
  const candidates = closed
    .filter((row) => !used.has(row.positionId))
    .filter((row) => row.symbol === decision.symbol && row.posSide === sideFor(decision.direction))
    .map((row) => ({ row, opened: new Date(row.createdAt ?? 0).getTime() }))
    .filter(({ opened }) => !Number.isFinite(openedAt) || !Number.isFinite(opened) || opened >= openedAt - 5 * 60_000)
    .sort((a, b) => Math.abs(a.opened - openedAt) - Math.abs(b.opened - openedAt));
  return candidates[0]?.row ?? null;
}

async function upsertClosedMetrics(closed: BitgetDemoClosedPosition[], now: Date): Promise<number> {
  if (!prisma || closed.length === 0) return 0;
  const decisions = await prisma.$queryRawUnsafe<DecisionRow[]>(`
    SELECT * FROM trade_three_horizon_decisions
    WHERE mode = 'DEMO'
      AND status = 'CLOSED'
      AND direction IN ('LONG','SHORT')
      AND entry_price IS NOT NULL
      AND stop_loss IS NOT NULL
    ORDER BY closed_at DESC NULLS LAST, updated_at DESC
    LIMIT 500
  `);
  const existing = await prisma.$queryRawUnsafe<Array<{ position_id: string }>>(`
    SELECT position_id FROM trade_strategy_trade_metrics
  `);
  const used = new Set(existing.map((row) => row.position_id));
  let upserted = 0;
  for (const decision of decisions) {
    const match = bestClosedMatch(decision, closed, used);
    if (!match) continue;
    const plannedEntry = finite(decision.entry_price);
    const actualEntry = match.openPriceAvg;
    const quantity = match.openTotalPos || finite(decision.quantity);
    const signedEntryDiff = decision.direction === "LONG"
      ? actualEntry - plannedEntry
      : plannedEntry - actualEntry;
    const slippageUsdt = plannedEntry > 0 ? signedEntryDiff * quantity : 0;
    const slippageBps = plannedEntry > 0 ? signedEntryDiff / plannedEntry * 10_000 : 0;
    const risk = Math.abs(plannedEntry - finite(decision.stop_loss)) * quantity;
    const r = risk > 0 ? match.netProfit / risk : null;
    await prisma.$executeRawUnsafe(
      `INSERT INTO trade_strategy_trade_metrics
        (decision_id, position_id, strategy_type, strategy_version, symbol, direction,
         planned_entry, actual_entry, actual_exit, quantity, gross_pnl_usdt,
         open_fee_usdt, close_fee_usdt, funding_usdt, cash_dividend_usdt,
         net_pnl_usdt, entry_slippage_usdt, entry_slippage_bps, r_multiple,
         opened_at, closed_at, matched_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT (decision_id) DO UPDATE SET
         position_id = EXCLUDED.position_id,
         actual_entry = EXCLUDED.actual_entry,
         actual_exit = EXCLUDED.actual_exit,
         quantity = EXCLUDED.quantity,
         gross_pnl_usdt = EXCLUDED.gross_pnl_usdt,
         open_fee_usdt = EXCLUDED.open_fee_usdt,
         close_fee_usdt = EXCLUDED.close_fee_usdt,
         funding_usdt = EXCLUDED.funding_usdt,
         cash_dividend_usdt = EXCLUDED.cash_dividend_usdt,
         net_pnl_usdt = EXCLUDED.net_pnl_usdt,
         entry_slippage_usdt = EXCLUDED.entry_slippage_usdt,
         entry_slippage_bps = EXCLUDED.entry_slippage_bps,
         r_multiple = EXCLUDED.r_multiple,
         closed_at = EXCLUDED.closed_at,
         matched_at = EXCLUDED.matched_at`,
      decision.id,
      match.positionId,
      decision.strategy_type,
      decision.strategy_version || "phase2-v1",
      decision.symbol,
      decision.direction,
      plannedEntry,
      actualEntry,
      match.closePriceAvg,
      quantity,
      match.cumRealisedPnl,
      match.openFeeTotal,
      match.closeFeeTotal,
      match.totalFunding,
      match.cashDividend,
      match.netProfit,
      slippageUsdt,
      slippageBps,
      r == null ? null : round(r, 4),
      match.createdAt ? new Date(match.createdAt) : decision.opened_at,
      match.updatedAt ? new Date(match.updatedAt) : decision.closed_at,
      now
    );
    used.add(match.positionId);
    upserted += 1;
  }
  return upserted;
}

async function upsertDailyReports(): Promise<void> {
  if (!prisma) return;
  const rows = await prisma.$queryRawUnsafe<MetricRow[]>(`
    SELECT * FROM trade_strategy_trade_metrics
    WHERE closed_at >= NOW() - INTERVAL '90 days'
    ORDER BY closed_at ASC
  `);
  const groups = new Map<string, MetricRow[]>();
  for (const row of rows) {
    const date = iso(row.closed_at)?.slice(0, 10);
    if (!date) continue;
    const key = `${date}|${row.strategy_type}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const [key, metrics] of groups) {
    const [date, strategyType] = key.split("|") as [string, ThreeHorizonStrategyType];
    const wins = metrics.filter((row) => row.net_pnl_usdt > 0);
    const losses = metrics.filter((row) => row.net_pnl_usdt < 0);
    const grossProfit = wins.reduce((sum, row) => sum + row.net_pnl_usdt, 0);
    const grossLoss = Math.abs(losses.reduce((sum, row) => sum + row.net_pnl_usdt, 0));
    const rValues = metrics.map((row) => row.r_multiple).filter((value): value is number => value != null);
    await prisma.$executeRawUnsafe(
      `INSERT INTO trade_strategy_daily_reports
        (report_date, strategy_type, closed_trades, wins, losses, gross_pnl_usdt,
         fees_usdt, funding_usdt, net_pnl_usdt, average_r, profit_factor, generated_at)
       VALUES ($1::date,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (report_date, strategy_type) DO UPDATE SET
         closed_trades = EXCLUDED.closed_trades,
         wins = EXCLUDED.wins,
         losses = EXCLUDED.losses,
         gross_pnl_usdt = EXCLUDED.gross_pnl_usdt,
         fees_usdt = EXCLUDED.fees_usdt,
         funding_usdt = EXCLUDED.funding_usdt,
         net_pnl_usdt = EXCLUDED.net_pnl_usdt,
         average_r = EXCLUDED.average_r,
         profit_factor = EXCLUDED.profit_factor,
         generated_at = NOW()`,
      date,
      strategyType,
      metrics.length,
      wins.length,
      losses.length,
      metrics.reduce((sum, row) => sum + row.gross_pnl_usdt, 0),
      metrics.reduce((sum, row) => sum + Math.abs(row.open_fee_usdt) + Math.abs(row.close_fee_usdt), 0),
      metrics.reduce((sum, row) => sum + row.funding_usdt, 0),
      metrics.reduce((sum, row) => sum + row.net_pnl_usdt, 0),
      rValues.length ? rValues.reduce((sum, value) => sum + value, 0) / rValues.length : null,
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : null
    );
  }
}

async function openExperimentTrials(now: Date): Promise<number> {
  if (!prisma) return 0;
  const [experiments, profiles, decisions] = await Promise.all([
    prisma.$queryRawUnsafe<ExperimentRow[]>(`
      SELECT * FROM trade_strategy_experiments WHERE enabled = TRUE ORDER BY strategy_type, confidence_delta
    `),
    prisma.$queryRawUnsafe<ProfileRow[]>(`
      SELECT strategy_type, min_confidence, max_holding_minutes FROM trade_three_horizon_profiles
    `),
    prisma.$queryRawUnsafe<DecisionRow[]>(`
      SELECT * FROM trade_three_horizon_decisions
      WHERE created_at >= NOW() - INTERVAL '48 hours'
        AND direction IN ('LONG','SHORT')
        AND entry_price IS NOT NULL
        AND stop_loss IS NOT NULL
        AND target_2 IS NOT NULL
      ORDER BY created_at DESC LIMIT 1000
    `),
  ]);
  const profileMap = new Map(profiles.map((row) => [row.strategy_type, row]));
  let opened = 0;
  for (const experiment of experiments) {
    const profile = profileMap.get(experiment.strategy_type);
    if (!profile) continue;
    for (const decision of decisions.filter((row) => row.strategy_type === experiment.strategy_type)) {
      if (!allMandatoryMet(decision)) continue;
      if (decision.confidence < profile.min_confidence + experiment.confidence_delta) continue;
      const entry = finite(decision.entry_price);
      const stop = finite(decision.stop_loss);
      const target = finite(decision.target_2);
      if (!(entry > 0 && stop > 0 && target > 0)) continue;
      const expires = new Date(new Date(decision.created_at).getTime() + profile.max_holding_minutes * 60_000);
      const result = await prisma.$executeRawUnsafe(
        `INSERT INTO trade_strategy_experiment_trials
          (id, experiment_id, decision_id, strategy_type, symbol, direction, status,
           entry_price, stop_loss, target_price, last_price, max_favorable_price,
           max_adverse_price, opened_at, expires_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'OPEN',$7,$8,$9,$7,$7,$7,$10,$11,$12,$12)
         ON CONFLICT (experiment_id, decision_id) DO NOTHING`,
        `trial_${randomUUID()}`,
        experiment.id,
        decision.id,
        decision.strategy_type,
        decision.symbol,
        decision.direction,
        entry,
        stop,
        target,
        new Date(decision.created_at),
        expires,
        now
      );
      if (result > 0) opened += 1;
    }
  }
  return opened;
}

async function closeExperimentTrials(
  quotes: BitgetDemoMarketQuote[],
  now: Date
): Promise<number> {
  if (!prisma || quotes.length === 0) return 0;
  const priceMap = new Map<string, number>(quotes.map((row) => [row.symbol, row.price]));
  const trials = await prisma.$queryRawUnsafe<TrialRow[]>(`
    SELECT * FROM trade_strategy_experiment_trials
    WHERE status = 'OPEN' ORDER BY opened_at ASC LIMIT 2000
  `);
  let closed = 0;
  for (const trial of trials) {
    const price = priceMap.get(trial.symbol);
    if (!(price && price > 0)) continue;
    const favorable = trial.direction === "LONG"
      ? Math.max(trial.max_favorable_price, price)
      : Math.min(trial.max_favorable_price, price);
    const adverse = trial.direction === "LONG"
      ? Math.min(trial.max_adverse_price, price)
      : Math.max(trial.max_adverse_price, price);
    const targetHit = trial.direction === "LONG" ? price >= trial.target_price : price <= trial.target_price;
    const stopHit = trial.direction === "LONG" ? price <= trial.stop_loss : price >= trial.stop_loss;
    const expired = now.getTime() >= new Date(trial.expires_at).getTime();
    const status = stopHit ? "STOP" : targetHit ? "TARGET" : expired ? "TIME" : "OPEN";
    const exit = status === "STOP"
      ? trial.stop_loss
      : status === "TARGET"
        ? trial.target_price
        : price;
    const r = status === "OPEN" ? null : rMultiple({
      direction: trial.direction,
      entry: trial.entry_price,
      exit,
      stop: trial.stop_loss,
    });
    await prisma.$executeRawUnsafe(
      `UPDATE trade_strategy_experiment_trials SET
         last_price = $2,
         max_favorable_price = $3,
         max_adverse_price = $4,
         status = $5,
         exit_price = CASE WHEN $5 = 'OPEN' THEN exit_price ELSE $6 END,
         r_multiple = CASE WHEN $5 = 'OPEN' THEN r_multiple ELSE $7 END,
         closed_at = CASE WHEN $5 = 'OPEN' THEN closed_at ELSE $8 END,
         updated_at = $8
       WHERE id = $1`,
      trial.id,
      price,
      favorable,
      adverse,
      status,
      exit,
      r,
      now
    );
    if (status !== "OPEN") closed += 1;
  }
  return closed;
}

function maxDrawdownPct(values: number[]): number | null {
  if (!values.length) return null;
  let peak = values[0] ?? 0;
  let max = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) max = Math.max(max, (peak - value) / peak * 100);
  }
  return round(max, 2);
}

function performanceFromRows(strategyType: ThreeHorizonStrategyType, rows: MetricRow[]): StrategyPerformanceMetrics {
  const selected = rows.filter((row) => row.strategy_type === strategyType);
  const wins = selected.filter((row) => row.net_pnl_usdt > 0);
  const losses = selected.filter((row) => row.net_pnl_usdt < 0);
  const grossProfit = wins.reduce((sum, row) => sum + row.net_pnl_usdt, 0);
  const grossLoss = Math.abs(losses.reduce((sum, row) => sum + row.net_pnl_usdt, 0));
  const rValues = selected.map((row) => row.r_multiple).filter((value): value is number => value != null);
  const equityCurve: number[] = [];
  let cumulative = 0;
  for (const row of selected) {
    cumulative += row.net_pnl_usdt;
    equityCurve.push(cumulative);
  }
  return {
    strategyType,
    closedTrades: selected.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct: selected.length ? round(wins.length / selected.length * 100, 1) : null,
    grossPnlUsdt: round(selected.reduce((sum, row) => sum + row.gross_pnl_usdt, 0), 2),
    feesUsdt: round(selected.reduce((sum, row) => sum + Math.abs(row.open_fee_usdt) + Math.abs(row.close_fee_usdt), 0), 2),
    fundingUsdt: round(selected.reduce((sum, row) => sum + row.funding_usdt, 0), 2),
    cashDividendUsdt: round(selected.reduce((sum, row) => sum + row.cash_dividend_usdt, 0), 2),
    netPnlUsdt: round(selected.reduce((sum, row) => sum + row.net_pnl_usdt, 0), 2),
    averageR: rValues.length ? round(rValues.reduce((sum, value) => sum + value, 0) / rValues.length, 3) : null,
    expectancyR: rValues.length ? round(rValues.reduce((sum, value) => sum + value, 0) / rValues.length, 3) : null,
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss, 3) : grossProfit > 0 ? 999 : null,
    maxDrawdownPct: maxDrawdownPct(equityCurve),
    averageEntrySlippageBps: selected.length
      ? round(selected.reduce((sum, row) => sum + row.entry_slippage_bps, 0) / selected.length, 2)
      : null,
    sampleReady: selected.length >= MIN_CLOSED_TRADES,
  };
}

async function performanceMetrics(): Promise<StrategyPerformanceMetrics[]> {
  if (!prisma) return STRATEGY_TYPES.map((type) => performanceFromRows(type, []));
  const rows = await prisma.$queryRawUnsafe<MetricRow[]>(`
    SELECT * FROM trade_strategy_trade_metrics ORDER BY closed_at ASC NULLS LAST
  `);
  return STRATEGY_TYPES.map((type) => performanceFromRows(type, rows));
}

async function experimentSummaries(): Promise<StrategyExperimentSummary[]> {
  if (!prisma) return [];
  const [experiments, trials] = await Promise.all([
    prisma.$queryRawUnsafe<ExperimentRow[]>(`
      SELECT * FROM trade_strategy_experiments ORDER BY strategy_type, confidence_delta
    `),
    prisma.$queryRawUnsafe<TrialRow[]>(`
      SELECT * FROM trade_strategy_experiment_trials ORDER BY created_at ASC
    `),
  ]);
  return experiments.map((experiment) => {
    const rows = trials.filter((row) => row.experiment_id === experiment.id);
    const closed = rows.filter((row) => row.status !== "OPEN" && row.r_multiple != null);
    const wins = closed.filter((row) => finite(row.r_multiple) > 0);
    const losses = closed.filter((row) => finite(row.r_multiple) < 0);
    const grossProfit = wins.reduce((sum, row) => sum + finite(row.r_multiple), 0);
    const grossLoss = Math.abs(losses.reduce((sum, row) => sum + finite(row.r_multiple), 0));
    const averageR = closed.length
      ? closed.reduce((sum, row) => sum + finite(row.r_multiple), 0) / closed.length
      : null;
    return {
      id: experiment.id,
      strategyType: experiment.strategy_type,
      name: experiment.name,
      version: experiment.version,
      enabled: experiment.enabled,
      confidenceDelta: experiment.confidence_delta,
      description: experiment.description,
      openTrials: rows.filter((row) => row.status === "OPEN").length,
      closedTrials: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRatePct: closed.length ? round(wins.length / closed.length * 100, 1) : null,
      averageR: averageR == null ? null : round(averageR, 3),
      expectancyR: averageR == null ? null : round(averageR, 3),
      profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss, 3) : grossProfit > 0 ? 999 : null,
    };
  });
}

async function snapshotHealth(now: Date): Promise<{
  snapshotCount: number;
  stableDays: number;
  heartbeatAvailabilityPct: number | null;
  maxAccountDrawdownPct: number | null;
}> {
  if (!prisma) return { snapshotCount: 0, stableDays: 0, heartbeatAvailabilityPct: null, maxAccountDrawdownPct: null };
  const rows = await prisma.$queryRawUnsafe<SnapshotRow[]>(`
    SELECT equity_usdt, captured_at
    FROM trade_strategy_equity_snapshots
    WHERE captured_at >= NOW() - INTERVAL '30 days'
    ORDER BY captured_at ASC
  `);
  if (!rows.length) return { snapshotCount: 0, stableDays: 0, heartbeatAvailabilityPct: null, maxAccountDrawdownPct: null };
  const first = new Date(rows[0]?.captured_at ?? now).getTime();
  const stableDays = Math.max(0, Math.floor((now.getTime() - first) / 86_400_000));
  const elapsedMinutes = Math.max(5, (now.getTime() - first) / 60_000);
  const expected = Math.max(1, Math.floor(elapsedMinutes / 5) + 1);
  const availability = Math.min(100, rows.length / expected * 100);
  const equity = rows.map((row) => finite(row.equity_usdt, NaN)).filter(Number.isFinite);
  return {
    snapshotCount: rows.length,
    stableDays,
    heartbeatAvailabilityPct: round(availability, 2),
    maxAccountDrawdownPct: maxDrawdownPct(equity),
  };
}

async function eventCounts(): Promise<{ critical: number; warnings: number; recent: StrategyReconciliationEvent[] }> {
  if (!prisma) return { critical: 0, warnings: 0, recent: [] };
  const [criticalRows, warningRows, recentRows] = await Promise.all([
    prisma.$queryRawUnsafe<CountRow[]>(`
      SELECT COUNT(*) AS count FROM trade_strategy_reconciliation_events
      WHERE resolved = FALSE AND severity = 'CRITICAL'
    `),
    prisma.$queryRawUnsafe<CountRow[]>(`
      SELECT COUNT(*) AS count FROM trade_strategy_reconciliation_events
      WHERE resolved = FALSE AND severity = 'WARNING'
    `),
    prisma.$queryRawUnsafe<ReconciliationEventRow[]>(`
      SELECT * FROM trade_strategy_reconciliation_events
      ORDER BY resolved ASC, updated_at DESC LIMIT 30
    `),
  ]);
  return {
    critical: countValue(criticalRows[0]?.count),
    warnings: countValue(warningRows[0]?.count),
    recent: recentRows.map((row) => ({
      id: row.id,
      severity: row.severity,
      code: row.code,
      symbol: row.symbol,
      decisionId: row.decision_id,
      message: row.message,
      resolved: row.resolved,
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
      resolvedAt: iso(row.resolved_at),
    })),
  };
}

function buildInvariants(input: {
  health: Awaited<ReturnType<typeof snapshotHealth>>;
  performance: StrategyPerformanceMetrics[];
  critical: number;
  warnings: number;
}): StrategyValidationInvariant[] {
  const invariants: StrategyValidationInvariant[] = [
    {
      key: "REAL_TRADING_LOCK",
      label: "真钱执行锁",
      ok: true,
      severity: "CRITICAL",
      current: "永久锁定",
      required: "必须锁定",
      message: "Phase 3没有真钱API入口，也不会根据验收结果自动解锁真钱。",
    },
    {
      key: "STABLE_DAYS",
      label: "连续稳定运行",
      ok: input.health.stableDays >= REQUIRED_STABLE_DAYS,
      severity: "WARNING",
      current: `${input.health.stableDays}天`,
      required: `至少${REQUIRED_STABLE_DAYS}天`,
      message: "按每5分钟服务器快照计算，不以浏览器在线时间代替。",
    },
    {
      key: "HEARTBEAT_AVAILABILITY",
      label: "服务器心跳可用率",
      ok: (input.health.heartbeatAvailabilityPct ?? 0) >= REQUIRED_HEARTBEAT_PCT,
      severity: "CRITICAL",
      current: input.health.heartbeatAvailabilityPct == null ? "暂无样本" : `${input.health.heartbeatAvailabilityPct}%`,
      required: `≥${REQUIRED_HEARTBEAT_PCT}%`,
      message: "按5分钟采样窗口估算，缺失快照会降低可用率。",
    },
    {
      key: "ACCOUNT_DRAWDOWN",
      label: "账户最大回撤",
      ok: input.health.maxAccountDrawdownPct != null && input.health.maxAccountDrawdownPct <= MAX_ACCEPTABLE_DRAWDOWN_PCT,
      severity: "CRITICAL",
      current: input.health.maxAccountDrawdownPct == null ? "暂无样本" : `${input.health.maxAccountDrawdownPct}%`,
      required: `≤${MAX_ACCEPTABLE_DRAWDOWN_PCT}%`,
      message: "使用Bitget Demo账户权益快照计算峰值到谷值回撤。",
    },
    {
      key: "RECONCILIATION_CRITICAL",
      label: "重复订单、孤儿仓位、无保护仓位",
      ok: input.critical === 0,
      severity: "CRITICAL",
      current: `${input.critical}项严重异常`,
      required: "0项",
      message: input.warnings ? `另有${input.warnings}项需人工确认的警告。` : "当前没有未解决的严重对账异常。",
    },
  ];
  for (const metric of input.performance) {
    const label = metric.strategyType === "INTRADAY" ? "短线" : metric.strategyType === "SWING" ? "波段" : "中长期";
    invariants.push({
      key: `${metric.strategyType}_SAMPLE`,
      label: `${label}已平仓样本`,
      ok: metric.closedTrades >= MIN_CLOSED_TRADES,
      severity: "WARNING",
      current: `${metric.closedTrades}笔`,
      required: `至少${MIN_CLOSED_TRADES}笔`,
      message: "只统计与Bitget Demo历史仓位成功匹配、含费用和资金费的平仓记录。",
    });
    invariants.push({
      key: `${metric.strategyType}_EXPECTANCY`,
      label: `${label}净期望与利润因子`,
      ok: metric.sampleReady && (metric.expectancyR ?? -999) > 0 && (metric.profitFactor ?? 0) >= 1.1,
      severity: "WARNING",
      current: `期望${metric.expectancyR ?? "—"}R / PF ${metric.profitFactor ?? "—"}`,
      required: "样本达标、期望>0、PF≥1.1",
      message: "没有足够样本时不会用漂亮的短期胜率替代正式验收。",
    });
  }
  return invariants;
}

export async function setStrategyExperimentEnabled(id: string, enabled: boolean): Promise<void> {
  if (!(await ensureStrategyValidationTables()) || !prisma) throw new Error("Phase 3数据库未连接");
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE trade_strategy_experiments SET enabled = $2, updated_at = NOW() WHERE id = $1`,
    id,
    enabled
  );
  if (updated !== 1) throw new Error("找不到指定影子实验");
}

export async function runStrategyValidationCycle(input: {
  now?: Date;
  source?: "CRON" | "ADMIN" | "SYSTEM";
  quotes?: BitgetDemoMarketQuote[];
} = {}): Promise<StrategyValidationCycleReport> {
  const now = input.now ?? new Date();
  const source = input.source ?? "CRON";
  const runId = `val_${randomUUID()}`;
  const startedAt = now.toISOString();
  if (!(await ensureStrategyValidationTables()) || !prisma) {
    throw new Error("Phase 3模拟验收数据库未连接");
  }
  try {
    const [decisions, positions, protections, closed] = await Promise.all([
      listActiveDecisions(),
      getBitgetDemoCurrentPositions(),
      getBitgetDemoPendingStrategyOrders(),
      getBitgetDemoClosedPositions(100),
    ]);
    const issues = await currentIssues({ decisions, positions, protections, now });
    await persistIssues(runId, issues, now);
    const snapshotWritten = await maybeWriteSnapshot({ now, positions, protections });
    const closedMetricsUpserted = await upsertClosedMetrics(closed, now);
    await upsertDailyReports();
    const experimentTrialsOpened = await openExperimentTrials(now);
    const experimentQuotes = input.quotes && input.quotes.length > 0
      ? input.quotes
      : await getBitgetDemoMarketQuotes(["BTCUSDT", "ETHUSDT"]);
    const experimentTrialsClosed = await closeExperimentTrials(experimentQuotes, now);
    const criticalIssues = issues.filter((row) => row.severity === "CRITICAL").length;
    const warningIssues = issues.filter((row) => row.severity === "WARNING").length;
    const report: StrategyValidationCycleReport = {
      ok: criticalIssues === 0,
      runId,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      snapshotWritten,
      activeDecisions: decisions.length,
      currentPositions: positions.length,
      protectedPositions: protections.length,
      closedMetricsUpserted,
      experimentTrialsOpened,
      experimentTrialsClosed,
      criticalIssues,
      warningIssues,
      message: `Phase 3完成权益采样、订单持仓对账、净收益归档和A/B影子追踪；严重异常${criticalIssues}项，警告${warningIssues}项。`,
    };
    await prisma.$executeRawUnsafe(
      `UPDATE trade_strategy_validation_state SET
         last_run_at = $1,
         last_success_at = $1,
         consecutive_errors = 0,
         real_trading_locked = TRUE,
         last_report = $2::jsonb,
         updated_at = $1
       WHERE id = 'default'`,
      now,
      JSON.stringify(report)
    );
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phase 3验收周期失败";
    await prisma.$executeRawUnsafe(
      `UPDATE trade_strategy_validation_state SET
         last_run_at = $1,
         consecutive_errors = consecutive_errors + 1,
         real_trading_locked = TRUE,
         last_report = $2::jsonb,
         updated_at = $1
       WHERE id = 'default'`,
      now,
      JSON.stringify({ ok: false, runId, source, message })
    ).catch(() => undefined);
    throw error;
  }
}

export async function getStrategyValidationDashboard(
  now = new Date()
): Promise<StrategyValidationDashboard> {
  const databaseReady = await ensureStrategyValidationTables();
  if (!databaseReady || !prisma) {
    return {
      databaseReady: false,
      generatedAt: now.toISOString(),
      phase: "DEMO_VALIDATION_PHASE3",
      realTradingLocked: true,
      realTradingNotice: "Phase 3始终锁定真钱执行；当前数据库未连接。",
      gateStatus: "BLOCKED",
      gateLabel: "数据库未连接",
      stableDays: 0,
      heartbeatAvailabilityPct: null,
      maxAccountDrawdownPct: null,
      snapshotCount: 0,
      unresolvedCriticalEvents: 0,
      unresolvedWarningEvents: 0,
      invariants: [],
      performance: [],
      experiments: [],
      recentEvents: [],
      lastCycleAt: null,
      lastCycleOk: false,
      lastCycleMessage: "等待数据库迁移。",
    };
  }
  const [health, performance, events, experiments, stateRows] = await Promise.all([
    snapshotHealth(now),
    performanceMetrics(),
    eventCounts(),
    experimentSummaries(),
    prisma.$queryRawUnsafe<ValidationStateRow[]>(`
      SELECT * FROM trade_strategy_validation_state WHERE id = 'default' LIMIT 1
    `),
  ]);
  const invariants = buildInvariants({
    health,
    performance,
    critical: events.critical,
    warnings: events.warnings,
  });
  const allReady = invariants.every((row) => row.ok);
  const collecting = health.stableDays < REQUIRED_STABLE_DAYS || performance.some((row) => !row.sampleReady);
  const gateStatus = allReady ? "DEMO_VALIDATED" : collecting ? "COLLECTING" : "BLOCKED";
  const state = stateRows[0];
  const report = parseJson<{ ok?: boolean; message?: string }>(state?.last_report, {});
  return {
    databaseReady: true,
    generatedAt: now.toISOString(),
    phase: "DEMO_VALIDATION_PHASE3",
    realTradingLocked: true,
    realTradingNotice: "只验证Bitget Demo。即使全部验收项通过，本阶段也不会自动创建、读取或启用真钱API。",
    gateStatus,
    gateLabel: gateStatus === "DEMO_VALIDATED"
      ? "Demo验收通过（仍禁止真钱）"
      : gateStatus === "COLLECTING"
        ? "正在积累样本"
        : "验收被安全项拦截",
    stableDays: health.stableDays,
    heartbeatAvailabilityPct: health.heartbeatAvailabilityPct,
    maxAccountDrawdownPct: health.maxAccountDrawdownPct,
    snapshotCount: health.snapshotCount,
    unresolvedCriticalEvents: events.critical,
    unresolvedWarningEvents: events.warnings,
    invariants,
    performance,
    experiments,
    recentEvents: events.recent,
    lastCycleAt: iso(state?.last_run_at),
    lastCycleOk: Boolean(report.ok),
    lastCycleMessage: String(report.message ?? "尚未运行Phase 3验收周期。"),
  };
}
