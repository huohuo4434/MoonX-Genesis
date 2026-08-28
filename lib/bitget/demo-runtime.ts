import "server-only";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  cancelBitgetDemoStrategyOrder,
  getBitgetDemoCurrentPositions,
  getBitgetDemoEnvironment,
  getBitgetDemoMarketQuotes,
  getBitgetDemoPendingStrategyOrders,
  getBitgetRuntimeAccountBalance,
  getContractConfig,
  normalizeBitgetUsdtSymbol,
  normalizeOrderSize,
  placeBitgetDemoMarketOrder,
  placeBitgetDemoProtectionOrder,
  syncBitgetLiveExperimentStatus,
  readBitgetLiveExperimentStatus,
  type BitgetDemoMarketQuote,
  type BitgetLiveExperimentStatus,
  type BitgetSupportedSymbol,
} from "@/lib/bitget/demo-client";
import {
  getBitgetDemoDashboard,
  getBitgetMirrorSettings,
  syncBitgetDemoOrders,
} from "@/lib/bitget/demo-connector";
import { runPredictionAutoTrader } from "@/lib/trading-signals/prediction-auto-trader";
import {
  getThreeHorizonStrategyDashboard,
  runThreeHorizonStrategyEngine,
} from "@/lib/trading-signals/three-horizon-strategy";
import {
  getStrategyValidationDashboard,
  runStrategyValidationCycle,
} from "@/lib/trading-signals/strategy-validation";
import { runTradingSignalServerMonitor } from "@/lib/trading-signals/server-auto-monitor";
import type { PredictionAutoDecision } from "@/types/prediction-auto-trader";
import type {
  BitgetRuntimeAccountSnapshot,
  BitgetRuntimeDecisionStats,
  BitgetRuntimeEvent,
  BitgetRuntimeLevel,
  BitgetRuntimeQuote,
  BitgetRuntimeRunReport,
  BitgetRuntimeSource,
  BitgetRuntimeStage,
  BitgetRuntimeState,
  BitgetSmokeTestReport,
} from "@/types/bitget-demo-runtime";
import {
  acquireRuntimeLease,
  releaseRuntimeLease,
  type RuntimeLeaseStore,
} from "@/lib/bitget/runtime-lease-core";
import {
  composeRuntimePauseMessage,
  normalizeUnifiedLiveGateCodes,
} from "@/lib/bitget/runtime-observability-core";
import {
  buildRuntimeDeadlinePolicy,
  canStartNewEntry,
  finalizeRuntimeOwner,
  readAuthoritativeRuntimeExecutionControl,
  releaseOwnerOrThrow,
  runRuntimeStartupSafetySequence,
} from "@/lib/bitget/runtime-deadline-core";
import {
  captureWallClockRunTiming,
  resolveRuntimeEngineFailureGate,
} from "@/lib/trading-signals/strategy-runtime-progress-core";

const DEFAULT_SYMBOLS: BitgetSupportedSymbol[] = ["BTCUSDT", "ETHUSDT", "HYPEUSDT"];
const HEARTBEAT_HEALTH_SECONDS = 180;
const QUOTE_HEALTH_SECONDS = 180;
const API_FAILURE_PAUSE_THRESHOLD = 5;
const ORDER_FAILURE_PAUSE_THRESHOLD = 2;
const AUTO_RECOVERY_HEALTHY_RUNS = 2;
// Longer than the longest 300-second server route. Owner fencing below prevents
// a stale invocation from releasing a newer invocation's lease.
const LOCK_SECONDS = 330;
const EVENT_RETENTION_DAYS = 14;
// Keep every live pass bounded so the one-minute cron can rotate through the
// universe instead of timing out after repeatedly evaluating only its first symbol.
const LIVE_STRATEGY_SYMBOLS_PER_RUN = Math.max(1, Math.min(4, Math.floor(Number(
  process.env.MOOX_LIVE_STRATEGY_SYMBOLS_PER_RUN_V72010 ?? 4
) || 4)));
const LIVE_STRATEGY_BUDGET_MS = 55_000;

interface RuntimeStateRow {
  paused: boolean;
  pause_reason: string;
  run_lock_until: Date | string | null;
  last_heartbeat_at: Date | string | null;
  last_market_at: Date | string | null;
  last_strategy_at: Date | string | null;
  last_reconcile_at: Date | string | null;
  last_order_attempt_at: Date | string | null;
  last_order_success_at: Date | string | null;
  latest_quotes: unknown;
  account_snapshot: unknown;
  decision_stats: unknown;
  last_report: unknown;
  consecutive_api_errors: number;
  consecutive_order_errors: number;
  consecutive_healthy_runs: number;
  pause_source: string;
  last_market_error: string;
  last_account_error: string;
  last_error: string;
  updated_at: Date | string;
}

interface RuntimeEventRow {
  id: string;
  run_id: string;
  stage: BitgetRuntimeStage;
  level: BitgetRuntimeLevel;
  symbol: string | null;
  action: string;
  message: string;
  payload: unknown;
  created_at: Date | string;
}

interface CountRow {
  scan_runs: bigint | number | string;
  symbols_evaluated: bigint | number | string;
  confidence_blocked: bigint | number | string;
  alignment_blocked: bigint | number | string;
  trigger_waiting: bigint | number | string;
  risk_blocked: bigint | number | string;
  market_errors: bigint | number | string;
  order_attempts: bigint | number | string;
  executed: bigint | number | string;
}

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeJson<T>(value: unknown, fallback: T): T {
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

function count(value: bigint | number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ageSeconds(value: string | null, now: Date): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 1000));
}

function emptyDecisionStats(): BitgetRuntimeDecisionStats {
  return {
    scanRuns: 0,
    symbolsEvaluated: 0,
    confidenceBlocked: 0,
    alignmentBlocked: 0,
    triggerWaiting: 0,
    riskBlocked: 0,
    marketErrors: 0,
    orderAttempts: 0,
    executed: 0,
  };
}

function emptyAccount(message = "尚未完成Bitget账户对账。"):
  BitgetRuntimeAccountSnapshot {
  return {
    connected: false,
    availableUsdt: null,
    equityUsdt: null,
    detectedUsdt: null,
    positionsCount: 0,
    pendingStrategyOrdersCount: 0,
    checkedAt: null,
    message,
  };
}

let ensured = false;
export async function ensureBitgetRuntimeTables(): Promise<boolean> {
  if (!prisma) return false;
  if (ensured) return true;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_bitget_runtime_state (
        id TEXT PRIMARY KEY,
        paused BOOLEAN NOT NULL DEFAULT FALSE,
        pause_reason TEXT NOT NULL DEFAULT '',
        run_lock_until TIMESTAMPTZ,
        run_lock_owner TEXT,
        last_heartbeat_at TIMESTAMPTZ,
        last_market_at TIMESTAMPTZ,
        last_strategy_at TIMESTAMPTZ,
        last_reconcile_at TIMESTAMPTZ,
        last_order_attempt_at TIMESTAMPTZ,
        last_order_success_at TIMESTAMPTZ,
        latest_quotes JSONB NOT NULL DEFAULT '[]'::jsonb,
        account_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        decision_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_report JSONB,
        consecutive_api_errors INTEGER NOT NULL DEFAULT 0,
        consecutive_order_errors INTEGER NOT NULL DEFAULT 0,
        consecutive_healthy_runs INTEGER NOT NULL DEFAULT 0,
        pause_source TEXT NOT NULL DEFAULT '',
        last_market_error TEXT NOT NULL DEFAULT '',
        last_account_error TEXT NOT NULL DEFAULT '',
        last_error TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO trade_bitget_runtime_state (id)
      VALUES ('default') ON CONFLICT (id) DO NOTHING
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE trade_bitget_runtime_state ADD COLUMN IF NOT EXISTS consecutive_healthy_runs INTEGER NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE trade_bitget_runtime_state ADD COLUMN IF NOT EXISTS pause_source TEXT NOT NULL DEFAULT ''`);
    await prisma.$executeRawUnsafe(`ALTER TABLE trade_bitget_runtime_state ADD COLUMN IF NOT EXISTS last_market_error TEXT NOT NULL DEFAULT ''`);
    await prisma.$executeRawUnsafe(`ALTER TABLE trade_bitget_runtime_state ADD COLUMN IF NOT EXISTS last_account_error TEXT NOT NULL DEFAULT ''`);
    await prisma.$executeRawUnsafe(`ALTER TABLE trade_bitget_runtime_state ADD COLUMN IF NOT EXISTS run_lock_owner TEXT`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_bitget_runtime_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        level TEXT NOT NULL,
        symbol TEXT,
        action TEXT NOT NULL,
        message TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_bitget_runtime_events_time_idx
      ON trade_bitget_runtime_events(created_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_bitget_runtime_events_stage_idx
      ON trade_bitget_runtime_events(stage, created_at DESC)
    `);
    // Only migrate untouched legacy defaults. Existing administrator choices are preserved.
    await prisma.$executeRawUnsafe(`
      UPDATE trade_risk_settings SET
        risk_per_trade_pct = 0.5,
        max_position_pct = 10,
        star_3_position_pct = 3,
        star_4_position_pct = 6,
        star_5_position_pct = 10,
        daily_loss_stop_pct = 1,
        max_consecutive_losses = 3,
        updated_at = NOW()
      WHERE id = 'default'
        AND risk_per_trade_pct = 1
        AND max_position_pct = 20
        AND star_3_position_pct = 5
        AND star_4_position_pct = 12
        AND star_5_position_pct = 20
    `).catch(() => undefined);
    ensured = true;
    return true;
  } catch (error) {
    console.error("Bitget runtime tables unavailable", error);
    return false;
  }
}

async function recordEvent(input: {
  runId: string;
  stage: BitgetRuntimeStage;
  level: BitgetRuntimeLevel;
  action: string;
  message: string;
  symbol?: string | null;
  payload?: Record<string, unknown> | null;
}): Promise<void> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) return;
  await prisma.$executeRaw`
    INSERT INTO trade_bitget_runtime_events (
      id, run_id, stage, level, symbol, action, message, payload, created_at
    ) VALUES (
      ${`bgre_${randomUUID()}`}, ${input.runId}, ${input.stage}, ${input.level},
      ${input.symbol ?? null}, ${input.action}, ${input.message},
      ${input.payload ? JSON.stringify(input.payload) : null}::jsonb, NOW()
    )
  `;
}

const runtimeLeaseStore: RuntimeLeaseStore = {
  async tryAcquire(owner, leaseSeconds) {
    if (!(await ensureBitgetRuntimeTables()) || !prisma) return false;
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE trade_bitget_runtime_state
       SET run_lock_until = NOW() + make_interval(secs => $2::int),
           run_lock_owner = $1,
           last_heartbeat_at = NOW(),
           updated_at = NOW()
       WHERE id = 'default'
         AND (run_lock_until IS NULL OR run_lock_until < NOW())
       RETURNING id`,
      owner,
      leaseSeconds
    );
    return rows.length > 0;
  },
  async release(owner) {
    if (!prisma) return false;
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE trade_bitget_runtime_state
       SET run_lock_until = NULL,
           run_lock_owner = NULL,
           updated_at = NOW()
       WHERE id = 'default' AND run_lock_owner = $1
       RETURNING id`,
      owner
    );
    return rows.length > 0;
  },
};

async function acquireRuntimeLock(owner: string): Promise<boolean> {
  return acquireRuntimeLease(runtimeLeaseStore, owner, LOCK_SECONDS);
}

async function releaseRuntimeLock(owner: string): Promise<boolean> {
  return releaseRuntimeLease(runtimeLeaseStore, owner);
}

async function readStateRow(): Promise<RuntimeStateRow | undefined> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) return undefined;
  const rows = await prisma.$queryRawUnsafe<RuntimeStateRow[]>(
    `SELECT * FROM trade_bitget_runtime_state WHERE id = 'default' LIMIT 1`
  );
  return rows[0];
}

async function readRuntimeExecutionControl(): Promise<{ paused: boolean; pauseReason: string }> {
  const adapter = prisma;
  if (!adapter) throw new Error("RUNTIME_EXECUTION_CONTROL_STORE_UNAVAILABLE");
  return readAuthoritativeRuntimeExecutionControl(() => adapter.$queryRaw<Array<{
    paused: boolean;
    pause_reason: string | null;
  }>>`
    SELECT paused, pause_reason
     FROM trade_bitget_runtime_state
     WHERE id = ${"default"}
     LIMIT 1
  `);
}

async function listEvents(limit = 50): Promise<BitgetRuntimeEvent[]> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) return [];
  const rows = await prisma.$queryRawUnsafe<RuntimeEventRow[]>(
    `SELECT id, run_id, stage, level, symbol, action, message, payload, created_at
     FROM trade_bitget_runtime_events
     ORDER BY created_at DESC
     LIMIT $1`,
    Math.max(1, Math.min(200, Math.floor(limit)))
  );
  return rows.map((row: RuntimeEventRow) => ({
    id: row.id,
    runId: row.run_id,
    stage: row.stage,
    level: row.level,
    symbol: row.symbol,
    action: row.action,
    message: row.message,
    payload: safeJson<Record<string, unknown> | null>(row.payload, null),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  }));
}

async function todayDecisionStats(): Promise<BitgetRuntimeDecisionStats> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) return emptyDecisionStats();
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(`
    SELECT
      COUNT(*) FILTER (WHERE stage = 'STRATEGY' AND action = 'RUN') AS scan_runs,
      COUNT(*) FILTER (WHERE stage = 'STRATEGY' AND action <> 'RUN') AS symbols_evaluated,
      COUNT(*) FILTER (WHERE stage = 'STRATEGY' AND action = 'CONFIDENCE_BLOCKED') AS confidence_blocked,
      COUNT(*) FILTER (WHERE stage = 'STRATEGY' AND action = 'ALIGNMENT_BLOCKED') AS alignment_blocked,
      COUNT(*) FILTER (WHERE stage = 'STRATEGY' AND action = 'TRIGGER_WAITING') AS trigger_waiting,
      COUNT(*) FILTER (WHERE stage = 'STRATEGY' AND action = 'RISK_BLOCKED') AS risk_blocked,
      COUNT(*) FILTER (WHERE stage = 'MARKET' AND level = 'ERROR') AS market_errors,
      COUNT(*) FILTER (WHERE stage = 'ORDER' AND action = 'ATTEMPT') AS order_attempts,
      COUNT(*) FILTER (WHERE stage = 'STRATEGY' AND action = 'EXECUTED') AS executed
    FROM trade_bitget_runtime_events
    WHERE timezone('Asia/Shanghai', created_at)::date = timezone('Asia/Shanghai', NOW())::date
  `);
  const row = rows[0];
  if (!row) return emptyDecisionStats();
  return {
    scanRuns: count(row.scan_runs),
    symbolsEvaluated: count(row.symbols_evaluated),
    confidenceBlocked: count(row.confidence_blocked),
    alignmentBlocked: count(row.alignment_blocked),
    triggerWaiting: count(row.trigger_waiting),
    riskBlocked: count(row.risk_blocked),
    marketErrors: count(row.market_errors),
    orderAttempts: count(row.order_attempts),
    executed: count(row.executed),
  };
}

function classifyDecision(decision: PredictionAutoDecision): string {
  if (decision.status === "EXECUTED") return "EXECUTED";
  if (decision.action === "MARKET_ERROR") return "MARKET_ERROR";
  if (/置信度不足/.test(decision.message)) return "CONFIDENCE_BLOCKED";
  if (/日周|共振|方向没有形成|方向冲突/.test(decision.message)) return "ALIGNMENT_BLOCKED";
  if (decision.status === "BLOCKED" || /风控|上限|禁止|失效/.test(decision.message)) {
    return "RISK_BLOCKED";
  }
  if (decision.status === "WAITING" || /等待|尚未/.test(decision.message)) return "TRIGGER_WAITING";
  return decision.action || decision.status;
}

async function auditStrategyDecisions(
  runId: string,
  decisions: PredictionAutoDecision[],
  mode: string,
  message: string
): Promise<void> {
  await recordEvent({
    runId,
    stage: "STRATEGY",
    level: "INFO",
    action: "RUN",
    message,
    payload: { mode, decisions: decisions.length },
  });
  for (const decision of decisions) {
    const action = classifyDecision(decision);
    await recordEvent({
      runId,
      stage: decision.action === "MARKET_ERROR" ? "MARKET" : "STRATEGY",
      level:
        decision.status === "ERROR"
          ? "ERROR"
          : decision.status === "EXECUTED"
            ? "SUCCESS"
            : decision.status === "BLOCKED"
              ? "WARNING"
              : "INFO",
      action,
      symbol: decision.symbol,
      message: decision.message,
      payload: {
        status: decision.status,
        sourceAction: decision.action,
        price: decision.price,
        setup: decision.plan.setup,
        confidence: decision.plan.confidence,
        signalId: decision.signalId,
      },
    });
  }
}

type LiveExperimentExitResult = {
  attempted: number;
  success: number;
  errors: number;
  messages: string[];
};

async function closeLiveExperimentExposure(
  runId: string,
  experiment: BitgetLiveExperimentStatus
): Promise<LiveExperimentExitResult> {
  const result: LiveExperimentExitResult = { attempted: 0, success: 0, errors: 0, messages: [] };
  if (!experiment.completed && !experiment.stopped) return result;

  const [positions, pending] = await Promise.all([
    getBitgetDemoCurrentPositions(),
    getBitgetDemoPendingStrategyOrders(),
  ]);

  // 先平仓，确认下一轮已无持仓后再撤保护单。不能先撤止损，否则平仓请求失败时会留下无保护敞口。
  for (const position of positions) {
    const symbol = normalizeBitgetUsdtSymbol(position.symbol);
    if (!symbol || position.total <= 0) continue;
    result.attempted += 1;
    try {
      await placeBitgetDemoMarketOrder({
        paperOrderId: `live-experiment-exit:${experiment.status}:${experiment.startedAt ?? experiment.endsAt ?? "unknown"}:${symbol}:${position.posSide}`,
        symbol,
        quantity: position.total,
        side: position.posSide === "long" ? "sell" : "buy",
        reduceOnly: true,
      });
      result.success += 1;
      result.messages.push(`已提交${symbol}全量平仓，原因：${experiment.stopReason || experiment.status}。保护单暂不撤销，待确认持仓归零后再清理。`);
    } catch (error) {
      result.errors += 1;
      result.messages.push(`提交${symbol}平仓失败：${error instanceof Error ? error.message : "未知错误"}。现有保护单保持不动。`);
    }
  }

  if (positions.every((position) => position.total <= 0)) {
    for (const order of pending) {
      result.attempted += 1;
      try {
        await cancelBitgetDemoStrategyOrder({
          orderId: order.orderId,
          clientOid: order.clientOid,
          symbol: order.symbol,
        });
        result.success += 1;
        result.messages.push(`持仓已归零，已清理${order.symbol}保护单${order.orderId}。`);
      } catch (error) {
        result.errors += 1;
        result.messages.push(`清理${order.symbol}保护单失败：${error instanceof Error ? error.message : "未知错误"}`);
      }
    }
  }

  for (const message of result.messages) {
    await recordEvent({
      runId,
      stage: "ORDER",
      level: message.includes("失败") ? "ERROR" : "WARNING",
      action: "LIVE_EXPERIMENT_EXIT",
      message,
    });
  }
  return result;
}

async function reconcileAccount(now: Date): Promise<BitgetRuntimeAccountSnapshot> {
  const environment = getBitgetDemoEnvironment();
  if (!environment.configured) return emptyAccount(environment.mode === "LIVE_EXPERIMENT" ? "Bitget实盘密钥尚未配置完整。" : "Bitget Demo密钥尚未配置完整。");
  const [balanceResult, positionsResult, pendingResult] = await Promise.allSettled([
    getBitgetRuntimeAccountBalance(),
    getBitgetDemoCurrentPositions(),
    getBitgetDemoPendingStrategyOrders(),
  ] as const);
  const criticalErrors: string[] = [];
  const warnings: string[] = [];
  if (balanceResult.status === "rejected") {
    criticalErrors.push(`账户资产：${balanceResult.reason instanceof Error ? balanceResult.reason.message : "读取失败"}`);
  }
  if (positionsResult.status === "rejected") {
    criticalErrors.push(`当前持仓：${positionsResult.reason instanceof Error ? positionsResult.reason.message : "读取失败"}`);
  }
  if (pendingResult.status === "rejected") {
    warnings.push(`保护单：${pendingResult.reason instanceof Error ? pendingResult.reason.message : "读取失败"}`);
  }
  const balance = balanceResult.status === "fulfilled" ? balanceResult.value : null;
  const positions = positionsResult.status === "fulfilled" ? positionsResult.value : [];
  const pending = pendingResult.status === "fulfilled" ? pendingResult.value : [];
  const connected = criticalErrors.length === 0;
  return {
    connected,
    availableUsdt: balance?.availableUsdt ?? null,
    equityUsdt: balance?.equityUsdt ?? null,
    detectedUsdt: balance?.detectedUsdt ?? null,
    positionsCount: positions.length,
    pendingStrategyOrdersCount: pending.length,
    checkedAt: now.toISOString(),
    message: criticalErrors.length
      ? `账户关键对账失败：${criticalErrors.join("；")}`
      : warnings.length
        ? `账户和持仓正常；非关键保护单读取告警：${warnings.join("；")}`
        : `${environment.mode === "LIVE_EXPERIMENT" ? "Bitget实盘" : "Bitget Demo"}对账完成：持仓${positions.length}，交易所止盈止损单${pending.length}。`,
  };
}

async function persistRuntimeHealthSnapshot(input: {
  now: Date;
  quotes: BitgetRuntimeQuote[];
  marketEndpointOk: boolean;
  account: BitgetRuntimeAccountSnapshot;
  marketError: string;
  accountError: string;
  message: string;
}): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRaw`
    UPDATE trade_bitget_runtime_state SET
      last_heartbeat_at = ${input.now},
      last_market_at = CASE WHEN ${input.marketEndpointOk} THEN ${input.now} ELSE last_market_at END,
      last_reconcile_at = ${input.now},
      latest_quotes = CASE
        WHEN ${input.quotes.length > 0} THEN ${JSON.stringify(input.quotes)}::jsonb
        ELSE latest_quotes
      END,
      account_snapshot = ${JSON.stringify(input.account)}::jsonb,
      last_market_error = ${input.marketError},
      last_account_error = ${input.accountError},
      last_report = ${JSON.stringify({ stage: "HEALTH_READY", message: input.message })}::jsonb,
      updated_at = NOW()
    WHERE id = 'default'
  `;
}

async function updateRuntimeState(input: {
  now: Date;
  quotes: BitgetRuntimeQuote[];
  marketEndpointOk: boolean;
  strategyRan: boolean;
  account: BitgetRuntimeAccountSnapshot;
  orderAttempted: boolean;
  orderSuccess: boolean;
  criticalApiError: string;
  marketError: string;
  accountError: string;
  diagnosticError: string;
  orderErrors: number;
  report: Record<string, unknown>;
}): Promise<void> {
  if (!prisma) return;
  const previous = await readStateRow();
  const previousApiErrors = Number(previous?.consecutive_api_errors ?? 0);
  const previousOrderErrors = Number(previous?.consecutive_order_errors ?? 0);
  const previousHealthyRuns = Number(previous?.consecutive_healthy_runs ?? 0);
  const nextApiErrors = input.criticalApiError ? previousApiErrors + 1 : 0;
  const nextOrderErrors = input.orderErrors > 0 ? previousOrderErrors + 1 : 0;
  const healthyCycle = input.marketEndpointOk && input.account.connected && input.orderErrors === 0;
  const nextHealthyRuns = healthyCycle ? previousHealthyRuns + 1 : 0;
  const previousReason = String(previous?.pause_reason ?? "");
  const previousSource = String(previous?.pause_source ?? "");
  const legacyAutoPause = !previousSource && /连续2次Bitget/.test(previousReason);
  const wasAutoApiPaused = ["AUTO", "AUTO_API"].includes(previousSource) || legacyAutoPause;
  const wasAutoOrderPaused = previousSource === "AUTO_ORDER";
  const wasManualPaused = Boolean(previous?.paused) && !wasAutoApiPaused && !wasAutoOrderPaused;
  const shouldAutoPause = nextApiErrors >= API_FAILURE_PAUSE_THRESHOLD || nextOrderErrors >= ORDER_FAILURE_PAUSE_THRESHOLD;
  const shouldAutoRecover = Boolean(previous?.paused) && wasAutoApiPaused && nextHealthyRuns >= AUTO_RECOVERY_HEALTHY_RUNS;

  let nextPaused = Boolean(previous?.paused);
  let nextPauseSource = previousSource || (legacyAutoPause ? "AUTO" : previous?.paused ? "MANUAL" : "");
  let nextPauseReason = previousReason;
  if (shouldAutoPause && !wasManualPaused) {
    nextPaused = true;
    nextPauseSource = nextOrderErrors >= ORDER_FAILURE_PAUSE_THRESHOLD ? "AUTO_ORDER" : "AUTO_API";
    nextPauseReason = nextOrderErrors >= ORDER_FAILURE_PAUSE_THRESHOLD
      ? `连续${nextOrderErrors}轮发生真实订单写入错误，系统已暂停新开仓；健康检查恢复后仍需管理员确认订单状态。`
      : `连续${nextApiErrors}轮Bitget关键行情/账户接口重试失败，系统已自动暂停新开仓；连续${AUTO_RECOVERY_HEALTHY_RUNS}轮恢复正常后自动解除。`;
  } else if (shouldAutoRecover) {
    nextPaused = false;
    nextPauseSource = "";
    nextPauseReason = "";
  }

  await prisma.$executeRaw`
    UPDATE trade_bitget_runtime_state SET
      paused = ${nextPaused},
      pause_source = ${nextPauseSource},
      pause_reason = ${nextPauseReason},
      last_heartbeat_at = ${input.now},
      last_market_at = CASE WHEN ${input.marketEndpointOk} THEN ${input.now} ELSE last_market_at END,
      last_strategy_at = CASE WHEN ${input.strategyRan} THEN ${input.now} ELSE last_strategy_at END,
      last_reconcile_at = ${input.now},
      last_order_attempt_at = CASE WHEN ${input.orderAttempted} THEN ${input.now} ELSE last_order_attempt_at END,
      last_order_success_at = CASE WHEN ${input.orderSuccess} THEN ${input.now} ELSE last_order_success_at END,
      latest_quotes = CASE
        WHEN ${input.quotes.length > 0} THEN ${JSON.stringify(input.quotes)}::jsonb
        ELSE latest_quotes
      END,
      account_snapshot = ${JSON.stringify(input.account)}::jsonb,
      last_report = ${JSON.stringify(input.report)}::jsonb,
      consecutive_api_errors = ${nextApiErrors},
      consecutive_order_errors = ${nextOrderErrors},
      consecutive_healthy_runs = ${nextHealthyRuns},
      last_market_error = ${input.marketError},
      last_account_error = ${input.accountError},
      last_error = ${input.diagnosticError || input.criticalApiError || (input.orderErrors > 0 ? `${input.orderErrors}笔真实订单写入失败` : "")},
      updated_at = NOW()
    WHERE id = 'default'
  `;
}

async function cleanupEvents(): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRawUnsafe(`
    DELETE FROM trade_bitget_runtime_events
    WHERE created_at < NOW() - INTERVAL '${EVENT_RETENTION_DAYS} days'
  `);
}

export async function setBitgetRuntimePaused(
  paused: boolean,
  reason = "管理员手动暂停"
): Promise<BitgetRuntimeState> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }
  await prisma.$executeRaw`
    UPDATE trade_bitget_runtime_state SET
      paused = ${paused},
      pause_source = ${paused ? "MANUAL" : ""},
      pause_reason = ${paused ? reason : ""},
      consecutive_api_errors = CASE WHEN ${paused} THEN consecutive_api_errors ELSE 0 END,
      consecutive_order_errors = CASE WHEN ${paused} THEN consecutive_order_errors ELSE 0 END,
      consecutive_healthy_runs = CASE WHEN ${paused} THEN 0 ELSE consecutive_healthy_runs END,
      updated_at = NOW()
    WHERE id = 'default'
  `;
  await recordEvent({
    runId: `admin_${randomUUID()}`,
    stage: "SYSTEM",
    level: paused ? "WARNING" : "SUCCESS",
    action: paused ? "PAUSED" : "RESUMED",
    message: paused ? reason : "管理员已恢复Bitget服务器执行链路。",
  });
  return getBitgetRuntimeState();
}

export async function getBitgetRuntimeState(
  now = new Date()
): Promise<BitgetRuntimeState> {
  const databaseReady = await ensureBitgetRuntimeTables();
  const environment = getBitgetDemoEnvironment();
  const mirror = await getBitgetMirrorSettings().catch(() => ({
    enabled: false,
    startedAt: null,
    updatedAt: now.toISOString(),
  }));
  const row = databaseReady ? await readStateRow() : undefined;
  const latestQuotes = safeJson<BitgetRuntimeQuote[]>(row?.latest_quotes, []);
  const account = safeJson<BitgetRuntimeAccountSnapshot>(row?.account_snapshot, emptyAccount());
  const stats = databaseReady ? await todayDecisionStats() : emptyDecisionStats();
  const lastHeartbeatAt = iso(row?.last_heartbeat_at);
  const lastMarketAt = iso(row?.last_market_at);
  const heartbeatAge = ageSeconds(lastHeartbeatAt, now);
  const quoteAge = ageSeconds(lastMarketAt, now);
  const paused = Boolean(row?.paused);
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const freshQuotesCount = latestQuotes.filter((quote) => {
    const captured = Date.parse(quote.capturedAt);
    return Number.isFinite(captured) && now.getTime() - captured <= QUOTE_HEALTH_SECONDS * 1000;
  }).length;
  const serverHealthy = Boolean(
    databaseReady && cronSecretConfigured && !paused && account.connected && freshQuotesCount > 0 &&
      heartbeatAge != null && heartbeatAge <= HEARTBEAT_HEALTH_SECONDS &&
      quoteAge != null && quoteAge <= QUOTE_HEALTH_SECONDS
  );
  const liveExperiment = environment.mode === "LIVE_EXPERIMENT"
    ? await readBitgetLiveExperimentStatus(now).catch((error) => ({
        enabled: true, active: false, completed: false, stopped: true, status: "STOPPED" as const,
        startedAt: null, endsAt: null, initialEquityUsdt: null, currentEquityUsdt: null, peakEquityUsdt: null,
        pnlUsdt: null, pnlPct: null, maxDrawdownUsdt: null, maxDrawdownPct: null, dailyPnlUsdt: null, dailyPnlPct: null, dailyHistory: [],
        stopReason: error instanceof Error ? error.message : "实盘实验状态读取失败", securityMessage: "",
      }))
    : undefined;
  return {
    databaseReady,
    mode: environment.mode === "LIVE_EXPERIMENT" ? "BITGET_LIVE_EXPERIMENT_REST_CRON" : "BITGET_DEMO_REST_CRON",
    source: "SYSTEM",
    running: row?.run_lock_until ? new Date(row.run_lock_until).getTime() > now.getTime() : false,
    paused,
    pauseReason: String(row?.pause_reason ?? ""),
    pauseSource: String(row?.pause_source ?? ""),
    autoRecoveryHealthyRuns: Number(row?.consecutive_healthy_runs ?? 0),
    serverHealthy,
    cronSecretConfigured,
    configured: environment.configured,
    executionAllowed: environment.executionAllowed,
    mirrorEnabled: Boolean(mirror.enabled),
    testOrderAllowed: environment.testOrderAllowed,
    lastHeartbeatAt,
    lastMarketAt,
    lastStrategyAt: iso(row?.last_strategy_at),
    lastReconcileAt: iso(row?.last_reconcile_at),
    lastOrderAttemptAt: iso(row?.last_order_attempt_at),
    lastOrderSuccessAt: iso(row?.last_order_success_at),
    heartbeatAgeSeconds: heartbeatAge,
    quoteAgeSeconds: quoteAge,
    latestQuotes,
    freshQuotesCount,
    totalSymbols: environment.mode === "LIVE_EXPERIMENT" ? environment.liveAllowedSymbols.length : DEFAULT_SYMBOLS.length,
    account,
    decisionStatsToday: stats,
    consecutiveApiErrors: Number(row?.consecutive_api_errors ?? 0),
    consecutiveOrderErrors: Number(row?.consecutive_order_errors ?? 0),
    lastMarketError: String(row?.last_market_error ?? ""),
    lastAccountError: String(row?.last_account_error ?? ""),
    lastError: String(row?.last_error ?? ""),
    lastReport: safeJson<Record<string, unknown> | null>(row?.last_report, null),
    recentEvents: databaseReady ? await listEvents() : [],
    updatedAt: iso(row?.updated_at) ?? now.toISOString(),
    liveExperiment: liveExperiment ? {
      status: liveExperiment.status, startedAt: liveExperiment.startedAt, endsAt: liveExperiment.endsAt,
      initialEquityUsdt: liveExperiment.initialEquityUsdt, currentEquityUsdt: liveExperiment.currentEquityUsdt,
      pnlUsdt: liveExperiment.pnlUsdt, pnlPct: liveExperiment.pnlPct,
      maxDrawdownUsdt: liveExperiment.maxDrawdownUsdt, maxDrawdownPct: liveExperiment.maxDrawdownPct,
      dailyPnlUsdt: liveExperiment.dailyPnlUsdt, dailyPnlPct: liveExperiment.dailyPnlPct,
      dailyHistory: liveExperiment.dailyHistory, stopReason: liveExperiment.stopReason, securityMessage: liveExperiment.securityMessage,
    } : undefined,
  };
}

/**
 * Refresh only the server liveness / market / account snapshot.
 *
 * SAFETY CONTRACT:
 * - read-only Bitget calls only;
 * - never runs prediction/three-horizon strategy engines;
 * - never places/cancels orders or protection orders;
 * - never changes paused / pause_source / pause_reason;
 * - does not acquire the long trading runtime lock, so AUTO_ORDER recovery
 *   cannot deadlock behind a stale/long-running strategy cycle.
 */
export async function refreshBitgetRuntimeHealthOnly(
  now = new Date(),
  source: "CRON" | "ADMIN" = "CRON"
): Promise<BitgetRuntimeState> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }

  const runId = `bgh_${randomUUID()}`;
  const environment = getBitgetDemoEnvironment();
  const runtimeSymbols = environment.mode === "LIVE_EXPERIMENT" ? environment.liveAllowedSymbols : DEFAULT_SYMBOLS;
  let marketEndpointOk = false;
  let marketError = "";
  let accountError = "";
  let quotes: BitgetRuntimeQuote[] = [];
  let account = emptyAccount();

  const [marketResult, accountResult] = await Promise.allSettled([
    getBitgetDemoMarketQuotes(runtimeSymbols),
    reconcileAccount(now),
  ] as const);

  const completedAt = new Date();
  if (marketResult.status === "fulfilled") {
    marketEndpointOk = true;
    quotes = marketResult.value.filter((quote) => {
      const captured = Date.parse(quote.capturedAt);
      return Number.isFinite(captured) && Math.max(0, completedAt.getTime() - captured) <= QUOTE_HEALTH_SECONDS * 1000;
    });
  } else {
    marketError = marketResult.reason instanceof Error ? marketResult.reason.message : "Bitget行情读取失败";
  }

  if (accountResult.status === "fulfilled") {
    account = accountResult.value;
  } else {
    account = emptyAccount(accountResult.reason instanceof Error ? accountResult.reason.message : "Bitget账户对账失败");
  }
  if (!account.connected) accountError = account.message;

  // Intentionally do not touch paused/pause_source/pause_reason, error counters,
  // strategy timestamps, order timestamps, or the strategy last_report.
  await prisma.$executeRaw`
    UPDATE trade_bitget_runtime_state SET
      last_heartbeat_at = ${completedAt},
      last_market_at = CASE WHEN ${marketEndpointOk} THEN ${completedAt} ELSE last_market_at END,
      last_reconcile_at = ${completedAt},
      latest_quotes = CASE
        WHEN ${quotes.length > 0} THEN ${JSON.stringify(quotes)}::jsonb
        ELSE latest_quotes
      END,
      account_snapshot = ${JSON.stringify(account)}::jsonb,
      last_market_error = ${marketError},
      last_account_error = ${accountError},
      updated_at = NOW()
    WHERE id = 'default'
  `;

  const allQuotesFresh = runtimeSymbols.length > 0 && quotes.length >= runtimeSymbols.length;
  await recordEvent({
    runId,
    stage: "HEARTBEAT",
    level: marketEndpointOk && allQuotesFresh && account.connected ? "SUCCESS" : "WARNING",
    action: "READ_ONLY_HEALTH_REFRESH",
    message: marketEndpointOk
      ? `只读健康刷新完成：行情${quotes.length}/${runtimeSymbols.length}，账户${account.connected ? "正常" : "异常"}；未运行策略、未下单、未解除暂停。`
      : `只读健康刷新完成但行情失败：${marketError || "未知错误"}；未运行策略、未下单、未解除暂停。`,
    payload: {
      source,
      marketEndpointOk,
      freshQuotesCount: quotes.length,
      totalSymbols: runtimeSymbols.length,
      accountConnected: account.connected,
      readOnly: true,
      pausedStateUnchanged: true,
    },
  });

  return getBitgetRuntimeState(completedAt);
}

export async function runBitgetDemoServerRuntime(
  now = new Date(),
  source: BitgetRuntimeSource = "CRON",
  options: { absoluteDeadlineAt?: Date; forceManageOnly?: boolean; forceManageOnlyReason?: string } = {}
): Promise<BitgetRuntimeRunReport> {
  const runtimeTiming = captureWallClockRunTiming({ businessNow: now });
  if (!(await ensureBitgetRuntimeTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }
  const runId = `bgr_${randomUUID()}`;
  const startedAt = runtimeTiming.startedAt;
  const deadlinePolicy = buildRuntimeDeadlinePolicy(options.absoluteDeadlineAt);
  const locked = await acquireRuntimeLock(runId);
  if (!locked) {
    return {
      ok: true,
      locked: true,
      paused: false,
      runId,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      market: { ok: false, quotes: [], message: "上一轮服务器任务仍在运行，本轮跳过。" },
      strategy: null,
      threeHorizon: null,
      validation: null,
      generalSignalMonitor: null,
      mirror: null,
      reconcile: emptyAccount("上一轮任务仍在运行。"),
      memberDeskSync: { ok: true },
      message: "检测到运行锁，本轮未重复执行。",
    };
  }

  const environment = getBitgetDemoEnvironment();
  const runtimeSymbols = environment.mode === "LIVE_EXPERIMENT" ? environment.liveAllowedSymbols : DEFAULT_SYMBOLS;
  let marketOk = false;
  let marketEndpointOk = false;
  let marketMessage = "";
  let marketError = "";
  let quotes: BitgetDemoMarketQuote[] = [];
  let freshSymbols: BitgetSupportedSymbol[] = [];
  let strategy: Awaited<ReturnType<typeof runPredictionAutoTrader>> | null = null;
  let threeHorizon: Awaited<ReturnType<typeof runThreeHorizonStrategyEngine>> | null = null;
  let validation: Awaited<ReturnType<typeof runStrategyValidationCycle>> | null = null;
  let signalMonitor: Awaited<ReturnType<typeof runTradingSignalServerMonitor>> | null = null;
  let mirrorResult: Awaited<ReturnType<typeof syncBitgetDemoOrders>> | null = null;
  let account = emptyAccount();
  let accountError = "";
  const diagnosticErrors: string[] = [];
  let strategyRan = false;
  let finalMessage = "";
  let liveExperiment: BitgetLiveExperimentStatus | null = null;
  let liveExit: LiveExperimentExitResult = { attempted: 0, success: 0, errors: 0, messages: [] };
  let ownerReleased = false;
  let finalizationPersisted = false;
  let finalizationFailureAudited = false;
  let engineFailure = false;

  try {
    const startup = await runRuntimeStartupSafetySequence<BitgetLiveExperimentStatus, LiveExperimentExitResult>({
      readControl: readRuntimeExecutionControl,
      onControlResolved: async ({ controlError }) => {
        if (controlError) {
          engineFailure = true;
          diagnosticErrors.push(controlError.message);
          await recordEvent({
            runId,
            stage: "SYSTEM",
            level: "ERROR",
            action: "RUNTIME_CONTROL_ERROR",
            message: controlError.message,
          });
        }
        await recordEvent({
          runId,
          stage: "HEARTBEAT",
          level: "INFO",
          action: "START",
          message: `${environment.mode === "LIVE_EXPERIMENT" ? "Bitget实盘实验" : "Bitget Demo"}服务器心跳开始，来源${source}。`,
        });
      },
      syncLiveStatus: environment.mode === "LIVE_EXPERIMENT"
        ? (syncOptions) => syncBitgetLiveExperimentStatus(now, {
            allowStart: syncOptions.allowStart && !options.forceManageOnly,
          })
        : undefined,
      onLiveStatus: async (status) => {
        await recordEvent({
          runId,
          stage: "SYSTEM",
          level: status.active ? "SUCCESS" : status.status === "NOT_STARTED" ? "WARNING" : "ERROR",
          action: "LIVE_EXPERIMENT_STATUS",
          message: status.active
            ? `实盘实验运行中，当前权益${(status.currentEquityUsdt ?? 0).toFixed(2)} USDT。`
            : status.stopReason || `实盘实验状态：${status.status}。`,
          payload: status as unknown as Record<string, unknown>,
        });
      },
      closeRiskExposure: (status) => closeLiveExperimentExposure(runId, status),
    });
    const before = startup.control;
    liveExperiment = startup.liveStatus;
    if (startup.riskExit) liveExit = startup.riskExit;

    const [marketResult, accountResult] = await Promise.allSettled([
      getBitgetDemoMarketQuotes(runtimeSymbols),
      reconcileAccount(now),
    ] as const);

    if (marketResult.status === "fulfilled") {
      const fetchedQuotes = marketResult.value;
      marketEndpointOk = true;
      quotes = fetchedQuotes.filter((quote) => {
        const captured = new Date(quote.capturedAt).getTime();
        return Number.isFinite(captured) && Math.max(0, now.getTime() - captured) <= QUOTE_HEALTH_SECONDS * 1000;
      });
      freshSymbols = quotes.map((quote) => quote.symbol);
      marketOk = quotes.length > 0;
      const freshSet = new Set(freshSymbols);
      const staleSymbols = runtimeSymbols.filter((symbol) => !freshSet.has(symbol));
      marketMessage = staleSymbols.length
        ? `Bitget行情接口正常；${quotes.length}/${runtimeSymbols.length}个品种报价在3分钟内更新。暂不扫描：${staleSymbols.join("、")}。`
        : `取得${quotes.length}个时间戳有效的Bitget公开报价。`;
      await recordEvent({
        runId,
        stage: "MARKET",
        level: marketOk ? (staleSymbols.length ? "WARNING" : "SUCCESS") : "WARNING",
        action: "QUOTE",
        message: marketMessage,
        payload: { quotes, staleSymbols },
      });
    } else {
      marketError = marketResult.reason instanceof Error ? marketResult.reason.message : "Bitget行情读取失败";
      marketMessage = marketError;
      diagnosticErrors.push(marketError);
      await recordEvent({
        runId,
        stage: "MARKET",
        level: "ERROR",
        action: "QUOTE_ERROR",
        message: marketError,
      });
    }

    if (accountResult.status === "fulfilled") {
      account = accountResult.value;
    } else {
      account = emptyAccount(accountResult.reason instanceof Error ? accountResult.reason.message : "Bitget账户对账失败");
    }
    if (!account.connected) {
      accountError = account.message;
      diagnosticErrors.push(accountError);
    }
    await recordEvent({
      runId,
      stage: "RECONCILE",
      level: account.connected ? "SUCCESS" : "WARNING",
      action: "ACCOUNT",
      message: account.message,
      payload: {
        availableUsdt: account.availableUsdt,
        equityUsdt: account.equityUsdt,
        positionsCount: account.positionsCount,
        pendingStrategyOrdersCount: account.pendingStrategyOrdersCount,
      },
    });

    const healthMessage = marketOk && account.connected
      ? `行情${quotes.length}/${runtimeSymbols.length}与账户对账已同步，开始本轮策略扫描。`
      : !marketOk
        ? `行情未通过新鲜度检查，本轮只做安全对账，不开新仓。${marketMessage}`
        : `账户对账未通过，本轮禁止新开仓。${account.message}`;
    await persistRuntimeHealthSnapshot({
      now,
      quotes: quotes.map((row) => ({ ...row })),
      marketEndpointOk,
      account,
      marketError,
      accountError,
      message: healthMessage,
    });
    await recordEvent({
      runId,
      stage: "HEARTBEAT",
      level: marketOk && account.connected ? "SUCCESS" : "WARNING",
      action: "HEALTH_SNAPSHOT",
      message: healthMessage,
    });

    const liveAllowsNewEntries = environment.mode !== "LIVE_EXPERIMENT" || liveExperiment?.active === true;
    const forcedManageOnly = Boolean(options.forceManageOnly);
    const forcedManageOnlyReason = normalizeUnifiedLiveGateCodes(options.forceManageOnlyReason);
    const executionPaused = before.paused || forcedManageOnly || !marketOk || !account.connected || !liveAllowsNewEntries;
    if (startup.policy.allowNewEntries && !forcedManageOnly && marketOk && account.connected && liveAllowsNewEntries) {
      if (environment.mode !== "LIVE_EXPERIMENT") {
        const [strategyResult, monitorResult] = await Promise.allSettled([
          runPredictionAutoTrader(now, {
            source: source === "ADMIN" ? "ADMIN" : "CRON",
            skipBitgetSync: true,
          }),
          runTradingSignalServerMonitor({ syncBitget: false }),
        ]);
        if (strategyResult.status === "fulfilled") {
          strategy = strategyResult.value;
          strategyRan = true;
          await auditStrategyDecisions(
            runId,
            strategy.decisions,
            strategy.mode,
            strategy.message
          );
        } else {
          const message = strategyResult.reason instanceof Error
            ? strategyResult.reason.message
            : "预测策略检查失败";
          diagnosticErrors.push(message);
          await recordEvent({ runId, stage: "STRATEGY", level: "ERROR", action: "RUN_ERROR", message });
        }
        if (monitorResult.status === "fulfilled") {
          signalMonitor = monitorResult.value;
        } else {
          await recordEvent({
            runId,
            stage: "STRATEGY",
            level: "ERROR",
            action: "GENERAL_MONITOR_ERROR",
            message: monitorResult.reason instanceof Error
              ? monitorResult.reason.message
              : "站内信号监控失败",
          });
        }
      }


      try {
        threeHorizon = await runThreeHorizonStrategyEngine(
          now,
          source === "ADMIN" ? "ADMIN" : "CRON",
          {
            eligibleSymbols: freshSymbols,
            quotes,
            maxNewSymbols: environment.mode === "LIVE_EXPERIMENT" ? LIVE_STRATEGY_SYMBOLS_PER_RUN : undefined,
            deadlineAt: environment.mode === "LIVE_EXPERIMENT"
              ? new Date(Math.min(Date.now() + LIVE_STRATEGY_BUDGET_MS, deadlinePolicy.newEntryCutoffMs))
              : undefined,
            newEntryCutoffAt: Number.isFinite(deadlinePolicy.newEntryCutoffMs)
              ? new Date(deadlinePolicy.newEntryCutoffMs)
              : undefined,
            progressStartedAtMs: runtimeTiming.startedAtMs,
            progressElapsedMs: runtimeTiming.elapsedMs,
            manageOnly: !canStartNewEntry(deadlinePolicy),
            onProgress: async (progress) => {
              await recordEvent({
                runId,
                stage: "STRATEGY",
                level: "INFO",
                action: "THREE_HORIZON_PROGRESS",
                message: `三周期策略阶段${progress.stage}，累计${progress.elapsedMs}ms。`,
                payload: {
                  strategyStage: progress.stage,
                  elapsedMs: progress.elapsedMs,
                  ...progress.detail,
                },
              });
            },
          }
        );
        strategyRan = true;
        if (!threeHorizon.ok) engineFailure = true;
        await recordEvent({
          runId,
          stage: "STRATEGY",
          level: threeHorizon.ok ? "SUCCESS" : "WARNING",
          action: "THREE_HORIZON",
          message: threeHorizon.message,
          payload: {
            scannedStrategies: threeHorizon.scannedStrategies,
            decisions: threeHorizon.decisions.length,
            orderAttempts: threeHorizon.orderAttempts,
            orderSuccess: threeHorizon.orderSuccess,
            orderErrors: threeHorizon.orderErrors,
            executionFailures: threeHorizon.decisions
              .filter((decision) => [
                "ORDER_ERROR",
                "ACCOUNT_CONFIG_BLOCK",
                "ORDER_STATUS_UNKNOWN",
                "STATUS_QUERY_BLOCK",
                "ORDER_PREFLIGHT_BLOCK",
              ].includes(decision.rejectionCode))
              .slice(0, 10)
              .map((decision) => ({
                symbol: decision.symbol,
                action: "OPEN_MARKET",
                clientOid: decision.clientOid ?? null,
                rejectionCode: decision.rejectionCode,
                lastError: decision.rejectionReason,
              })),
          },
        });
        if (threeHorizon.orderErrors > 0) {
          const remoteWriteDetails = threeHorizon.decisions
            .filter((decision) => decision.rejectionCode === "ORDER_ERROR")
            .map((decision) => `${decision.symbol}: ${decision.rejectionReason || "Bitget remote order write failed"}`)
            .filter(Boolean)
            .slice(0, 3);
          if (remoteWriteDetails.length) {
            diagnosticErrors.push(`真实订单写入失败：${remoteWriteDetails.join("；")}`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "三周期策略执行失败";
        diagnosticErrors.push(message);
        engineFailure = true;
        threeHorizon = {
          ok: false,
          runId: `thr_error_${runId}`,
          source: source === "ADMIN" ? "ADMIN" : "CRON",
          startedAt: now.toISOString(),
          finishedAt: new Date().toISOString(),
          scannedStrategies: [],
          decisions: [],
          managedOpenDecisions: 0,
          orderAttempts: 0,
          orderSuccess: 0,
          orderErrors: 0,
          message,
        };
        await recordEvent({
          runId,
          stage: "STRATEGY",
          level: "ERROR",
          action: "THREE_HORIZON_ERROR",
          message,
        });
      }

      if (!resolveRuntimeEngineFailureGate({ engineFailure, engineOk: threeHorizon?.ok }).allowPostEngineOrders) {
        mirrorResult = {
          enabled: false,
          processed: 0,
          success: 0,
          skipped: 0,
          errors: 0,
          messages: ["Three-horizon engine failed; post-engine order chain skipped."],
        };
        await recordEvent({
          runId,
          stage: "SYSTEM",
          level: "WARNING",
          action: "ENGINE_FAILURE_ORDER_SKIP",
          message: "Three-horizon engine failed; mirror and later order chains were not started.",
        });
      } else try {
        mirrorResult = environment.mode === "LIVE_EXPERIMENT"
          ? { enabled: false, processed: 0, success: 0, skipped: 0, errors: 0, messages: ["实盘实验已禁用旧版镜像链路。"] }
          : await syncBitgetDemoOrders();
        if (mirrorResult.processed > 0) {
          await recordEvent({
            runId,
            stage: "ORDER",
            level: "INFO",
            action: "ATTEMPT",
            message: `本轮尝试镜像${mirrorResult.processed}笔订单。`,
            payload: {
              processed: mirrorResult.processed,
              success: mirrorResult.success,
              skipped: mirrorResult.skipped,
              errors: mirrorResult.errors,
            },
          });
        }
        if (mirrorResult.success > 0) {
          await recordEvent({
            runId,
            stage: "ORDER",
            level: "SUCCESS",
            action: "SUCCESS",
            message: `本轮${mirrorResult.success}笔订单已发送至Bitget。`,
          });
        }
        if (mirrorResult.errors > 0) {
          await recordEvent({
            runId,
            stage: "ORDER",
            level: "ERROR",
            action: "ERROR",
            message: `本轮${mirrorResult.errors}笔Bitget订单失败。`,
          });
        }
        for (const message of mirrorResult.messages) {
          await recordEvent({
            runId,
            stage: "MIRROR",
            level: mirrorResult.errors > 0 ? "WARNING" : "INFO",
            action: "DETAIL",
            message,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bitget镜像失败";
        mirrorResult = {
          enabled: true,
          processed: 0,
          success: 0,
          skipped: 0,
          errors: 1,
          messages: [message],
        };
        await recordEvent({
          runId,
          stage: "ORDER",
          level: "ERROR",
          action: "ERROR",
          message,
        });
      }
    } else {
      const primaryPauseReason = !marketOk
        ? `行情读取失败或数据不足，本轮禁止新开仓。${marketMessage}`
        : !account.connected
          ? `账户对账未通过，本轮禁止新开仓。${account.message}`
          : !liveAllowsNewEntries
            ? liveExperiment?.stopReason || `实盘实验状态为${liveExperiment?.status ?? "NOT_STARTED"}，本轮不扫描新入场。`
            : before.paused
              ? `服务器交易执行已暂停：${before.pauseReason || "等待管理员恢复"}`
              : "本轮禁止新开仓。";
      await recordEvent({
        runId,
        stage: "SYSTEM",
        level: "WARNING",
        action: "PAUSED_SKIP",
        message: composeRuntimePauseMessage({
          primaryReason: primaryPauseReason,
          forcedManageOnly,
          forcedManageOnlyReason,
        }),
      });
      if (startup.policy.allowManageOnly && !engineFailure) {
        try {
          const scanOnly = forcedManageOnly && marketOk && account.connected;
          threeHorizon = await runThreeHorizonStrategyEngine(
            now,
            source === "ADMIN" ? "ADMIN" : "CRON",
            {
              manageOnly: !scanOnly,
              scanOnly,
              eligibleSymbols: scanOnly ? freshSymbols : undefined,
              quotes: scanOnly ? quotes : undefined,
              maxNewSymbols: scanOnly && environment.mode === "LIVE_EXPERIMENT"
                ? LIVE_STRATEGY_SYMBOLS_PER_RUN
                : undefined,
              deadlineAt: scanOnly && environment.mode === "LIVE_EXPERIMENT"
                ? new Date(Math.min(Date.now() + LIVE_STRATEGY_BUDGET_MS, deadlinePolicy.newEntryCutoffMs))
                : undefined,
              newEntryCutoffAt: scanOnly && Number.isFinite(deadlinePolicy.newEntryCutoffMs)
                ? new Date(deadlinePolicy.newEntryCutoffMs)
                : undefined,
              progressStartedAtMs: runtimeTiming.startedAtMs,
              progressElapsedMs: runtimeTiming.elapsedMs,
            }
          );
          strategyRan = true;
          if (!threeHorizon.ok) engineFailure = true;
          await recordEvent({
            runId,
            stage: "STRATEGY",
            level: threeHorizon.ok ? "INFO" : "WARNING",
            action: scanOnly ? "THREE_HORIZON_SHADOW_SCAN" : "THREE_HORIZON_MANAGE_ONLY",
            message: threeHorizon.message,
            payload: {
              scanOnly,
              scannedStrategies: threeHorizon.scannedStrategies,
              decisions: threeHorizon.decisions.length,
              managedOpenDecisions: threeHorizon.managedOpenDecisions,
              orderAttempts: threeHorizon.orderAttempts,
              orderSuccess: threeHorizon.orderSuccess,
              orderErrors: threeHorizon.orderErrors,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "暂停状态下的持仓管理失败";
          engineFailure = true;
          diagnosticErrors.push(message);
          await recordEvent({
            runId,
            stage: "STRATEGY",
            level: "ERROR",
            action: "THREE_HORIZON_MANAGE_ONLY_ERROR",
            message,
          });
        }
      }
    }

    if (!before.paused && (!engineFailure && environment.mode !== "LIVE_EXPERIMENT")) {
      try {
        validation = await runStrategyValidationCycle({
          now,
          source: source === "ADMIN" ? "ADMIN" : "CRON",
          quotes,
        });
        await recordEvent({
          runId,
          stage: "RECONCILE",
          level: validation.ok ? "SUCCESS" : "WARNING",
          action: "PHASE3_VALIDATION",
          message: validation.message,
          payload: {
            criticalIssues: validation.criticalIssues,
            warningIssues: validation.warningIssues,
            closedMetricsUpserted: validation.closedMetricsUpserted,
            experimentTrialsOpened: validation.experimentTrialsOpened,
            experimentTrialsClosed: validation.experimentTrialsClosed,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Phase 3模拟验收周期失败";
        diagnosticErrors.push(message);
        await recordEvent({
          runId,
          stage: "RECONCILE",
          level: "ERROR",
          action: "PHASE3_VALIDATION_ERROR",
          message,
        });
      }
    }

    const wallFinish = runtimeTiming.finish();
    const finishedAt = new Date(wallFinish.finishedAtMs);
    const primaryFinalMessage = engineFailure
      ? "Three-horizon engine failed; no post-engine order chain was started."
      : before.paused
      ? "服务器心跳和对账已运行；因管理员或风控暂停，本轮没有新策略下单。"
      : !marketOk
        ? `服务器心跳和对账已运行；行情未通过3分钟新鲜度检查，本轮禁止生成新入场与提交订单。${marketMessage ? ` 原因：${marketMessage}` : ""}`
        : !account.connected
          ? `服务器行情正常，但账户对账未通过，本轮禁止新开仓。原因：${account.message}`
          : !liveAllowsNewEntries
            ? liveExperiment?.stopReason || `实盘实验状态为${liveExperiment?.status ?? "NOT_STARTED"}，本轮没有新开仓。`
            : threeHorizon?.message
              ? `${threeHorizon.message} ${environment.mode === "LIVE_EXPERIMENT" ? "实盘" : "Demo"}订单成功${(mirrorResult?.success ?? 0) + (threeHorizon?.orderSuccess ?? 0) + liveExit.success}笔、失败${(mirrorResult?.errors ?? 0) + (threeHorizon?.orderErrors ?? 0) + liveExit.errors}笔。`
              : `服务器链路完成：行情正常，策略${strategyRan ? "已检查" : "未完成"}，本轮没有形成可执行订单。`;
    finalMessage = composeRuntimePauseMessage({
      primaryReason: primaryFinalMessage,
      forcedManageOnly,
      forcedManageOnlyReason,
    });
    const report: BitgetRuntimeRunReport = {
      ok: resolveRuntimeEngineFailureGate({ engineFailure, engineOk: threeHorizon?.ok }).runtimeOk && marketEndpointOk && account.connected && (mirrorResult?.errors ?? 0) === 0 && (threeHorizon?.orderErrors ?? 0) === 0 && liveExit.errors === 0,
      locked: false,
      paused: executionPaused,
      runId,
      source,
      startedAt,
      finishedAt: finishedAt.toISOString(),
      market: {
        ok: marketOk,
        quotes: quotes.map((row) => ({ ...row })),
        message: marketMessage,
      },
      strategy: strategy as unknown as Record<string, unknown> | null,
      threeHorizon: threeHorizon as unknown as Record<string, unknown> | null,
      validation: validation as unknown as Record<string, unknown> | null,
      generalSignalMonitor: signalMonitor as unknown as Record<string, unknown> | null,
      mirror: mirrorResult,
      reconcile: account,
      memberDeskSync: { ok: true },
      liveExperimentExit: liveExit,
      message: finalMessage,
    };
    const persistFinalState = () => updateRuntimeState({
      now,
      quotes: quotes.map((row) => ({ ...row })),
      marketEndpointOk,
      strategyRan,
      account,
      orderAttempted: Boolean(
        (mirrorResult && mirrorResult.processed > 0) ||
        (threeHorizon && threeHorizon.orderAttempts > 0) ||
        liveExit.attempted > 0
      ),
      orderSuccess: Boolean(
        (mirrorResult && mirrorResult.success > 0) ||
        (threeHorizon && threeHorizon.orderSuccess > 0) ||
        liveExit.success > 0
      ),
      criticalApiError: [marketEndpointOk ? "" : marketError, account.connected ? "" : accountError].filter(Boolean).join("；"),
      marketError,
      accountError,
      diagnosticError: diagnosticErrors.join("；"),
      orderErrors: (mirrorResult?.errors ?? 0) + (threeHorizon?.orderErrors ?? 0) + liveExit.errors,
      report: report as unknown as Record<string, unknown>,
    });
    const persistFinish = () => recordEvent({
      runId,
      stage: "HEARTBEAT",
      level: report.ok ? "SUCCESS" : "WARNING",
      action: "FINISH",
      message: finalMessage,
      payload: {
        durationMs: wallFinish.durationMs,
        paused: executionPaused,
      },
    });
    const finalized = await finalizeRuntimeOwner({
      allowCleanup: canStartNewEntry(deadlinePolicy),
      persistState: persistFinalState,
      persistFinish,
      cleanup: cleanupEvents,
      releaseOwner: async () => {
        await releaseOwnerOrThrow(() => releaseRuntimeLock(runId));
        ownerReleased = true;
      },
      onFinalizeErrorBeforeRelease: async (error) => {
        finalizationFailureAudited = true;
        const finalizeMessage = error instanceof Error ? error.message : "runtime finalization failed";
        await recordEvent({
          runId,
          stage: "SYSTEM",
          level: "ERROR",
          action: "RUNTIME_ERROR",
          message: `FINALIZATION_FAILED: ${finalizeMessage}`,
        }).catch(() => undefined);
        await updateRuntimeState({
          now,
          quotes: quotes.map((row) => ({ ...row })),
          marketEndpointOk,
          strategyRan,
          account,
          orderAttempted: Boolean((threeHorizon?.orderAttempts ?? 0) > 0 || liveExit.attempted > 0),
          orderSuccess: Boolean((threeHorizon?.orderSuccess ?? 0) > 0 || liveExit.success > 0),
          criticalApiError: finalizeMessage,
          marketError,
          accountError,
          diagnosticError: finalizeMessage,
          orderErrors: (threeHorizon?.orderErrors ?? 0) + liveExit.errors,
          report: { error: finalizeMessage, runId, stage: "FINALIZATION" },
        }).catch(() => undefined);
      },
      onFinalizationPersisted: () => {
        finalizationPersisted = true;
      },
    });
    finalizationPersisted = finalized.finalizationPersisted;
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器交易链路失败";
    if (!ownerReleased && (finalizationPersisted || !finalizationFailureAudited)) await recordEvent({
      runId,
      stage: "SYSTEM",
      level: "ERROR",
      action: "RUNTIME_ERROR",
      message,
    }).catch(() => undefined);
    if (!ownerReleased && (finalizationPersisted || !finalizationFailureAudited)) await updateRuntimeState({
      now,
      quotes: quotes.map((row) => ({ ...row })),
      marketEndpointOk,
      strategyRan,
      account,
      orderAttempted: Boolean(
        (mirrorResult && mirrorResult.processed > 0) ||
        (threeHorizon && threeHorizon.orderAttempts > 0) ||
        liveExit.attempted > 0
      ),
      orderSuccess: Boolean(
        (mirrorResult && mirrorResult.success > 0) ||
        (threeHorizon && threeHorizon.orderSuccess > 0) ||
        liveExit.success > 0
      ),
      criticalApiError: message,
      marketError: marketError || message,
      accountError,
      diagnosticError: [...diagnosticErrors, message].join("；"),
      orderErrors: (mirrorResult?.errors ?? 0) + (threeHorizon?.orderErrors ?? 0) + liveExit.errors,
      report: { error: message, runId },
    }).catch(() => undefined);
    throw error;
  } finally {
    if (!ownerReleased) {
      await releaseOwnerOrThrow(() => releaseRuntimeLock(runId));
      ownerReleased = true;
    }
  }
}


export async function getBitgetLiveAdminDashboard() {
  const [dashboard, runtime] = await Promise.all([
    getBitgetDemoDashboard(),
    getBitgetRuntimeState(),
  ]);
  return { ...dashboard, runtime };
}

export async function getBitgetDemoAdminDashboard() {
  const [dashboard, runtime, threeHorizon, validation] = await Promise.all([
    getBitgetDemoDashboard(),
    getBitgetRuntimeState(),
    getThreeHorizonStrategyDashboard(),
    getStrategyValidationDashboard(),
  ]);
  return { ...dashboard, runtime, threeHorizon, validation };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPosition(
  symbol: string,
  expected: "OPEN" | "CLOSED",
  attempts = 8
): Promise<Awaited<ReturnType<typeof getBitgetDemoCurrentPositions>>[number] | null> {
  for (let index = 0; index < attempts; index += 1) {
    const positions = await getBitgetDemoCurrentPositions();
    const position = positions.find((row) => row.symbol === symbol && row.total > 0) ?? null;
    if (expected === "OPEN" && position) return position;
    if (expected === "CLOSED" && !position) return null;
    await sleep(1_000);
  }
  const positions = await getBitgetDemoCurrentPositions();
  return positions.find((row) => row.symbol === symbol && row.total > 0) ?? null;
}

export async function runBitgetDemoSmokeTest(input: {
  confirmation: string;
  symbol?: BitgetSupportedSymbol;
}): Promise<BitgetSmokeTestReport> {
  const environment = getBitgetDemoEnvironment();
  if (environment.mode === "LIVE_EXPERIMENT") throw new Error("实盘实验模式禁止运行自动冒烟开平仓测试");
  if (!environment.configured) throw new Error("Bitget Demo密钥尚未配置完整");
  if (!environment.executionAllowed) throw new Error("BITGET_DEMO_EXECUTION_ALLOWED尚未设为true");
  if (!environment.testOrderAllowed) {
    throw new Error("BITGET_DEMO_TEST_ORDER_ALLOWED尚未设为true，受控测试订单默认关闭");
  }
  if (input.confirmation !== "BITGET_DEMO_TEST_ONLY") {
    throw new Error("请输入确认短语 BITGET_DEMO_TEST_ONLY");
  }
  const runtime = await getBitgetRuntimeState();
  if (runtime.paused) throw new Error(`服务器执行已暂停：${runtime.pauseReason}`);

  const symbol = input.symbol ?? "BTCUSDT";
  if (symbol !== "BTCUSDT" && symbol !== "ETHUSDT") {
    throw new Error("受控测试只允许BTCUSDT或ETHUSDT");
  }
  const existing = (await getBitgetDemoCurrentPositions()).filter(
    (row) => row.symbol === symbol && row.total > 0
  );
  if (existing.length) throw new Error(`${symbol}已有Demo持仓，禁止运行冒烟测试`);

  const [contract, quoteRows] = await Promise.all([
    getContractConfig(symbol),
    getBitgetDemoMarketQuotes([symbol]),
  ]);
  const quote = quoteRows[0];
  if (!quote) throw new Error(`${symbol}没有可用行情`);
  const minimumByAmount = Math.max(5, contract.minOrderAmount * 1.05) / quote.price;
  const rawQuantity = Math.max(
    contract.minTradeNum,
    contract.sizeMultiplier,
    minimumByAmount
  );
  const quantity = normalizeOrderSize(rawQuantity, contract);
  const runId = `smoke_${randomUUID()}`;
  const openedAt = new Date();
  const messages: string[] = [];

  await recordEvent({
    runId,
    stage: "SMOKE_TEST",
    level: "WARNING",
    action: "START",
    symbol,
    message: `TEST_ONLY开始：将以最小Demo仓位开仓并立即平仓，数量${quantity}。`,
  });

  let openOrderId = "";
  let protectionOrderId = "";
  let protectionClientOid = "";
  let closeOrderId = "";
  try {
    const open = await placeBitgetDemoMarketOrder({
      paperOrderId: `${runId}:open`,
      symbol,
      quantity: Number(quantity),
      side: "buy",
      reduceOnly: false,
    });
    openOrderId = open.orderId;
    messages.push(`开仓订单已提交：${open.orderId}`);
    await recordEvent({
      runId,
      stage: "SMOKE_TEST",
      level: "SUCCESS",
      action: "OPEN_SUBMITTED",
      symbol,
      message: messages[messages.length - 1] ?? "开仓订单已提交",
      payload: { orderId: open.orderId, clientOid: open.clientOid, quantity: open.size },
    });

    const position = await waitForPosition(symbol, "OPEN");
    if (!position) throw new Error("测试开仓后未在Bitget Demo查询到持仓");
    messages.push(`已确认Demo持仓：${position.total}`);

    const protection = await placeBitgetDemoProtectionOrder({
      paperOrderId: runId,
      symbol,
      posSide: "long",
      stopLoss: quote.price * 0.5,
      takeProfit: quote.price * 1.5,
    });
    protectionOrderId = protection.orderId;
    protectionClientOid = protection.clientOid;
    messages.push(`交易所侧测试止盈止损已提交：${protection.orderId}`);
    await recordEvent({
      runId,
      stage: "SMOKE_TEST",
      level: "SUCCESS",
      action: "PROTECTION_SUBMITTED",
      symbol,
      message: messages[messages.length - 1] ?? "测试止盈止损已提交",
      payload: {
        orderId: protection.orderId,
        clientOid: protection.clientOid,
        stopLoss: quote.price * 0.5,
        takeProfit: quote.price * 1.5,
      },
    });
    const strategyOrders = await getBitgetDemoPendingStrategyOrders();
    if (!strategyOrders.some((row) => row.orderId === protection.orderId)) {
      throw new Error("测试止盈止损提交后未在Bitget Demo挂单中查询到");
    }
    await cancelBitgetDemoStrategyOrder({
      orderId: protection.orderId,
      clientOid: protection.clientOid,
    });
    messages.push("已确认并撤销测试止盈止损挂单。");

    const close = await placeBitgetDemoMarketOrder({
      paperOrderId: `${runId}:close`,
      symbol,
      quantity: position.total,
      side: "sell",
      reduceOnly: true,
    });
    closeOrderId = close.orderId;
    messages.push(`平仓订单已提交：${close.orderId}`);
    await recordEvent({
      runId,
      stage: "SMOKE_TEST",
      level: "SUCCESS",
      action: "CLOSE_SUBMITTED",
      symbol,
      message: messages[messages.length - 1] ?? "平仓订单已提交",
      payload: { orderId: close.orderId, clientOid: close.clientOid, quantity: close.size },
    });

    const remaining = await waitForPosition(symbol, "CLOSED");
    if (remaining) {
      throw new Error(`测试平仓后仍有${remaining.total} ${symbol}持仓，已自动暂停执行`);
    }
    const closedAt = new Date();
    messages.push("Bitget Demo持仓已归零，受控测试完成。");
    await recordEvent({
      runId,
      stage: "SMOKE_TEST",
      level: "SUCCESS",
      action: "FINISH",
      symbol,
      message: messages[messages.length - 1] ?? "受控测试完成",
    });
    if (prisma) {
      await prisma.$executeRaw`
        UPDATE trade_bitget_runtime_state SET
          last_order_attempt_at = ${openedAt},
          last_order_success_at = ${closedAt},
          consecutive_order_errors = 0,
          last_error = '',
          updated_at = NOW()
        WHERE id = 'default'
      `;
    }
    return {
      ok: true,
      testOnly: true,
      symbol,
      quantity,
      openOrderId,
      protectionOrderId,
      closeOrderId,
      openedAt: openedAt.toISOString(),
      closedAt: closedAt.toISOString(),
      finalPositionCount: 0,
      messages,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "受控测试订单失败";
    if (protectionOrderId || protectionClientOid) {
      await cancelBitgetDemoStrategyOrder({
        orderId: protectionOrderId || undefined,
        clientOid: protectionClientOid || undefined,
      }).catch(() => undefined);
    }
    const remaining = await getBitgetDemoCurrentPositions().catch(() => []);
    const openPosition = remaining.find((row) => row.symbol === symbol && row.total > 0);
    if (openPosition) {
      await placeBitgetDemoMarketOrder({
        paperOrderId: `${runId}:emergency-close`,
        symbol,
        quantity: openPosition.total,
        side: "sell",
        reduceOnly: true,
      }).catch(() => undefined);
    }
    await setBitgetRuntimePaused(true, `TEST_ONLY异常：${message}`).catch(() => undefined);
    await recordEvent({
      runId,
      stage: "SMOKE_TEST",
      level: "ERROR",
      action: "ERROR",
      symbol,
      message,
      payload: { openOrderId, protectionOrderId, closeOrderId },
    }).catch(() => undefined);
    throw new Error(`${message}。系统已暂停新订单，请先在Bitget Demo确认仓位。`);
  }
}
