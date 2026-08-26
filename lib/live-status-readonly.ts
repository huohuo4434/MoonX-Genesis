import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  ThreeHorizonCondition,
  ThreeHorizonDecisionStatus,
  ThreeHorizonDirection,
  ThreeHorizonStrategyMode,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";
import { beijingDayUtcRange, buildTradingCandidateFunnel } from "@/lib/trading-signals/trading-candidate-funnel-core";
import type { FunnelDecision } from "@/lib/trading-signals/trading-candidate-funnel-core";

type RuntimeRow = {
  paused: boolean;
  pause_reason: string | null;
  last_heartbeat_at: Date | null;
  last_strategy_at: Date | null;
  last_order_attempt_at: Date | null;
  last_order_success_at: Date | null;
  account_snapshot: unknown;
  last_error: string | null;
};

type ProfileRow = {
  strategy_type: string;
  enabled: boolean;
  mode: string;
  last_scan_at: Date | null;
};

type DecisionRow = {
  id: string;
  run_id: string;
  strategy_type: string;
  mode: string;
  symbol: string;
  status: string;
  direction: string;
  confidence: number;
  technical_score: number;
  forecast_score: number;
  conditions: unknown;
  rejection_code: string | null;
  rejection_reason: string | null;
  current_price: number | null;
  entry_price: number | null;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  quantity: number | null;
  risk_amount_usdt: number | null;
  expires_at: Date | null;
  opened_at: Date | null;
  closed_at: Date | null;
  realized_pnl_usdt: number | null;
  created_at: Date;
  updated_at: Date;
};

type DailyStatRow = {
  strategy_type: string;
  scans_today: number;
  symbols_evaluated_today: number;
  ready_today: number;
  blocked_today: number;
  order_attempts_today: number;
  opened_today: number;
};

type FunnelDecisionRow = {
  strategy_type: string;
  symbol: string;
  direction: string;
  status: string;
  conditions: unknown;
  rejection_code: string | null;
  rejection_reason: string | null;
  entry_price: number | null;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  client_oid: string | null;
  bitget_order_id: string | null;
  updated_at: Date;
};

export type ReadOnlyLiveDecision = {
  id: string;
  runId: string;
  strategyType: ThreeHorizonStrategyType;
  strategyLabel: string;
  mode: ThreeHorizonStrategyMode;
  symbol: string;
  status: ThreeHorizonDecisionStatus;
  direction: ThreeHorizonDirection;
  confidence: number;
  technicalScore: number;
  forecastScore: number;
  conditions: ThreeHorizonCondition[];
  conditionsMet: number;
  conditionsTotal: number;
  rejectionCode: string;
  rejectionReason: string;
  currentPrice: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  quantity: number | null;
  riskAmountUsdt: number | null;
  expiresAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  realizedPnlUsdt: number | null;
  updatedAt: string;
};

const profileMeta = {
  INTRADAY: { label: "超短线", environmentTimeframe: "4H", directionTimeframe: "30m", entryTimeframe: "5m结构/1m触发" },
  SWING: { label: "中线", environmentTimeframe: "1D/1W", directionTimeframe: "4H", entryTimeframe: "1H" },
  POSITION: { label: "长线", environmentTimeframe: "1M/1W", directionTimeframe: "1D", entryTimeframe: "4H" },
} as const;

function iso(value: Date | null | undefined) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function conditions(value: unknown): ThreeHorizonCondition[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ThreeHorizonCondition => Boolean(
    item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string"
  ));
}

export async function getReadOnlyLiveStatusSnapshot(now = new Date()) {
  if (!prisma) return { databaseReady: false, runtime: null, strategy: null };
  try {
    const day = beijingDayUtcRange(now);
    const [runtimeRows, profileRows, decisionRows, dailyStatRows, funnelDecisionRows] = await Promise.all([
      prisma.$queryRaw<RuntimeRow[]>`
        SELECT paused, pause_reason, last_heartbeat_at, last_strategy_at,
               last_order_attempt_at, last_order_success_at, account_snapshot, last_error
        FROM trade_bitget_runtime_state WHERE id = 'default' LIMIT 1
      `,
      prisma.$queryRaw<ProfileRow[]>`
        SELECT strategy_type, enabled, mode, last_scan_at
        FROM trade_three_horizon_profiles ORDER BY strategy_type
      `,
      prisma.$queryRaw<DecisionRow[]>`
        SELECT id, run_id, strategy_type, mode, symbol, status, direction, confidence,
               technical_score, forecast_score,
               conditions, rejection_code, rejection_reason, current_price, entry_price,
               stop_loss, target_1, target_2, quantity, risk_amount_usdt, expires_at,
               opened_at, closed_at, realized_pnl_usdt, created_at, updated_at
        FROM trade_three_horizon_decisions ORDER BY created_at DESC LIMIT 120
      `,
      prisma.$queryRaw<DailyStatRow[]>`
        SELECT strategy_type,
               COUNT(DISTINCT run_id)::int AS scans_today,
               COUNT(DISTINCT symbol)::int AS symbols_evaluated_today,
               COUNT(*) FILTER (WHERE status IN ('READY','SHADOW_READY'))::int AS ready_today,
               COUNT(*) FILTER (WHERE status = 'BLOCKED')::int AS blocked_today,
               COUNT(*) FILTER (WHERE status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSED','ERROR'))::int AS order_attempts_today,
               COUNT(*) FILTER (WHERE status IN ('OPEN','PARTIAL','CLOSED'))::int AS opened_today
        FROM trade_three_horizon_decisions
        WHERE updated_at >= ${day.start} AND updated_at < ${day.end}
        GROUP BY strategy_type
      `,
      prisma.$queryRaw<FunnelDecisionRow[]>`
        SELECT DISTINCT ON (strategy_type, UPPER(symbol))
               strategy_type, symbol, direction, status, conditions, rejection_code, rejection_reason,
               entry_price, stop_loss, target_1, target_2, client_oid, bitget_order_id, updated_at
        FROM trade_three_horizon_decisions
        WHERE updated_at >= ${day.start} AND updated_at < ${day.end}
        ORDER BY strategy_type, UPPER(symbol), updated_at DESC, created_at DESC
      `,
    ]);
    const runtime = runtimeRows[0] ?? null;
    const latestDecisions: ReadOnlyLiveDecision[] = decisionRows.map((row) => {
      const rowConditions = conditions(row.conditions);
      const strategyType = row.strategy_type as ThreeHorizonStrategyType;
      return {
        id: row.id,
        runId: row.run_id,
        strategyType,
        strategyLabel: profileMeta[strategyType]?.label ?? row.strategy_type,
        mode: row.mode as ThreeHorizonStrategyMode,
        symbol: row.symbol,
        status: row.status as ThreeHorizonDecisionStatus,
        direction: row.direction as ThreeHorizonDirection,
        confidence: Number(row.confidence) || 0,
        technicalScore: Number(row.technical_score) || 0,
        forecastScore: Number(row.forecast_score) || 0,
        conditions: rowConditions,
        conditionsMet: rowConditions.filter((item) => item.met).length,
        conditionsTotal: rowConditions.length,
        rejectionCode: row.rejection_code ?? "",
        rejectionReason: row.rejection_reason ?? "",
        currentPrice: row.current_price,
        entryPrice: row.entry_price,
        stopLoss: row.stop_loss,
        target1: row.target_1,
        target2: row.target_2,
        quantity: row.quantity,
        riskAmountUsdt: row.risk_amount_usdt,
        expiresAt: iso(row.expires_at),
        openedAt: iso(row.opened_at),
        closedAt: iso(row.closed_at),
        realizedPnlUsdt: row.realized_pnl_usdt,
        updatedAt: iso(row.updated_at) ?? now.toISOString(),
      };
    });
    const stats = (["INTRADAY", "SWING", "POSITION"] as const).map((strategyType) => {
      const row = dailyStatRows.find((item) => item.strategy_type === strategyType);
      return {
        strategyType,
        scansToday: Number(row?.scans_today ?? 0),
        symbolsEvaluatedToday: Number(row?.symbols_evaluated_today ?? 0),
        readyToday: Number(row?.ready_today ?? 0),
        blockedToday: Number(row?.blocked_today ?? 0),
        orderAttemptsToday: Number(row?.order_attempts_today ?? 0),
        openedToday: Number(row?.opened_today ?? 0),
      };
    });
    const profiles = profileRows.map((row) => {
      const strategyType = row.strategy_type as ThreeHorizonStrategyType;
      return {
        strategyType,
        label: profileMeta[strategyType]?.label ?? row.strategy_type,
        enabled: row.enabled,
        mode: row.mode,
        lastScanAt: iso(row.last_scan_at),
      };
    });
    const funnelDecisions: FunnelDecision[] = funnelDecisionRows.map((row) => ({
      strategyType: row.strategy_type as ThreeHorizonStrategyType,
      symbol: row.symbol,
      direction: row.direction,
      status: row.status,
      conditions: conditions(row.conditions),
      rejectionCode: row.rejection_code ?? "",
      rejectionReason: row.rejection_reason ?? "",
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      target1: row.target_1,
      target2: row.target_2,
      clientOid: row.client_oid,
      bitgetOrderId: row.bitget_order_id,
      updatedAt: iso(row.updated_at) ?? now.toISOString(),
    }));
    const account = asRecord(runtime?.account_snapshot);
    const lastHeartbeatAt = iso(runtime?.last_heartbeat_at);
    const heartbeatAgeSeconds = lastHeartbeatAt
      ? Math.max(0, Math.round((now.getTime() - Date.parse(lastHeartbeatAt)) / 1000))
      : null;
    return {
      databaseReady: true,
      runtime: runtime ? {
        serverHealthy: !runtime.paused && heartbeatAgeSeconds != null && heartbeatAgeSeconds <= 180 && account.connected === true,
        paused: runtime.paused,
        pauseReason: runtime.pause_reason ?? "",
        cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
        lastHeartbeatAt,
        heartbeatAgeSeconds,
        lastStrategyAt: iso(runtime.last_strategy_at),
        lastOrderAttemptAt: iso(runtime.last_order_attempt_at),
        lastOrderSuccessAt: iso(runtime.last_order_success_at),
        lastError: runtime.last_error ?? "",
        account,
      } : null,
      strategy: {
        databaseReady: profileRows.length > 0,
        profiles,
        latestDecisions,
        stats,
        candidateFunnel: buildTradingCandidateFunnel(funnelDecisions, now),
      },
    };
  } catch {
    return { databaseReady: false, runtime: null, strategy: null };
  }
}
