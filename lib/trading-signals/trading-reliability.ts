import "server-only";

import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { paymentNotifyTo, sendRawEmail } from "@/lib/email/notifications";
import {
  getBitgetDemoCurrentPositions,
  getBitgetDemoEnvironment,
  getBitgetDemoPendingStrategyOrders,
  getCachedBitgetServerClock,
  placeBitgetDemoProtectionOrder,
  processBitgetDemoExecutionOutbox,
  syncBitgetServerClock,
  testBitgetDemoConnection,
  type BitgetDemoPosition,
  type BitgetDemoStrategyOrder,
  type BitgetSupportedSymbol,
} from "@/lib/bitget/demo-client";
import type {
  TradeExecutionAction,
  TradeExecutionOutboxItem,
  TradeExecutionStatus,
  TradingReliabilityDashboard,
  TradingReliabilityIncident,
  TradingReliabilityMode,
  TradingReliabilitySeverity,
  TradingReliabilityWatchdogReport,
} from "@/types/trading-reliability";

const HEARTBEAT_STALE_SECONDS = 180;
const MARKET_STALE_SECONDS = 180;
const OUTBOX_STUCK_SECONDS = 180;
const MAX_SAFE_CLOCK_SKEW_MS = 5_000;
const RECOVERY_HEALTHY_RUNS = 3;
const AUTO_REPAIR_AFTER_OCCURRENCES = 2;

interface ReliabilityStateRow {
  mode: TradingReliabilityMode;
  admin_override: "MANAGE_ONLY" | "PAUSED" | null;
  mode_reason: string;
  server_time_offset_ms: number | null;
  last_server_time_sync_at: Date | string | null;
  last_watchdog_at: Date | string | null;
  last_healthy_at: Date | string | null;
  consecutive_healthy_runs: number;
  consecutive_failures: number;
  heartbeat_age_seconds: number | null;
  market_age_seconds: number | null;
  unprotected_positions: number;
  orphan_positions: number;
  unknown_protection_orders: number;
  last_report: unknown;
}

interface RuntimeStateRow {
  last_heartbeat_at: Date | string | null;
  last_market_at: Date | string | null;
}

interface ActiveDecisionRow {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  status: string;
  stop_loss: number | null;
  target_2: number | null;
  protection_order_id: string | null;
}

interface OutboxRow {
  id: string;
  idempotency_key: string;
  decision_id: string | null;
  action_type: TradeExecutionAction;
  symbol: string;
  status: TradeExecutionStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: Date | string | null;
  client_oid: string | null;
  bitget_order_id: string | null;
  last_error: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface IncidentRow {
  id: string;
  fingerprint: string;
  severity: TradingReliabilitySeverity;
  code: string;
  symbol: string | null;
  decision_id: string | null;
  message: string;
  occurrence_count: number;
  resolved: boolean;
  notified_at: Date | string | null;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  resolved_at: Date | string | null;
}

interface CountByStatusRow {
  status: TradeExecutionStatus;
  count: bigint | number | string;
}

interface CountRow {
  count: bigint | number | string;
}

interface ReliabilityIssue {
  severity: TradingReliabilitySeverity;
  code: string;
  symbol: string | null;
  decisionId: string | null;
  message: string;
  payload?: Record<string, unknown>;
}

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function count(value: bigint | number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

function ageSeconds(value: Date | string | null | undefined, now = new Date()): number | null {
  const time = value instanceof Date ? value.getTime() : value ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / 1000));
}

function issueFingerprint(issue: ReliabilityIssue): string {
  return createHash("sha256")
    .update([issue.code, issue.symbol ?? "", issue.decisionId ?? ""].join("|"))
    .digest("hex");
}

function directionSide(direction: ActiveDecisionRow["direction"]): "long" | "short" | null {
  if (direction === "LONG") return "long";
  if (direction === "SHORT") return "short";
  return null;
}

function decisionMatchesPosition(decision: ActiveDecisionRow, position: BitgetDemoPosition): boolean {
  return decision.symbol === position.symbol && directionSide(decision.direction) === position.posSide;
}

function decisionMatchesProtection(decision: ActiveDecisionRow, order: BitgetDemoStrategyOrder): boolean {
  return decision.symbol === order.symbol && directionSide(decision.direction) === order.posSide;
}

function modeLabel(mode: TradingReliabilityMode): string {
  return {
    RUNNING: "正常运行",
    OPENING_DISABLED: "暂停新开仓",
    MANAGE_ONLY: "只管理已有仓位",
    EMERGENCY_CLOSE_ONLY: "紧急风险处理",
    PAUSED: "管理员暂停",
    RECOVERING: "恢复观察中",
  }[mode];
}

function modeAllowsOpening(mode: TradingReliabilityMode): boolean {
  return mode === "RUNNING";
}

function modeAllowsManagement(_mode: TradingReliabilityMode): boolean {
  // 即使管理员暂停，新开仓会被阻止，但已有Demo仓位仍必须继续被管理和对账。
  return true;
}

let ensured = false;
export async function ensureTradingReliabilityTables(): Promise<boolean> {
  if (!prisma) return false;
  if (ensured) return true;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_reliability_state (
        id TEXT PRIMARY KEY,
        api_mode TEXT NOT NULL DEFAULT 'UTA_V3_DEMO',
        paptrading_required BOOLEAN NOT NULL DEFAULT TRUE,
        real_trading_locked BOOLEAN NOT NULL DEFAULT TRUE,
        mode TEXT NOT NULL DEFAULT 'RECOVERING',
        admin_override TEXT,
        mode_reason TEXT NOT NULL DEFAULT '等待Phase 4首次健康检查',
        server_time_offset_ms INTEGER,
        last_server_time_sync_at TIMESTAMPTZ,
        last_watchdog_at TIMESTAMPTZ,
        last_healthy_at TIMESTAMPTZ,
        consecutive_healthy_runs INTEGER NOT NULL DEFAULT 0,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        heartbeat_age_seconds INTEGER,
        market_age_seconds INTEGER,
        unprotected_positions INTEGER NOT NULL DEFAULT 0,
        orphan_positions INTEGER NOT NULL DEFAULT 0,
        unknown_protection_orders INTEGER NOT NULL DEFAULT 0,
        last_report JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT trade_reliability_api_mode_check CHECK (api_mode = 'UTA_V3_DEMO'),
        CONSTRAINT trade_reliability_paper_check CHECK (paptrading_required = TRUE),
        CONSTRAINT trade_reliability_real_lock_check CHECK (real_trading_locked = TRUE),
        CONSTRAINT trade_reliability_mode_check CHECK (mode IN ('RUNNING','OPENING_DISABLED','MANAGE_ONLY','EMERGENCY_CLOSE_ONLY','PAUSED','RECOVERING')),
        CONSTRAINT trade_reliability_admin_override_check CHECK (admin_override IS NULL OR admin_override IN ('MANAGE_ONLY','PAUSED'))
      )
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO trade_reliability_state (
        id, api_mode, paptrading_required, real_trading_locked, mode, mode_reason
      ) VALUES (
        'default','UTA_V3_DEMO',TRUE,TRUE,'RECOVERING','等待Phase 4首次健康检查'
      ) ON CONFLICT (id) DO UPDATE SET
        api_mode='UTA_V3_DEMO',paptrading_required=TRUE,real_trading_locked=TRUE,updated_at=NOW()
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_execution_outbox (
        id TEXT PRIMARY KEY,idempotency_key TEXT NOT NULL UNIQUE,decision_id TEXT,
        action_type TEXT NOT NULL,symbol TEXT NOT NULL,direction TEXT,payload JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_until TIMESTAMPTZ,client_oid TEXT,bitget_order_id TEXT,last_error TEXT NOT NULL DEFAULT '',
        acknowledged_at TIMESTAMPTZ,confirmed_at TIMESTAMPTZ,reconciled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT trade_execution_outbox_action_check CHECK (action_type IN ('OPEN_MARKET','CLOSE_MARKET','PLACE_PROTECTION','CANCEL_PROTECTION')),
        CONSTRAINT trade_execution_outbox_status_check CHECK (status IN ('PENDING','PROCESSING','ACKNOWLEDGED','CONFIRMED','FAILED','RECONCILED'))
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_reliability_incidents (
        id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL UNIQUE,severity TEXT NOT NULL,code TEXT NOT NULL,
        symbol TEXT,decision_id TEXT,message TEXT NOT NULL,payload JSONB,
        occurrence_count INTEGER NOT NULL DEFAULT 1,resolved BOOLEAN NOT NULL DEFAULT FALSE,
        notified_at TIMESTAMPTZ,first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),resolved_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT trade_reliability_incident_severity_check CHECK (severity IN ('INFO','WARNING','CRITICAL'))
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_watchdog_runs (
        id TEXT PRIMARY KEY,source TEXT NOT NULL,mode TEXT NOT NULL,ok BOOLEAN NOT NULL,
        issue_count INTEGER NOT NULL DEFAULT 0,repair_count INTEGER NOT NULL DEFAULT 0,
        report JSONB NOT NULL,started_at TIMESTAMPTZ NOT NULL,finished_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT trade_watchdog_runs_source_check CHECK (source IN ('CRON','ADMIN'))
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS trade_execution_outbox_ready_idx ON trade_execution_outbox(status,next_attempt_at,created_at)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS trade_reliability_incidents_open_idx ON trade_reliability_incidents(resolved,severity,last_seen_at DESC)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS trade_watchdog_runs_time_idx ON trade_watchdog_runs(created_at DESC)`);
    ensured = true;
    return true;
  } catch (error) {
    console.error("Phase 4 reliability tables unavailable", error);
    return false;
  }
}

async function readState(): Promise<ReliabilityStateRow | null> {
  if (!(await ensureTradingReliabilityTables()) || !prisma) return null;
  const rows = await prisma.$queryRawUnsafe<ReliabilityStateRow[]>(
    `SELECT * FROM trade_reliability_state WHERE id='default' LIMIT 1`
  );
  return rows[0] ?? null;
}

async function readRuntimeState(): Promise<RuntimeStateRow | null> {
  if (!prisma) return null;
  const rows = await prisma.$queryRawUnsafe<RuntimeStateRow[]>(
    `SELECT last_heartbeat_at,last_market_at FROM trade_bitget_runtime_state WHERE id='default' LIMIT 1`
  ).catch(() => [] as RuntimeStateRow[]);
  return rows[0] ?? null;
}

async function readActiveDecisions(): Promise<ActiveDecisionRow[]> {
  if (!prisma) return [];
  return prisma.$queryRawUnsafe<ActiveDecisionRow[]>(`
    SELECT id,symbol,direction,status,stop_loss,target_2,protection_order_id
    FROM trade_three_horizon_decisions
    WHERE mode='DEMO' AND status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING','ERROR')
    ORDER BY updated_at DESC
  `).catch(() => [] as ActiveDecisionRow[]);
}

async function persistIssues(issues: ReliabilityIssue[]): Promise<Map<string, IncidentRow>> {
  const result = new Map<string, IncidentRow>();
  if (!prisma) return result;
  const openRows = await prisma.$queryRawUnsafe<IncidentRow[]>(
    `SELECT * FROM trade_reliability_incidents WHERE resolved=FALSE`
  );
  const currentFingerprints = new Set<string>();
  for (const issue of issues) {
    const fingerprint = issueFingerprint(issue);
    currentFingerprints.add(fingerprint);
    const rows = await prisma.$queryRawUnsafe<IncidentRow[]>(
      `INSERT INTO trade_reliability_incidents (
         id,fingerprint,severity,code,symbol,decision_id,message,payload,occurrence_count,
         resolved,first_seen_at,last_seen_at,updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,1,FALSE,NOW(),NOW(),NOW())
       ON CONFLICT (fingerprint) DO UPDATE SET
         severity=EXCLUDED.severity,code=EXCLUDED.code,symbol=EXCLUDED.symbol,
         decision_id=EXCLUDED.decision_id,message=EXCLUDED.message,payload=EXCLUDED.payload,
         occurrence_count=CASE WHEN trade_reliability_incidents.resolved THEN 1 ELSE trade_reliability_incidents.occurrence_count+1 END,
         resolved=FALSE,resolved_at=NULL,last_seen_at=NOW(),updated_at=NOW()
       RETURNING *`,
      `tri_${randomUUID()}`,
      fingerprint,
      issue.severity,
      issue.code,
      issue.symbol,
      issue.decisionId,
      issue.message,
      JSON.stringify(issue.payload ?? {})
    );
    if (rows[0]) result.set(fingerprint, rows[0]);
  }
  for (const row of openRows) {
    if (currentFingerprints.has(row.fingerprint)) continue;
    await prisma.$executeRawUnsafe(
      `UPDATE trade_reliability_incidents
       SET resolved=TRUE,resolved_at=NOW(),updated_at=NOW()
       WHERE fingerprint=$1 AND resolved=FALSE`,
      row.fingerprint
    );
  }
  return result;
}

async function sendIncidentAlerts(
  issues: ReliabilityIssue[],
  persisted: Map<string, IncidentRow>,
  previouslyOpen: Set<string>
): Promise<void> {
  if (!prisma) return;
  for (const item of issues) {
    const alertable = item.severity !== "INFO";
    if (!alertable) continue;
    if (item.severity !== "WARNING" && item.severity !== "CRITICAL") continue;
    const fingerprint = issueFingerprint(item);
    if (previouslyOpen.has(fingerprint)) continue;
    const row = persisted.get(fingerprint);
    if (!row) continue;
    const result = await sendRawEmail({
      to: paymentNotifyTo(),
      subject: `[MOOX ${item.severity}] ${item.code}`,
      text: [
        "MOOX Bitget Demo Phase 4可靠性报警",
        "",
        `级别：${item.severity}`,
        `代码：${item.code}`,
        `标的：${item.symbol ?? "—"}`,
        `决策：${item.decisionId ?? "—"}`,
        `说明：${item.message}`,
        "",
        "系统已阻止不安全的新开仓，并继续管理已有Demo仓位。",
        "系统不会自动全部平仓。",
      ].join("\n"),
    });
    if (result.status === "sent") {
      await prisma.$executeRawUnsafe(
        `UPDATE trade_reliability_incidents SET notified_at=NOW(),updated_at=NOW() WHERE fingerprint=$1`,
        fingerprint
      );
    }
  }
}

function chooseMode(input: {
  state: ReliabilityStateRow | null;
  issues: ReliabilityIssue[];
  nextHealthyRuns: number;
}): { mode: TradingReliabilityMode; reason: string } {
  if (input.state?.admin_override === "PAUSED") {
    return { mode: "PAUSED", reason: "管理员已暂停新开仓；已有仓位仍继续管理。" };
  }
  if (input.state?.admin_override === "MANAGE_ONLY") {
    return { mode: "MANAGE_ONLY", reason: "管理员指定只管理已有仓位。" };
  }
  const codes = new Set(input.issues.map((issue) => issue.code));
  if (codes.has("ORPHAN_EXCHANGE_POSITION")) {
    return {
      mode: "EMERGENCY_CLOSE_ONLY",
      reason: "发现Bitget有仓而网站没有对应决策。系统不会自动全部平仓，需管理员核对。",
    };
  }
  if (
    codes.has("UNPROTECTED_POSITION") ||
    codes.has("OUTBOX_STUCK") ||
    codes.has("BITGET_RECONCILIATION_FAILED") ||
    codes.has("OUTBOX_FAILED")
  ) {
    return { mode: "MANAGE_ONLY", reason: "交易执行或保护状态异常，只允许管理已有仓位。" };
  }
  if (
    codes.has("TRADING_HEARTBEAT_STALE") ||
    codes.has("MARKET_DATA_STALE") ||
    codes.has("CLOCK_SKEW")
  ) {
    return { mode: "OPENING_DISABLED", reason: "心跳、行情或服务器时间异常，暂停新开仓。" };
  }
  if (input.issues.some((issue) => issue.severity === "WARNING")) {
    return { mode: "RECOVERING", reason: "存在警告项，等待连续健康检查。" };
  }
  if (input.nextHealthyRuns < RECOVERY_HEALTHY_RUNS) {
    return {
      mode: "RECOVERING",
      reason: `异常恢复后需连续健康检查${RECOVERY_HEALTHY_RUNS}轮；当前${input.nextHealthyRuns}轮。`,
    };
  }
  return { mode: "RUNNING", reason: "连续健康检查通过，允许按既有Demo策略规则开仓。" };
}

async function repairMissingProtections(input: {
  issues: ReliabilityIssue[];
  persisted: Map<string, IncidentRow>;
  decisions: ActiveDecisionRow[];
  protections: BitgetDemoStrategyOrder[];
}): Promise<string[]> {
  const repairs: string[] = [];
  const environment = getBitgetDemoEnvironment();
  const horizonAllowed = process.env.BITGET_DEMO_THREE_HORIZON_EXECUTION_ALLOWED?.toLowerCase() === "true";
  if (!environment.executionAllowed || !horizonAllowed || !prisma) return repairs;

  for (const issue of input.issues) {
    if (issue.code !== "UNPROTECTED_POSITION" || !issue.decisionId) continue;
    const persisted = input.persisted.get(issueFingerprint(issue));
    if (!persisted || persisted.occurrence_count < AUTO_REPAIR_AFTER_OCCURRENCES) continue;
    const decision = input.decisions.find((row) => row.id === issue.decisionId);
    if (!decision || !decision.stop_loss || !decision.target_2) continue;
    if (input.protections.some((order) => decisionMatchesProtection(decision, order))) continue;
    const existingOutbox = await prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS count FROM trade_execution_outbox
       WHERE decision_id=$1 AND action_type='PLACE_PROTECTION'
         AND status IN ('PENDING','PROCESSING','ACKNOWLEDGED','CONFIRMED')`,
      decision.id
    );
    if (count(existingOutbox[0]?.count) > 0) continue;
    const side = directionSide(decision.direction);
    if (!side) continue;
    try {
      const result = await placeBitgetDemoProtectionOrder({
        paperOrderId: `${decision.id}:phase4-repair`,
        symbol: decision.symbol as BitgetSupportedSymbol,
        posSide: side,
        stopLoss: decision.stop_loss,
        takeProfit: decision.target_2,
      });
      await prisma.$executeRawUnsafe(
        `UPDATE trade_three_horizon_decisions
         SET protection_order_id=$2,rejection_code='',
             rejection_reason='Phase 4看门狗已补挂交易所侧保护单。',updated_at=NOW()
         WHERE id=$1`,
        decision.id,
        result.orderId
      );
      repairs.push(`${decision.symbol}已补挂Demo保护单${result.orderId}`);
    } catch (error) {
      repairs.push(`${decision.symbol}补挂保护单失败：${error instanceof Error ? error.message : "未知错误"}`);
    }
  }
  return repairs;
}

function issueSummary(issues: ReliabilityIssue[]): { critical: number; warnings: number } {
  return {
    critical: issues.filter((issue) => issue.severity === "CRITICAL").length,
    warnings: issues.filter((issue) => issue.severity === "WARNING").length,
  };
}

export async function runTradingReliabilityWatchdog(input: {
  source: "CRON" | "ADMIN";
}): Promise<TradingReliabilityWatchdogReport> {
  const startedAt = new Date();
  const databaseReady = await ensureTradingReliabilityTables();
  if (!databaseReady || !prisma) {
    return {
      ok: false,
      source: input.source,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      mode: "PAUSED",
      modeReason: "数据库不可用，无法运行Phase 4可靠性检查。",
      openingAllowed: false,
      managementAllowed: true,
      serverTimeOffsetMs: null,
      heartbeatAgeSeconds: null,
      marketAgeSeconds: null,
      outboxProcessed: 0,
      outboxConfirmed: 0,
      outboxFailed: 0,
      positionsCount: 0,
      protectionOrdersCount: 0,
      unresolvedCritical: 1,
      unresolvedWarnings: 0,
      issues: [{ severity: "CRITICAL", code: "DATABASE_UNAVAILABLE", symbol: null, decisionId: null, message: "数据库不可用。" }],
      repairs: [],
      message: "Phase 4数据库不可用。",
    };
  }

  const state = await readState();
  const previouslyOpenRows = await prisma.$queryRawUnsafe<Array<{ fingerprint: string }>>(
    `SELECT fingerprint FROM trade_reliability_incidents WHERE resolved=FALSE`
  );
  const previouslyOpen: Set<string> = new Set(
    previouslyOpenRows.map((row: { fingerprint: string }) => row.fingerprint)
  );
  const issues: ReliabilityIssue[] = [];
  let clockOffset: number | null = null;
  let lastClockSync: string | null = null;
  try {
    const clock = await syncBitgetServerClock(true);
    clockOffset = clock.offsetMs;
    lastClockSync = clock.syncedAt;
    if (!clock.safe || Math.abs(clock.offsetMs) > MAX_SAFE_CLOCK_SKEW_MS) {
      issues.push({
        severity: "CRITICAL",
        code: "CLOCK_SKEW",
        symbol: null,
        decisionId: null,
        message: `本机与Bitget服务器时间偏差${clock.offsetMs}ms，交易写操作已被拦截。`,
      });
    }
  } catch (error) {
    const cached = getCachedBitgetServerClock();
    clockOffset = cached.syncedAt ? cached.offsetMs : null;
    lastClockSync = cached.syncedAt;
    issues.push({
      severity: "WARNING",
      code: "CLOCK_SYNC_FAILED",
      symbol: null,
      decisionId: null,
      message: error instanceof Error ? error.message : "Bitget服务器时间同步失败。",
    });
  }

  const runtime = await readRuntimeState();
  const heartbeatAge = ageSeconds(runtime?.last_heartbeat_at, startedAt);
  const marketAge = ageSeconds(runtime?.last_market_at, startedAt);
  if (heartbeatAge == null || heartbeatAge > HEARTBEAT_STALE_SECONDS) {
    issues.push({
      severity: "CRITICAL",
      code: "TRADING_HEARTBEAT_STALE",
      symbol: null,
      decisionId: null,
      message: heartbeatAge == null ? "尚无服务器交易心跳。" : `交易心跳已中断${heartbeatAge}秒。`,
    });
  }
  if (marketAge == null || marketAge > MARKET_STALE_SECONDS) {
    issues.push({
      severity: "CRITICAL",
      code: "MARKET_DATA_STALE",
      symbol: null,
      decisionId: null,
      message: marketAge == null ? "尚无有效行情时间。" : `最近行情已延迟${marketAge}秒。`,
    });
  }

  const outbox = await processBitgetDemoExecutionOutbox(20).catch((error) => {
    issues.push({
      severity: "CRITICAL",
      code: "OUTBOX_PROCESS_FAILED",
      symbol: null,
      decisionId: null,
      message: error instanceof Error ? error.message : "执行发件箱处理失败。",
    });
    return { processed: 0, confirmed: 0, acknowledged: 0, failed: 0 };
  });

  const stuckRows = await prisma.$queryRawUnsafe<OutboxRow[]>(
    `SELECT * FROM trade_execution_outbox
     WHERE status IN ('PENDING','PROCESSING','ACKNOWLEDGED')
       AND updated_at < NOW()-INTERVAL '${OUTBOX_STUCK_SECONDS} seconds'
     ORDER BY updated_at ASC LIMIT 50`
  );
  for (const row of stuckRows) {
    issues.push({
      severity: "CRITICAL",
      code: "OUTBOX_STUCK",
      symbol: row.symbol,
      decisionId: row.decision_id,
      message: `${row.action_type}任务已超过${OUTBOX_STUCK_SECONDS}秒没有确认，clientOid=${row.client_oid ?? "—"}。`,
    });
  }
  const failedRows = await prisma.$queryRawUnsafe<OutboxRow[]>(
    `SELECT * FROM trade_execution_outbox
     WHERE status='FAILED' AND attempt_count>=max_attempts
     ORDER BY updated_at DESC LIMIT 50`
  );
  for (const row of failedRows) {
    issues.push({
      severity: "CRITICAL",
      code: "OUTBOX_FAILED",
      symbol: row.symbol,
      decisionId: row.decision_id,
      message: `${row.action_type}任务达到最大重试次数：${row.last_error || "未知错误"}`,
    });
  }

  let positions: BitgetDemoPosition[] = [];
  let protections: BitgetDemoStrategyOrder[] = [];
  try {
    await testBitgetDemoConnection();
    [positions, protections] = await Promise.all([
      getBitgetDemoCurrentPositions(),
      getBitgetDemoPendingStrategyOrders(),
    ]);
  } catch (error) {
    issues.push({
      severity: "CRITICAL",
      code: "BITGET_RECONCILIATION_FAILED",
      symbol: null,
      decisionId: null,
      message: error instanceof Error ? error.message : "Bitget Demo账户对账失败。",
    });
  }

  const decisions = await readActiveDecisions();
  for (const position of positions) {
    const decision = decisions.find((row) => decisionMatchesPosition(row, position));
    if (!decision) {
      issues.push({
        severity: "CRITICAL",
        code: "ORPHAN_EXCHANGE_POSITION",
        symbol: position.symbol,
        decisionId: null,
        message: `Bitget Demo存在${position.posSide}仓位，但网站没有对应活动决策。系统不会自动全部平仓。`,
      });
      continue;
    }
    if (!protections.some((order) => decisionMatchesProtection(decision, order))) {
      issues.push({
        severity: "CRITICAL",
        code: "UNPROTECTED_POSITION",
        symbol: position.symbol,
        decisionId: decision.id,
        message: `活动仓位缺少交易所侧止损/止盈保护单；连续出现${AUTO_REPAIR_AFTER_OCCURRENCES}次后才尝试Demo补挂。`,
      });
    }
  }
  for (const protection of protections) {
    const decision = decisions.find((row) => decisionMatchesProtection(row, protection));
    if (!decision) {
      issues.push({
        severity: "WARNING",
        code: "UNKNOWN_PROTECTION_ORDER",
        symbol: protection.symbol,
        decisionId: null,
        message: `Bitget Demo存在未能匹配活动决策的保护单${protection.orderId}。`,
      });
    }
  }

  const persisted = await persistIssues(issues);
  const repairs = await repairMissingProtections({ issues, persisted, decisions, protections });
  await sendIncidentAlerts(issues, persisted, previouslyOpen).catch(() => undefined);

  const seriousIssues = issues.filter((issue) => issue.severity === "CRITICAL").length;
  const nextHealthyRuns = issues.length === 0
    ? (state?.consecutive_healthy_runs ?? 0) + 1
    : 0;
  const nextFailures = seriousIssues > 0
    ? (state?.consecutive_failures ?? 0) + 1
    : 0;
  const selection = chooseMode({ state, issues, nextHealthyRuns });
  const summary = issueSummary(issues);
  const finishedAt = new Date();
  const report: TradingReliabilityWatchdogReport = {
    ok: seriousIssues === 0,
    source: input.source,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    mode: selection.mode,
    modeReason: selection.reason,
    openingAllowed: modeAllowsOpening(selection.mode),
    managementAllowed: modeAllowsManagement(selection.mode),
    serverTimeOffsetMs: clockOffset,
    heartbeatAgeSeconds: heartbeatAge,
    marketAgeSeconds: marketAge,
    outboxProcessed: outbox.processed,
    outboxConfirmed: outbox.confirmed,
    outboxFailed: outbox.failed,
    positionsCount: positions.length,
    protectionOrdersCount: protections.length,
    unresolvedCritical: summary.critical,
    unresolvedWarnings: summary.warnings,
    issues: issues.map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      symbol: issue.symbol,
      decisionId: issue.decisionId,
      message: issue.message,
    })),
    repairs,
    message: issues.length
      ? `发现${summary.critical}个严重异常、${summary.warnings}个警告；模式已切换为${modeLabel(selection.mode)}。`
      : selection.reason,
  };

  await prisma.$executeRawUnsafe(
    `UPDATE trade_reliability_state SET
       api_mode='UTA_V3_DEMO',paptrading_required=TRUE,real_trading_locked=TRUE,
       mode=$1,mode_reason=$2,server_time_offset_ms=$3,
       last_server_time_sync_at=$4::timestamptz,last_watchdog_at=$5::timestamptz,
       last_healthy_at=CASE WHEN $6 THEN $5::timestamptz ELSE last_healthy_at END,
       consecutive_healthy_runs=$7,consecutive_failures=$8,
       heartbeat_age_seconds=$9,market_age_seconds=$10,
       unprotected_positions=$11,orphan_positions=$12,unknown_protection_orders=$13,
       last_report=$14::jsonb,updated_at=NOW()
     WHERE id='default'`,
    selection.mode,
    selection.reason,
    clockOffset,
    lastClockSync,
    finishedAt.toISOString(),
    issues.length === 0,
    nextHealthyRuns,
    nextFailures,
    heartbeatAge,
    marketAge,
    issues.filter((issue) => issue.code === "UNPROTECTED_POSITION").length,
    issues.filter((issue) => issue.code === "ORPHAN_EXCHANGE_POSITION").length,
    issues.filter((issue) => issue.code === "UNKNOWN_PROTECTION_ORDER").length,
    JSON.stringify(report)
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_watchdog_runs (
       id,source,mode,ok,issue_count,repair_count,report,started_at,finished_at,created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::timestamptz,$9::timestamptz,NOW())`,
    `twr_${randomUUID()}`,
    input.source,
    selection.mode,
    report.ok,
    issues.length,
    repairs.length,
    JSON.stringify(report),
    startedAt.toISOString(),
    finishedAt.toISOString()
  );
  return report;
}

export async function getTradingReliabilityOpeningGate(): Promise<{
  allowed: boolean;
  mode: TradingReliabilityMode;
  code: string;
  reason: string;
}> {
  const state = await readState();
  if (!state) {
    return {
      allowed: false,
      mode: "PAUSED",
      code: "PHASE4_DATABASE_UNAVAILABLE",
      reason: "Phase 4可靠性状态不可用，已阻止新开仓。",
    };
  }
  return {
    allowed: state.mode === "RUNNING" && !state.admin_override,
    mode: state.mode,
    code: state.mode === "RUNNING" && !state.admin_override ? "PHASE4_OK" : `PHASE4_${state.mode}`,
    reason: state.mode_reason,
  };
}

export async function setTradingReliabilityAdminMode(
  mode: "MANAGE_ONLY" | "PAUSED"
): Promise<void> {
  if (!(await ensureTradingReliabilityTables()) || !prisma) throw new Error("Phase 4数据库不可用");
  const reason = mode === "PAUSED"
    ? "管理员已暂停新开仓；已有仓位仍继续管理。"
    : "管理员指定只管理已有仓位。";
  await prisma.$executeRawUnsafe(
    `UPDATE trade_reliability_state SET
       admin_override=$1,mode=$1,mode_reason=$2,consecutive_healthy_runs=0,
       api_mode='UTA_V3_DEMO',paptrading_required=TRUE,real_trading_locked=TRUE,updated_at=NOW()
     WHERE id='default'`,
    mode,
    reason
  );
}

export async function clearTradingReliabilityAdminOverride(): Promise<void> {
  if (!(await ensureTradingReliabilityTables()) || !prisma) throw new Error("Phase 4数据库不可用");
  await prisma.$executeRawUnsafe(`
    UPDATE trade_reliability_state SET
      admin_override=NULL,mode='RECOVERING',
      mode_reason='管理员已申请恢复；需连续健康检查后才允许新开仓。',
      consecutive_healthy_runs=0,api_mode='UTA_V3_DEMO',paptrading_required=TRUE,
      real_trading_locked=TRUE,updated_at=NOW()
    WHERE id='default'
  `);
}

export async function retryFailedTradeOutbox(): Promise<{ reset: number; processed: number }> {
  if (!(await ensureTradingReliabilityTables()) || !prisma) throw new Error("Phase 4数据库不可用");
  const updated = await prisma.$executeRawUnsafe(`
    UPDATE trade_execution_outbox SET
      status='PENDING',next_attempt_at=NOW(),locked_until=NULL,
      max_attempts=GREATEST(max_attempts,attempt_count+3),updated_at=NOW()
    WHERE status='FAILED'
  `);
  const processed = await processBitgetDemoExecutionOutbox(20);
  return { reset: Number(updated), processed: processed.processed };
}

function mapOutbox(row: OutboxRow): TradeExecutionOutboxItem {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    decisionId: row.decision_id,
    actionType: row.action_type,
    symbol: row.symbol,
    status: row.status,
    attemptCount: count(row.attempt_count),
    maxAttempts: count(row.max_attempts),
    clientOid: row.client_oid,
    bitgetOrderId: row.bitget_order_id,
    lastError: row.last_error,
    nextAttemptAt: iso(row.next_attempt_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapIncident(row: IncidentRow): TradingReliabilityIncident {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    severity: row.severity,
    code: row.code,
    symbol: row.symbol,
    decisionId: row.decision_id,
    message: row.message,
    occurrenceCount: count(row.occurrence_count),
    resolved: Boolean(row.resolved),
    firstSeenAt: iso(row.first_seen_at) ?? new Date().toISOString(),
    lastSeenAt: iso(row.last_seen_at) ?? new Date().toISOString(),
    resolvedAt: iso(row.resolved_at),
  };
}

export async function getTradingReliabilityDashboard(): Promise<TradingReliabilityDashboard> {
  const databaseReady = await ensureTradingReliabilityTables();
  const now = new Date();
  const fallback: TradingReliabilityDashboard = {
    databaseReady: false,
    generatedAt: now.toISOString(),
    phase: "TRADE_RELIABILITY_PHASE4",
    realTradingLocked: true,
    apiMode: "UTA_V3_DEMO",
    paptradingRequired: true,
    mode: "PAUSED",
    modeLabel: "数据库不可用",
    modeReason: "Phase 4数据库表尚未建立或连接不可用。",
    openingAllowed: false,
    managementAllowed: true,
    serverTimeOffsetMs: null,
    clockSkewOk: false,
    lastServerTimeSyncAt: null,
    lastWatchdogAt: null,
    lastHealthyAt: null,
    consecutiveHealthyRuns: 0,
    consecutiveFailures: 0,
    heartbeatAgeSeconds: null,
    marketAgeSeconds: null,
    pendingOutbox: 0,
    processingOutbox: 0,
    acknowledgedOutbox: 0,
    failedOutbox: 0,
    stuckOutbox: 0,
    unprotectedPositions: 0,
    orphanPositions: 0,
    unknownProtectionOrders: 0,
    unresolvedCriticalIncidents: 0,
    unresolvedWarningIncidents: 0,
    recentOutbox: [],
    recentIncidents: [],
    lastReport: null,
  };
  if (!databaseReady || !prisma) return fallback;

  const [state, statusRows, stuckRows, incidentCounts, outboxRows, incidentRows] = await Promise.all([
    readState(),
    prisma.$queryRawUnsafe<CountByStatusRow[]>(
      `SELECT status,COUNT(*) AS count FROM trade_execution_outbox GROUP BY status`
    ),
    prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS count FROM trade_execution_outbox
       WHERE status IN ('PENDING','PROCESSING','ACKNOWLEDGED')
         AND updated_at<NOW()-INTERVAL '${OUTBOX_STUCK_SECONDS} seconds'`
    ),
    prisma.$queryRawUnsafe<Array<{ severity: TradingReliabilitySeverity; count: bigint | number | string }>>(
      `SELECT severity,COUNT(*) AS count FROM trade_reliability_incidents
       WHERE resolved=FALSE GROUP BY severity`
    ),
    prisma.$queryRawUnsafe<OutboxRow[]>(
      `SELECT * FROM trade_execution_outbox ORDER BY updated_at DESC LIMIT 30`
    ),
    prisma.$queryRawUnsafe<IncidentRow[]>(
      `SELECT * FROM trade_reliability_incidents ORDER BY resolved ASC,last_seen_at DESC LIMIT 50`
    ),
  ]);
  if (!state) return fallback;
  const byStatus = new Map<string, number>(
    statusRows.map((row: CountByStatusRow): [string, number] => [row.status, count(row.count)])
  );
  const bySeverity = new Map<TradingReliabilitySeverity, number>(
    incidentCounts.map(
      (row: { severity: TradingReliabilitySeverity; count: bigint | number | string }): [TradingReliabilitySeverity, number] => [
        row.severity,
        count(row.count),
      ]
    )
  );
  const offset = state.server_time_offset_ms;
  return {
    databaseReady: true,
    generatedAt: now.toISOString(),
    phase: "TRADE_RELIABILITY_PHASE4",
    realTradingLocked: true,
    apiMode: "UTA_V3_DEMO",
    paptradingRequired: true,
    mode: state.mode,
    modeLabel: modeLabel(state.mode),
    modeReason: state.mode_reason,
    openingAllowed: modeAllowsOpening(state.mode) && !state.admin_override,
    managementAllowed: true,
    serverTimeOffsetMs: offset,
    clockSkewOk: offset != null && Math.abs(offset) <= MAX_SAFE_CLOCK_SKEW_MS,
    lastServerTimeSyncAt: iso(state.last_server_time_sync_at),
    lastWatchdogAt: iso(state.last_watchdog_at),
    lastHealthyAt: iso(state.last_healthy_at),
    consecutiveHealthyRuns: count(state.consecutive_healthy_runs),
    consecutiveFailures: count(state.consecutive_failures),
    heartbeatAgeSeconds: state.heartbeat_age_seconds,
    marketAgeSeconds: state.market_age_seconds,
    pendingOutbox: byStatus.get("PENDING") ?? 0,
    processingOutbox: byStatus.get("PROCESSING") ?? 0,
    acknowledgedOutbox: byStatus.get("ACKNOWLEDGED") ?? 0,
    failedOutbox: byStatus.get("FAILED") ?? 0,
    stuckOutbox: count(stuckRows[0]?.count),
    unprotectedPositions: count(state.unprotected_positions),
    orphanPositions: count(state.orphan_positions),
    unknownProtectionOrders: count(state.unknown_protection_orders),
    unresolvedCriticalIncidents: bySeverity.get("CRITICAL") ?? 0,
    unresolvedWarningIncidents: bySeverity.get("WARNING") ?? 0,
    recentOutbox: outboxRows.map(mapOutbox),
    recentIncidents: incidentRows.map(mapIncident),
    lastReport: parseJson<TradingReliabilityWatchdogReport | null>(state.last_report, null),
  };
}
