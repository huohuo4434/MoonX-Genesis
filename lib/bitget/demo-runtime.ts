import "server-only";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  cancelBitgetDemoStrategyOrder,
  getBitgetDemoCurrentPositions,
  getBitgetDemoEnvironment,
  getBitgetDemoMarketQuotes,
  getBitgetDemoPendingStrategyOrders,
  getContractConfig,
  normalizeOrderSize,
  placeBitgetDemoMarketOrder,
  placeBitgetDemoProtectionOrder,
  testBitgetDemoConnection,
  type BitgetDemoMarketQuote,
  type BitgetSupportedSymbol,
} from "@/lib/bitget/demo-client";
import {
  getBitgetDemoDashboard,
  getBitgetMirrorSettings,
  syncBitgetDemoOrders,
} from "@/lib/bitget/demo-connector";
import { runPredictionAutoTrader } from "@/lib/trading-signals/prediction-auto-trader";
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

const DEFAULT_SYMBOLS: BitgetSupportedSymbol[] = ["BTCUSDT", "ETHUSDT", "HYPEUSDT"];
const HEARTBEAT_HEALTH_SECONDS = 180;
const QUOTE_HEALTH_SECONDS = 180;
const LOCK_SECONDS = 90;
const EVENT_RETENTION_DAYS = 14;

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

function emptyAccount(message = "尚未完成Bitget Demo账户对账。"):
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
        last_error TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO trade_bitget_runtime_state (id)
      VALUES ('default') ON CONFLICT (id) DO NOTHING
    `);
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

async function acquireRuntimeLock(now: Date): Promise<boolean> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) return false;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `UPDATE trade_bitget_runtime_state
     SET run_lock_until = $1::timestamptz + INTERVAL '${LOCK_SECONDS} seconds',
         last_heartbeat_at = $1::timestamptz,
         updated_at = NOW()
     WHERE id = 'default'
       AND (run_lock_until IS NULL OR run_lock_until < NOW())
     RETURNING id`,
    now.toISOString()
  );
  return rows.length > 0;
}

async function releaseRuntimeLock(): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRawUnsafe(`
    UPDATE trade_bitget_runtime_state
    SET run_lock_until = NULL, updated_at = NOW()
    WHERE id = 'default'
  `);
}

async function readStateRow(): Promise<RuntimeStateRow | undefined> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) return undefined;
  const rows = await prisma.$queryRawUnsafe<RuntimeStateRow[]>(
    `SELECT * FROM trade_bitget_runtime_state WHERE id = 'default' LIMIT 1`
  );
  return rows[0];
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

async function reconcileAccount(now: Date): Promise<BitgetRuntimeAccountSnapshot> {
  const environment = getBitgetDemoEnvironment();
  if (!environment.configured) return emptyAccount("Bitget Demo密钥尚未配置完整。");
  const [connectionResult, positionsResult, pendingResult] = await Promise.allSettled([
    testBitgetDemoConnection(),
    getBitgetDemoCurrentPositions(),
    getBitgetDemoPendingStrategyOrders(),
  ] as const);
  const results: PromiseSettledResult<unknown>[] = [
    connectionResult,
    positionsResult,
    pendingResult,
  ];
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : "Bitget读取失败");
  const connection = connectionResult.status === "fulfilled" ? connectionResult.value : null;
  const positionsReady = positionsResult.status === "fulfilled";
  const positions = positionsReady ? positionsResult.value : [];
  const pending = pendingResult.status === "fulfilled" ? pendingResult.value : [];
  return {
    connected: Boolean(connection) && positionsReady,
    availableUsdt: connection?.availableUsdt ?? null,
    equityUsdt: connection?.equityUsdt ?? null,
    detectedUsdt: connection?.detectedUsdt ?? null,
    positionsCount: positions.length,
    pendingStrategyOrdersCount: pending.length,
    checkedAt: now.toISOString(),
    message: errors.length
      ? `部分对账失败：${errors.join("；")}`
      : `Bitget Demo对账完成：持仓${positions.length}，交易所止盈止损单${pending.length}。`,
  };
}

async function updateRuntimeState(input: {
  now: Date;
  quotes: BitgetRuntimeQuote[];
  marketOk: boolean;
  strategyRan: boolean;
  account: BitgetRuntimeAccountSnapshot;
  orderAttempted: boolean;
  orderSuccess: boolean;
  apiError: string;
  orderErrors: number;
  report: Record<string, unknown>;
}): Promise<void> {
  if (!prisma) return;
  const previous = await readStateRow();
  const nextApiErrors = input.apiError
    ? Number(previous?.consecutive_api_errors ?? 0) + 1
    : 0;
  const nextOrderErrors = input.orderErrors > 0
    ? Number(previous?.consecutive_order_errors ?? 0) + 1
    : 0;
  const shouldPause = nextApiErrors >= 2 || nextOrderErrors >= 2;
  const pauseReason = shouldPause
    ? nextOrderErrors >= 2
      ? "连续2次Bitget下单/镜像异常，服务器已自动暂停新订单。"
      : "连续2次Bitget行情或账户接口异常，服务器已自动暂停新订单。"
    : String(previous?.pause_reason ?? "");

  await prisma.$executeRaw`
    UPDATE trade_bitget_runtime_state SET
      paused = CASE WHEN ${shouldPause} THEN TRUE ELSE paused END,
      pause_reason = CASE WHEN ${shouldPause} THEN ${pauseReason} ELSE pause_reason END,
      last_heartbeat_at = ${input.now},
      last_market_at = CASE WHEN ${input.marketOk} THEN ${input.now} ELSE last_market_at END,
      last_strategy_at = CASE WHEN ${input.strategyRan} THEN ${input.now} ELSE last_strategy_at END,
      last_reconcile_at = ${input.now},
      last_order_attempt_at = CASE WHEN ${input.orderAttempted} THEN ${input.now} ELSE last_order_attempt_at END,
      last_order_success_at = CASE WHEN ${input.orderSuccess} THEN ${input.now} ELSE last_order_success_at END,
      latest_quotes = CASE
        WHEN ${input.marketOk} THEN ${JSON.stringify(input.quotes)}::jsonb
        ELSE latest_quotes
      END,
      account_snapshot = ${JSON.stringify(input.account)}::jsonb,
      last_report = ${JSON.stringify(input.report)}::jsonb,
      consecutive_api_errors = ${nextApiErrors},
      consecutive_order_errors = ${nextOrderErrors},
      last_error = ${input.apiError || (input.orderErrors > 0 ? `${input.orderErrors}笔订单同步失败` : "")},
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
      pause_reason = ${paused ? reason : ""},
      consecutive_api_errors = CASE WHEN ${paused} THEN consecutive_api_errors ELSE 0 END,
      consecutive_order_errors = CASE WHEN ${paused} THEN consecutive_order_errors ELSE 0 END,
      updated_at = NOW()
    WHERE id = 'default'
  `;
  await recordEvent({
    runId: `admin_${randomUUID()}`,
    stage: "SYSTEM",
    level: paused ? "WARNING" : "SUCCESS",
    action: paused ? "PAUSED" : "RESUMED",
    message: paused ? reason : "管理员已恢复Bitget Demo服务器执行链路。",
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
  const serverHealthy = Boolean(
    databaseReady &&
      cronSecretConfigured &&
      !paused &&
      heartbeatAge != null &&
      heartbeatAge <= HEARTBEAT_HEALTH_SECONDS &&
      quoteAge != null &&
      quoteAge <= QUOTE_HEALTH_SECONDS
  );
  return {
    databaseReady,
    mode: "BITGET_DEMO_REST_CRON",
    source: "SYSTEM",
    running: row?.run_lock_until ? new Date(row.run_lock_until).getTime() > now.getTime() : false,
    paused,
    pauseReason: String(row?.pause_reason ?? ""),
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
    account,
    decisionStatsToday: stats,
    consecutiveApiErrors: Number(row?.consecutive_api_errors ?? 0),
    consecutiveOrderErrors: Number(row?.consecutive_order_errors ?? 0),
    lastError: String(row?.last_error ?? ""),
    lastReport: safeJson<Record<string, unknown> | null>(row?.last_report, null),
    recentEvents: databaseReady ? await listEvents() : [],
    updatedAt: iso(row?.updated_at) ?? now.toISOString(),
  };
}

export async function runBitgetDemoServerRuntime(
  now = new Date(),
  source: BitgetRuntimeSource = "CRON"
): Promise<BitgetRuntimeRunReport> {
  if (!(await ensureBitgetRuntimeTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }
  const runId = `bgr_${randomUUID()}`;
  const startedAt = now.toISOString();
  const locked = await acquireRuntimeLock(now);
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
      generalSignalMonitor: null,
      mirror: null,
      reconcile: emptyAccount("上一轮任务仍在运行。"),
      memberDeskSync: { ok: true },
      message: "检测到运行锁，本轮未重复执行。",
    };
  }

  let marketOk = false;
  let marketMessage = "";
  let quotes: BitgetDemoMarketQuote[] = [];
  let strategy: Awaited<ReturnType<typeof runPredictionAutoTrader>> | null = null;
  let signalMonitor: Awaited<ReturnType<typeof runTradingSignalServerMonitor>> | null = null;
  let mirrorResult: Awaited<ReturnType<typeof syncBitgetDemoOrders>> | null = null;
  let account = emptyAccount();
  let apiError = "";
  let strategyRan = false;
  let finalMessage = "";

  try {
    const before = await getBitgetRuntimeState(now);
    await recordEvent({
      runId,
      stage: "HEARTBEAT",
      level: "INFO",
      action: "START",
      message: `Bitget Demo服务器心跳开始，来源${source}。`,
    });

    try {
      quotes = await getBitgetDemoMarketQuotes(DEFAULT_SYMBOLS);
      marketOk = quotes.length >= 2;
      marketMessage = marketOk
        ? `取得${quotes.length}个Bitget Demo同源公开报价。`
        : `Bitget仅返回${quotes.length}个有效报价。`;
      await recordEvent({
        runId,
        stage: "MARKET",
        level: marketOk ? "SUCCESS" : "WARNING",
        action: "QUOTE",
        message: marketMessage,
        payload: { quotes },
      });
    } catch (error) {
      apiError = error instanceof Error ? error.message : "Bitget行情读取失败";
      marketMessage = apiError;
      await recordEvent({
        runId,
        stage: "MARKET",
        level: "ERROR",
        action: "QUOTE_ERROR",
        message: apiError,
      });
    }

    if (!before.paused) {
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
        apiError = apiError || message;
        await recordEvent({
          runId,
          stage: "STRATEGY",
          level: "ERROR",
          action: "RUN_ERROR",
          message,
        });
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

      try {
        mirrorResult = await syncBitgetDemoOrders();
        if (mirrorResult.processed > 0) {
          await recordEvent({
            runId,
            stage: "ORDER",
            level: "INFO",
            action: "ATTEMPT",
            message: `本轮尝试镜像${mirrorResult.processed}笔Demo订单。`,
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
            message: `本轮${mirrorResult.success}笔订单已发送至Bitget Demo。`,
          });
        }
        if (mirrorResult.errors > 0) {
          await recordEvent({
            runId,
            stage: "ORDER",
            level: "ERROR",
            action: "ERROR",
            message: `本轮${mirrorResult.errors}笔Bitget Demo订单失败。`,
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
        const message = error instanceof Error ? error.message : "Bitget Demo镜像失败";
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
      await recordEvent({
        runId,
        stage: "SYSTEM",
        level: "WARNING",
        action: "PAUSED_SKIP",
        message: `服务器交易执行已暂停：${before.pauseReason || "等待管理员恢复"}`,
      });
    }

    account = await reconcileAccount(now);
    if (!account.connected) apiError = apiError || account.message;
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

    const finishedAt = new Date();
    finalMessage = before.paused
      ? "服务器心跳和对账已运行；因风控暂停，本轮没有新策略下单。"
      : `服务器链路完成：行情${marketOk ? "正常" : "异常"}，策略${strategyRan ? "已检查" : "未完成"}，镜像成功${mirrorResult?.success ?? 0}笔、失败${mirrorResult?.errors ?? 0}笔。`;
    const report: BitgetRuntimeRunReport = {
      ok: !apiError && (mirrorResult?.errors ?? 0) === 0,
      locked: false,
      paused: before.paused,
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
      generalSignalMonitor: signalMonitor as unknown as Record<string, unknown> | null,
      mirror: mirrorResult,
      reconcile: account,
      memberDeskSync: { ok: true },
      message: finalMessage,
    };
    await updateRuntimeState({
      now,
      quotes: quotes.map((row) => ({ ...row })),
      marketOk,
      strategyRan,
      account,
      orderAttempted: Boolean(mirrorResult && mirrorResult.processed > 0),
      orderSuccess: Boolean(mirrorResult && mirrorResult.success > 0),
      apiError,
      orderErrors: mirrorResult?.errors ?? 0,
      report: report as unknown as Record<string, unknown>,
    });
    await recordEvent({
      runId,
      stage: "HEARTBEAT",
      level: report.ok ? "SUCCESS" : "WARNING",
      action: "FINISH",
      message: finalMessage,
      payload: {
        durationMs: finishedAt.getTime() - now.getTime(),
        paused: before.paused,
      },
    });
    await cleanupEvents();
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器交易链路失败";
    await recordEvent({
      runId,
      stage: "SYSTEM",
      level: "ERROR",
      action: "RUNTIME_ERROR",
      message,
    }).catch(() => undefined);
    await updateRuntimeState({
      now,
      quotes: quotes.map((row) => ({ ...row })),
      marketOk,
      strategyRan,
      account,
      orderAttempted: Boolean(mirrorResult && mirrorResult.processed > 0),
      orderSuccess: Boolean(mirrorResult && mirrorResult.success > 0),
      apiError: message,
      orderErrors: mirrorResult?.errors ?? 0,
      report: { error: message, runId },
    }).catch(() => undefined);
    throw error;
  } finally {
    await releaseRuntimeLock().catch(() => undefined);
  }
}


export async function getBitgetDemoAdminDashboard() {
  const [dashboard, runtime] = await Promise.all([
    getBitgetDemoDashboard(),
    getBitgetRuntimeState(),
  ]);
  return { ...dashboard, runtime };
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
