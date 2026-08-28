import "server-only";

import { prisma } from "@/lib/prisma";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import {
  buildLiveTradingDiagnostics,
  type LiveDiagnosticActivityRow,
  type LiveDiagnosticBlockerRow,
  type LiveDiagnosticDecisionRow,
  type LiveDiagnosticPlanRow,
} from "@/lib/bitget/live-admin-diagnostics-core";
import type {
  BitgetRuntimeAccountSnapshot,
  BitgetRuntimeDecisionStats,
  BitgetRuntimeEvent,
  BitgetRuntimeExecutionFailure,
  BitgetRuntimeQuote,
  BitgetRuntimeState,
} from "@/types/bitget-demo-runtime";

const HEARTBEAT_HEALTH_SECONDS = 180;
const QUOTE_HEALTH_SECONDS = 180;
const SNAPSHOT_TIMEOUT_MS = 3_500;
const FRESH_CACHE_MS = 10_000;
const STALE_CACHE_MS = 5 * 60_000;

type RuntimeStateRow = {
  paused: boolean;
  pause_reason: string;
  pause_source: string;
  run_lock_until: Date | string | null;
  last_heartbeat_at: Date | string | null;
  last_market_at: Date | string | null;
  last_strategy_at: Date | string | null;
  last_reconcile_at: Date | string | null;
  last_order_attempt_at: Date | string | null;
  last_order_success_at: Date | string | null;
  latest_quotes: unknown;
  account_snapshot: unknown;
  last_report: unknown;
  consecutive_api_errors: number;
  consecutive_order_errors: number;
  consecutive_healthy_runs: number;
  last_market_error: string;
  last_account_error: string;
  last_error: string;
  updated_at: Date | string;
};

type LiveExperimentRow = {
  status: string;
  started_at: Date | string | null;
  ends_at: Date | string | null;
  initial_equity_usdt: number | null;
  current_equity_usdt: number | null;
  peak_equity_usdt: number | null;
  max_drawdown_usdt: number | null;
  max_drawdown_pct: number | null;
  stop_reason: string;
};

type DailyRow = {
  trade_date: Date | string;
  opening_equity_usdt: number;
  closing_equity_usdt: number;
  pnl_usdt: number;
  pnl_pct: number;
  trades: number;
};

type EventRow = {
  id: string;
  run_id: string;
  stage: BitgetRuntimeEvent["stage"];
  level: BitgetRuntimeEvent["level"];
  symbol: string | null;
  action: string;
  message: string;
  payload: unknown;
  created_at: Date | string;
};

type ExecutionFailureRow = {
  id: string;
  decision_id: string | null;
  action_type: string;
  symbol: string;
  status: string;
  client_oid: string | null;
  bitget_order_id: string | null;
  attempt_count: number;
  last_error: string;
  failure_meta: unknown;
  updated_at: Date | string;
};

type SnapshotEnvelope = {
  runtime_state: RuntimeStateRow | null;
  live_experiment: LiveExperimentRow | null;
  daily_history: DailyRow[] | null;
  recent_events: EventRow[] | null;
  recent_execution_failures: ExecutionFailureRow[] | null;
  latest_live_decisions: LiveDiagnosticDecisionRow[] | null;
  latest_live_plans: LiveDiagnosticPlanRow[] | null;
  live_activity_24h: LiveDiagnosticActivityRow[] | null;
  live_blockers_24h: LiveDiagnosticBlockerRow[] | null;
};

type LiveAdminDashboard = {
  environment: ReturnType<typeof getBitgetDemoEnvironment>;
  settings: { enabled: boolean; startedAt: string | null; updatedAt: string };
  logs: never[];
  runtime: BitgetRuntimeState;
};

let cache: { value: LiveAdminDashboard; savedAt: number } | null = null;

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

function ageSeconds(value: string | null, now: Date): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / 1000));
}

function emptyStats(): BitgetRuntimeDecisionStats {
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

function emptyAccount(message: string): BitgetRuntimeAccountSnapshot {
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

function beijingDateKey(now: Date): string {
  return new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`数据库快照读取超过${Math.round(timeoutMs / 1000)}秒`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function fallbackDashboard(now: Date, errorMessage: string): LiveAdminDashboard {
  const environment = getBitgetDemoEnvironment();
  const runtime: BitgetRuntimeState = {
    databaseReady: false,
    mode: "BITGET_LIVE_EXPERIMENT_REST_CRON",
    source: "SYSTEM",
    running: false,
    paused: false,
    pauseReason: "",
    pauseSource: "",
    autoRecoveryHealthyRuns: 0,
    serverHealthy: false,
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    configured: environment.configured,
    executionAllowed: environment.executionAllowed,
    mirrorEnabled: false,
    testOrderAllowed: false,
    lastHeartbeatAt: null,
    lastMarketAt: null,
    lastStrategyAt: null,
    lastReconcileAt: null,
    lastOrderAttemptAt: null,
    lastOrderSuccessAt: null,
    heartbeatAgeSeconds: null,
    quoteAgeSeconds: null,
    latestQuotes: [],
    freshQuotesCount: 0,
    totalSymbols: environment.liveAllowedSymbols.length,
    lastMarketError: "",
    lastAccountError: "",
    account: emptyAccount("状态快照暂时不可用；Vercel定时交易任务与本页面读取相互独立。"),
    decisionStatsToday: emptyStats(),
    consecutiveApiErrors: 0,
    consecutiveOrderErrors: 0,
    lastError: errorMessage,
    lastReport: null,
    recentEvents: [],
    recentExecutionFailures: [],
    updatedAt: now.toISOString(),
    liveExperiment: {
      status: environment.executionAllowed ? "NOT_STARTED" : "DISABLED",
      startedAt: null,
      endsAt: null,
      initialEquityUsdt: environment.liveInitialCapitalUsdt,
      currentEquityUsdt: null,
      pnlUsdt: null,
      pnlPct: null,
      maxDrawdownUsdt: null,
      maxDrawdownPct: null,
      dailyPnlUsdt: null,
      dailyPnlPct: null,
      dailyHistory: [],
      stopReason: errorMessage,
      securityMessage: "页面仅显示数据库快照，不会在刷新时调用Bitget。",
    },
  };
  return {
    environment,
    settings: { enabled: false, startedAt: null, updatedAt: now.toISOString() },
    logs: [],
    runtime,
  };
}

function mapSnapshot(envelope: SnapshotEnvelope, now: Date): LiveAdminDashboard {
  const environment = getBitgetDemoEnvironment();
  const row = envelope.runtime_state;
  if (!row) throw new Error("交易运行状态表尚无快照");

  const latestQuotes = safeJson<BitgetRuntimeQuote[]>(row.latest_quotes, []);
  const account = safeJson<BitgetRuntimeAccountSnapshot>(
    row.account_snapshot,
    emptyAccount("尚未完成Bitget账户对账。")
  );
  const lastHeartbeatAt = iso(row.last_heartbeat_at);
  const lastMarketAt = iso(row.last_market_at);
  const heartbeatAge = ageSeconds(lastHeartbeatAt, now);
  const quoteAge = ageSeconds(lastMarketAt, now);
  const freshQuotesCount = latestQuotes.filter((quote) => {
    const capturedAt = Date.parse(quote.capturedAt);
    return Number.isFinite(capturedAt) && now.getTime() - capturedAt <= QUOTE_HEALTH_SECONDS * 1000;
  }).length;
  const paused = Boolean(row.paused);
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const serverHealthy = Boolean(
    cronSecretConfigured &&
      !paused &&
      account.connected &&
      freshQuotesCount > 0 &&
      heartbeatAge != null &&
      heartbeatAge <= HEARTBEAT_HEALTH_SECONDS &&
      quoteAge != null &&
      quoteAge <= QUOTE_HEALTH_SECONDS
  );

  const dailyHistory = (envelope.daily_history ?? []).map((item) => ({
    date: new Date(item.trade_date).toISOString().slice(0, 10),
    openingEquityUsdt: Number(item.opening_equity_usdt),
    closingEquityUsdt: Number(item.closing_equity_usdt),
    pnlUsdt: Number(item.pnl_usdt),
    pnlPct: Number(item.pnl_pct),
    trades: Number(item.trades),
  }));
  const experiment = envelope.live_experiment;
  const initial = Number(experiment?.initial_equity_usdt ?? environment.liveInitialCapitalUsdt);
  const current = Number(experiment?.current_equity_usdt ?? initial);
  const status = String(experiment?.status ?? "NOT_STARTED").toUpperCase() as
    | "DISABLED"
    | "NOT_STARTED"
    | "ACTIVE"
    | "COMPLETED"
    | "STOPPED";
  const pnl = initial > 0 ? current - initial : 0;
  const today = dailyHistory.find((item) => item.date === beijingDateKey(now));

  const recentEvents: BitgetRuntimeEvent[] = (envelope.recent_events ?? []).map((event) => ({
    id: event.id,
    runId: event.run_id,
    stage: event.stage,
    level: event.level,
    symbol: event.symbol,
    action: event.action,
    message: event.message,
    payload: safeJson<Record<string, unknown> | null>(event.payload, null),
    createdAt: iso(event.created_at) ?? now.toISOString(),
  }));
  const recentExecutionFailures: BitgetRuntimeExecutionFailure[] = (envelope.recent_execution_failures ?? []).map((row) => {
    const meta = safeJson<Record<string, unknown>>(row.failure_meta, {});
    return {
      outboxId: row.id,
      decisionId: row.decision_id,
      symbol: row.symbol,
      action: row.action_type,
      status: row.status,
      stage: String(meta.stage ?? "LEGACY_UNKNOWN"),
      bitgetCode: meta.bitgetCode == null ? null : String(meta.bitgetCode),
      httpStatus: meta.httpStatus == null ? null : Number(meta.httpStatus),
      remoteSubmissionAttempted: meta.remoteSubmissionAttempted == null ? null : Boolean(meta.remoteSubmissionAttempted),
      clientOid: row.client_oid,
      bitgetOrderId: row.bitget_order_id,
      attemptCount: Number(row.attempt_count ?? 0),
      lastError: row.last_error,
      updatedAt: iso(row.updated_at) ?? now.toISOString(),
    };
  });
  const tradingDiagnostics = buildLiveTradingDiagnostics({
    allowedSymbols: environment.liveAllowedSymbols,
    plans: envelope.latest_live_plans ?? [],
    decisions: envelope.latest_live_decisions ?? [],
    activity: envelope.live_activity_24h ?? [],
    blockers: envelope.live_blockers_24h ?? [],
    now,
  });

  return {
    environment,
    settings: { enabled: false, startedAt: null, updatedAt: iso(row.updated_at) ?? now.toISOString() },
    logs: [],
    runtime: {
      databaseReady: true,
      mode: "BITGET_LIVE_EXPERIMENT_REST_CRON",
      source: "SYSTEM",
      running: row.run_lock_until ? new Date(row.run_lock_until).getTime() > now.getTime() : false,
      paused,
      pauseReason: String(row.pause_reason ?? ""),
      pauseSource: String(row.pause_source ?? ""),
      autoRecoveryHealthyRuns: Number(row.consecutive_healthy_runs ?? 0),
      serverHealthy,
      cronSecretConfigured,
      configured: environment.configured,
      executionAllowed: environment.executionAllowed,
      mirrorEnabled: false,
      testOrderAllowed: false,
      lastHeartbeatAt,
      lastMarketAt,
      lastStrategyAt: iso(row.last_strategy_at),
      lastReconcileAt: iso(row.last_reconcile_at),
      lastOrderAttemptAt: iso(row.last_order_attempt_at),
      lastOrderSuccessAt: iso(row.last_order_success_at),
      heartbeatAgeSeconds: heartbeatAge,
      quoteAgeSeconds: quoteAge,
      latestQuotes,
      freshQuotesCount,
      totalSymbols: environment.liveAllowedSymbols.length,
      lastMarketError: String(row.last_market_error ?? ""),
      lastAccountError: String(row.last_account_error ?? ""),
      account,
      decisionStatsToday: emptyStats(),
      tradingDiagnostics,
      consecutiveApiErrors: Number(row.consecutive_api_errors ?? 0),
      consecutiveOrderErrors: Number(row.consecutive_order_errors ?? 0),
      lastError: String(row.last_error ?? ""),
      lastReport: safeJson<Record<string, unknown> | null>(row.last_report, null),
      recentEvents,
      recentExecutionFailures,
      updatedAt: iso(row.updated_at) ?? now.toISOString(),
      liveExperiment: {
        status,
        startedAt: iso(experiment?.started_at),
        endsAt: iso(experiment?.ends_at),
        initialEquityUsdt: initial || null,
        currentEquityUsdt: current || 0,
        pnlUsdt: pnl,
        pnlPct: initial > 0 ? (pnl / initial) * 100 : 0,
        maxDrawdownUsdt: Number(experiment?.max_drawdown_usdt ?? 0),
        maxDrawdownPct: Number(experiment?.max_drawdown_pct ?? 0),
        dailyPnlUsdt: today?.pnlUsdt ?? 0,
        dailyPnlPct: today?.pnlPct ?? 0,
        dailyHistory,
        stopReason: String(experiment?.stop_reason ?? ""),
        securityMessage: "安全权限由服务器执行链路验证；本页面只读取数据库快照。",
      },
    },
  };
}

async function querySnapshot(): Promise<SnapshotEnvelope> {
  if (!prisma) throw new Error("Prisma数据库客户端未配置");
  const rows = await prisma.$queryRawUnsafe<SnapshotEnvelope[]>(`
    WITH recent_live_decisions AS (
      SELECT strategy_type, symbol, run_id, status, direction, rejection_code,
             rejection_reason, client_oid, bitget_order_id, created_at, updated_at
      FROM trade_three_horizon_decisions
      WHERE mode = 'LIVE'
        AND strategy_type IN ('INTRADAY','SWING','POSITION')
        AND created_at >= NOW() - INTERVAL '24 hours'
    ),
    latest_live_decisions AS (
      SELECT DISTINCT ON (strategy_type, symbol)
             strategy_type, symbol, status, direction, rejection_code,
             rejection_reason, client_oid, bitget_order_id, created_at, updated_at
      FROM recent_live_decisions
      ORDER BY strategy_type, symbol, updated_at DESC, created_at DESC
    ),
    latest_live_plans AS (
      SELECT DISTINCT ON (strategy_type, symbol)
             strategy_type, symbol, direction, plan_tier, status,
             forecast_version, forecast_published_at, forecast_locked_at,
             forecast_valid_from, forecast_valid_until,
             last_checked_at, updated_at
      FROM trade_ai_plans
      WHERE execution_mode = 'BITGET_LIVE'
        AND strategy_type IN ('INTRADAY','SWING','POSITION')
        AND plan_tier = 'FORMAL'
        AND forecast_version IS NOT NULL
      ORDER BY strategy_type, symbol, updated_at DESC, version DESC
    )
    SELECT
      (SELECT row_to_json(state_row) FROM (
        SELECT paused, pause_reason, pause_source, run_lock_until,
               last_heartbeat_at, last_market_at, last_strategy_at, last_reconcile_at,
               last_order_attempt_at, last_order_success_at, latest_quotes,
               account_snapshot, last_report, consecutive_api_errors,
               consecutive_order_errors, consecutive_healthy_runs,
               last_market_error, last_account_error, last_error, updated_at
        FROM trade_bitget_runtime_state
        WHERE id = 'default'
        LIMIT 1
      ) state_row) AS runtime_state,
      (SELECT row_to_json(experiment_row) FROM (
        SELECT status, started_at, ends_at, initial_equity_usdt,
               current_equity_usdt, peak_equity_usdt, max_drawdown_usdt,
               max_drawdown_pct, stop_reason
        FROM trade_bitget_live_experiment
        WHERE id = 'default'
        LIMIT 1
      ) experiment_row) AS live_experiment,
      COALESCE((SELECT json_agg(daily_row) FROM (
        SELECT trade_date, opening_equity_usdt, closing_equity_usdt,
               pnl_usdt, pnl_pct, trades
        FROM trade_bitget_live_daily_snapshots
        ORDER BY trade_date DESC
        LIMIT 40
      ) daily_row), '[]'::json) AS daily_history,
      COALESCE((SELECT json_agg(event_row) FROM (
        SELECT id, run_id, stage, level, symbol, action, message, payload, created_at
        FROM trade_bitget_runtime_events
        ORDER BY created_at DESC
        LIMIT 20
      ) event_row), '[]'::json) AS recent_events,
      COALESCE((SELECT json_agg(failure_row) FROM (
        SELECT id, decision_id, action_type, symbol, status, client_oid, bitget_order_id,
               attempt_count, last_error, payload->'executionFailure' AS failure_meta, updated_at
        FROM trade_execution_outbox
        WHERE environment_mode='LIVE_EXPERIMENT'
          AND (status='FAILED' OR last_error<>'' OR COALESCE(payload->'executionFailure'->>'stage','')<>'')
        ORDER BY updated_at DESC
        LIMIT 20
      ) failure_row), '[]'::json) AS recent_execution_failures,
      COALESCE((SELECT json_agg(decision_row) FROM (
        SELECT strategy_type, symbol, status, direction, rejection_code,
               rejection_reason, client_oid, bitget_order_id, created_at, updated_at
        FROM latest_live_decisions
        ORDER BY symbol ASC, strategy_type ASC
      ) decision_row), '[]'::json) AS latest_live_decisions,
      COALESCE((SELECT json_agg(plan_row) FROM (
        SELECT strategy_type, symbol, direction, plan_tier, status,
               forecast_version, forecast_published_at, forecast_locked_at,
               forecast_valid_from, forecast_valid_until,
               last_checked_at, updated_at
        FROM latest_live_plans
        ORDER BY symbol ASC, strategy_type ASC
      ) plan_row), '[]'::json) AS latest_live_plans,
      COALESCE((SELECT json_agg(activity_row) FROM (
        SELECT 'ALL'::TEXT AS strategy_type,
               COUNT(DISTINCT run_id)::INTEGER AS scan_runs,
               COUNT(*)::INTEGER AS decisions,
               COUNT(DISTINCT symbol)::INTEGER AS symbols_evaluated,
               COUNT(*) FILTER (
                 WHERE client_oid IS NOT NULL
                    OR bitget_order_id IS NOT NULL
                    OR status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING','CLOSED')
               )::INTEGER AS order_decisions
        FROM recent_live_decisions
        UNION ALL
        SELECT strategy_type,
               COUNT(DISTINCT run_id)::INTEGER AS scan_runs,
               COUNT(*)::INTEGER AS decisions,
               COUNT(DISTINCT symbol)::INTEGER AS symbols_evaluated,
               COUNT(*) FILTER (
                 WHERE client_oid IS NOT NULL
                    OR bitget_order_id IS NOT NULL
                    OR status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING','CLOSED')
               )::INTEGER AS order_decisions
        FROM recent_live_decisions
        GROUP BY strategy_type
        ORDER BY strategy_type ASC
      ) activity_row), '[]'::json) AS live_activity_24h,
      COALESCE((SELECT json_agg(blocker_row) FROM (
        SELECT rejection_code,
               COUNT(*)::INTEGER AS occurrences,
               ARRAY_AGG(DISTINCT symbol ORDER BY symbol) AS symbols,
               MAX(updated_at) AS latest_at
        FROM recent_live_decisions
        WHERE rejection_code <> ''
          AND rejection_code NOT IN (
            'PROBE_ENTRY','DAILY_ACTIVITY_PROBE','DAILY_MINIMUM_EXECUTION',
            'LIVE_COMMISSIONING','SCALE_IN_RECOVERED','TIME_EXIT','TP1_PROTECTION_TRANSITION'
          )
        GROUP BY rejection_code
        ORDER BY occurrences DESC, rejection_code ASC
        LIMIT 20
      ) blocker_row), '[]'::json) AS live_blockers_24h
  `);
  if (!rows[0]) throw new Error("数据库没有返回实盘状态快照");
  return rows[0];
}

export async function getBitgetLiveAdminSnapshot(now = new Date()): Promise<LiveAdminDashboard> {
  const currentTime = now.getTime();
  if (cache && currentTime - cache.savedAt <= FRESH_CACHE_MS) return cache.value;

  try {
    const envelope = await withTimeout(querySnapshot(), SNAPSHOT_TIMEOUT_MS);
    const dashboard = mapSnapshot(envelope, now);
    cache = { value: dashboard, savedAt: currentTime };
    return dashboard;
  } catch (error) {
    const message = error instanceof Error ? error.message : "实盘状态快照读取失败";
    if (cache && currentTime - cache.savedAt <= STALE_CACHE_MS) {
      return {
        ...cache.value,
        runtime: {
          ...cache.value.runtime,
          lastError: `正在显示最近一次成功快照；本次读取失败：${message}`,
        },
      };
    }
    return fallbackDashboard(now, message);
  }
}
