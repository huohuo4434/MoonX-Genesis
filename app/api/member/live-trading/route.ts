// MOOX_V720110_FAST_LIVE_STATUS: bounded read-only status endpoint; page load must never run custody synchronously.
// MOOX_V720108_LIVE_ACTIVATION_DIAGNOSTICS: diagnose migration/env/exchange/cron even while Unified Live DB is missing.
// MOOX_V720106_LIVE_HEARTBEAT_DIAGNOSTICS: expose authoritative cron/runtime heartbeat to member diagnostics.
import { NextRequest, NextResponse } from "next/server";
import {
  isUnifiedLiveAdmin,
  resolveUnifiedLiveActor,
} from "@/lib/trading-signals/unified-live-auth";
import {
  getBitgetDemoClosedPositions,
  getBitgetDemoCurrentPositions,
  getBitgetDemoEnvironment,
} from "@/lib/bitget/demo-client";
import {
  isUnifiedLiveActiveExecutionEnabled,
  readUnifiedLiveRuntimeConfig,
} from "@/lib/trading-signals/unified-live-config";
import {
  getUnifiedLiveAccount,
} from "@/lib/trading-signals/unified-live-store";
import { getReadOnlyLiveStatusSnapshot, type ReadOnlyLiveDecision } from "@/lib/live-status-readonly";
import { getChinaDateKey } from "@/lib/date/china-date";
import { aiTradingFocusPriority } from "@/lib/trading-signals/ai-trading-focus";
import { rankDailyChampionBoard } from "@/lib/trading-signals/daily-champion-core";
import { evaluateMarketSessionExposureSafety } from "@/lib/trading-signals/market-session-exposure-core";

// MOOX_V720105_LIVE_VISIBILITY: authoritative positions + plans + no-order diagnosis for the member live page.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const LIVE_STATUS_DEADLINE_MS = 9_000;

const ACTIVE_SLICE_STATUSES = new Set(["PENDING", "OPEN", "PARTIALLY_CLOSED", "ORPHAN_PENDING_CLAIM"]);
const PLAN_STATUSES = new Set(["OBSERVING", "READY", "SHADOW_READY", "BLOCKED"]);
const EXECUTION_STATUSES = new Set(["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSED", "ERROR"]);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isFreshIso(value: string | null | undefined, maxAgeSeconds: number): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  return Date.now() - parsed <= maxAgeSeconds * 1000;
}

function strategyToHorizon(strategyType: string): "SHORT" | "MEDIUM" | "LONG" {
  if (strategyType === "INTRADAY") return "SHORT";
  if (strategyType === "SWING") return "MEDIUM";
  return "LONG";
}

function latestUnique<T extends { strategyType: string; symbol: string }>(rows: T[], limit: number): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    const key = `${row.strategyType}:${row.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
    if (result.length >= limit) break;
  }
  return result;
}

function mapPlan(row: ReadOnlyLiveDecision) {
  return {
    id: row.id,
    strategyType: row.strategyType,
    horizon: strategyToHorizon(row.strategyType),
    strategyLabel: row.strategyLabel,
    symbol: row.symbol,
    status: row.status,
    direction: row.direction,
    confidence: row.confidence,
    currentPrice: row.currentPrice,
    entryPrice: row.entryPrice,
    stopLoss: row.stopLoss,
    target1: row.target1,
    target2: row.target2,
    conditionsMet: row.conditionsMet,
    conditionsTotal: row.conditionsTotal,
    unmetConditions: row.conditions.filter((condition) => !condition.met).slice(0, 4).map((condition) => condition.label),
    rejectionCode: row.rejectionCode,
    rejectionReason: row.rejectionReason,
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
  };
}

function mapExecution(row: ReadOnlyLiveDecision) {
  return {
    id: row.id,
    strategyType: row.strategyType,
    horizon: strategyToHorizon(row.strategyType),
    symbol: row.symbol,
    status: row.status,
    direction: row.direction,
    confidence: row.confidence,
    entryPrice: row.entryPrice,
    stopLoss: row.stopLoss,
    target1: row.target1,
    target2: row.target2,
    quantity: row.quantity,
    riskAmountUsdt: row.riskAmountUsdt,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    realizedPnlUsdt: row.realizedPnlUsdt,
    rejectionReason: row.rejectionReason,
    updatedAt: row.updatedAt,
  };
}

function decisionRewardRisk(row: ReadOnlyLiveDecision): number {
  if (row.entryPrice == null || row.stopLoss == null || row.target2 == null) return 0;
  const risk = Math.abs(row.entryPrice - row.stopLoss);
  if (!Number.isFinite(risk) || risk <= 0) return 0;
  return Math.abs(row.target2 - row.entryPrice) / risk;
}

function scanFreshness(lastScanAt: string | null, now = Date.now()) {
  if (!lastScanAt) return { fresh: false, ageSeconds: null as number | null };
  const parsed = Date.parse(lastScanAt);
  if (!Number.isFinite(parsed)) return { fresh: false, ageSeconds: null as number | null };
  const ageSeconds = Math.max(0, Math.round((now - parsed) / 1000));
  return { fresh: ageSeconds <= 300, ageSeconds };
}

function summarizeNoOrderDiagnosis(input: {
  migrationRequired: boolean;
  strategyDatabaseReady: boolean;
  lastScanAt: string | null;
  gateAllowed: boolean;
  gateReasons: string[];
  bitgetConfigured: boolean;
  bitgetExecutionAllowed: boolean;
  bitgetMode: string;
  exchangeSnapshotAvailable: boolean;
  riskBlocked: boolean;
  riskBlockReason?: string;
  positionsCount: number;
  plansCount: number;
  readyToday: number;
  orderAttemptsToday: number;
  openedToday: number;
  recentErrors: string[];
}) {
  const reasons: string[] = [];
  const freshness = scanFreshness(input.lastScanAt);

  if (input.migrationRequired) reasons.push("Unified Live 数据库迁移未完成，实盘账户和托管记录不可用。");
  if (!input.strategyDatabaseReady) reasons.push("三周期策略决策表尚未就绪，策略扫描记录无法落库。");
  if (!input.lastScanAt) reasons.push("短/中/长三周期尚未留下任何扫描时间，自动 runner 可能没有启动。");
  else if (!freshness.fresh) reasons.push(`最近一次策略扫描距今约${freshness.ageSeconds ?? "?"}秒，超过5分钟；每分钟 Cron 可能未运行或被部署平台拦截。`);

  if (input.bitgetMode !== "LIVE_EXPERIMENT") reasons.push(`Bitget 当前模式为 ${input.bitgetMode || "未识别"}，不是 LIVE_EXPERIMENT。`);
  if (!input.bitgetConfigured) reasons.push("Bitget 实盘 API 配置未完整就绪。");
  if (!input.bitgetExecutionAllowed) reasons.push("Bitget 真实执行尚未授权，或真实亏损确认变量无效。");
  if (!input.gateAllowed) reasons.push(...input.gateReasons.map((reason) => `Unified Live 新开仓闸门：${reason}`));
  if (!input.exchangeSnapshotAvailable && input.bitgetConfigured) reasons.push("当前无法读取 Bitget 权威持仓快照；系统会 fail-closed 停止新开仓。");
  if (input.riskBlocked) reasons.push(`风险引擎正在阻断新仓：${input.riskBlockReason || "RISK_BLOCKED"}`);

  if (input.positionsCount === 0 && input.orderAttemptsToday === 0 && input.readyToday === 0 && input.plansCount > 0) {
    reasons.push("系统有观察计划，但今天尚无计划同时满足方向、结构、5分钟触发和风险条件，因此没有发起真实订单。");
  }
  if (input.positionsCount === 0 && input.readyToday > 0 && input.orderAttemptsToday === 0) {
    reasons.push("今天出现过可执行候选，但下单尝试仍为0；优先检查实盘总闸门、Cron runner 和 active-execution 开关。");
  }
  if (input.positionsCount === 0 && input.orderAttemptsToday > 0 && input.openedToday === 0) {
    reasons.push("今天已经尝试下单但没有形成持仓；请看最近执行错误/拒绝原因和 Bitget 订单状态。");
  }
  for (const error of input.recentErrors.slice(0, 3)) reasons.push(`最近执行异常：${error}`);

  if (!reasons.length && input.positionsCount === 0) reasons.push("链路和实盘闸门均正常，目前只是没有策略触发到真实开仓条件。");
  return { reasons, runnerFresh: freshness.fresh, lastScanAgeSeconds: freshness.ageSeconds };
}

async function buildLiveTradingStatus(request: NextRequest) {
  const now = new Date();
  const actor = await resolveUnifiedLiveActor(request);
  if (!actor) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const officialControl = await isUnifiedLiveAdmin(actor);
  if (!officialControl && actor.raw.isActiveMember !== true) {
    return NextResponse.json({ error: "ACTIVE_MEMBERSHIP_REQUIRED" }, { status: 403 });
  }
  const ownerKey = officialControl ? "official" : `member:${actor.id}`;
  const accountScope = officialControl ? "OFFICIAL" : "MEMBER";

  // Status pages are strictly read-only. Account creation, schema creation, strategy seeding,
  // custody reconciliation and gate mutations belong to POST/admin or the minute runner.
  const result = await getUnifiedLiveAccount(ownerKey);
  const officialStored = officialControl
    ? result
    : await getUnifiedLiveAccount("official").catch(() => ({ migrationRequired: true, account: null }));

  const runtimeConfig = readUnifiedLiveRuntimeConfig();
  const bitget = getBitgetDemoEnvironment();
  const readOnly = await getReadOnlyLiveStatusSnapshot();
  const strategyDashboard = readOnly.strategy;
  const bitgetRuntime = readOnly.runtime;
  const gateReasons: string[] = [];
  if (officialStored.migrationRequired) gateReasons.push("UNIFIED_LIVE_MIGRATION_REQUIRED");
  if (!officialStored.account) gateReasons.push("UNIFIED_LIVE_ACCOUNT_UNAVAILABLE");
  if (runtimeConfig.mode !== "LIVE") gateReasons.push(`RUNTIME_MODE_${runtimeConfig.mode}`);
  if (!runtimeConfig.allowNewEntriesByEnv) gateReasons.push("ENV_NEW_ENTRIES_DISABLED");
  if (!officialStored.account?.newEntriesEnabled) gateReasons.push("ACCOUNT_NEW_ENTRIES_DISABLED");
  if (!officialStored.account?.positionManagementEnabled) gateReasons.push("POSITION_MANAGEMENT_DISABLED");
  const stalePending = (officialStored.account?.slices ?? []).some((slice) =>
    String(slice.status) === "PENDING" && Date.now() - new Date(slice.openedAt).getTime() > 2 * 60_000
  );
  if (stalePending) gateReasons.push("CUSTODY_STALE_PENDING_PRESENT");
  // This GET intentionally does not run the mutating custody cycle or fetch protection orders.
  // Therefore it must not present its preliminary gate as the authoritative enablement verdict.
  // The admin POST/runner performs the complete custody audit before any mode change or order.
  gateReasons.push("READ_ONLY_CUSTODY_AUDIT_NOT_AUTHORITATIVE");
  const baseNewEntryGate = {
    allowed: gateReasons.length === 0,
    reasons: gateReasons,
    mode: officialStored.account?.mode ?? runtimeConfig.mode,
    positionManagementContinues: runtimeConfig.positionManagementEnabled,
    readOnly: true,
  };
  const strategyActiveExecutionEnabled = isUnifiedLiveActiveExecutionEnabled();
  const newEntryGate = strategyActiveExecutionEnabled
    ? baseNewEntryGate
    : { ...baseNewEntryGate, allowed: false, reasons: [...baseNewEntryGate.reasons, "LEGACY_STRATEGY_EXECUTION_DISABLED"] };

  // The minute runner already persists an account snapshot. Use that immediately so the page can
  // establish readiness without waiting on a fresh exchange round-trip. A best-effort live snapshot
  // is still attempted below, but it is capped so it can never stall the whole status response.
  const cachedCheckedAt = typeof bitgetRuntime?.account?.checkedAt === "string" ? bitgetRuntime.account.checkedAt : null;
  const cachedExchangeReady = bitgetRuntime?.account?.connected === true
    && isFreshIso(cachedCheckedAt, 300);
  let exchangeSnapshotAvailable = cachedExchangeReady;
  let bitgetReadOnlyAttempted = cachedExchangeReady;
  let bitgetReadOnlyOk = cachedExchangeReady;
  let freshPositionsReadOk = false;
  let authoritativePositions: Array<Record<string, unknown>> = [];
  let recentClosedPositions: Array<Record<string, unknown>> = [];

  if (officialControl && bitget.configured) {
    bitgetReadOnlyAttempted = true;
    try {
      const snapshot = await withTimeout(Promise.all([
        getBitgetDemoCurrentPositions(),
        getBitgetDemoClosedPositions(20),
      ]), 4_500);
      if (snapshot) {
        const [positions, closed] = snapshot;
        freshPositionsReadOk = true;
        exchangeSnapshotAvailable = true;
        bitgetReadOnlyOk = true;
        const slices = officialStored.account?.slices ?? [];
        authoritativePositions = positions.map((position) => {
        const slice = slices.find((row) =>
          ACTIVE_SLICE_STATUSES.has(String(row.status))
          && String(row.symbol).toUpperCase() === position.symbol
          && String(row.side).toUpperCase() === (position.posSide === "short" ? "SHORT" : "LONG"));
        return {
          source: "BITGET_UTA",
          id: slice?.id ?? `${position.symbol}:${position.posSide}`,
          symbol: position.symbol,
          horizon: slice?.horizon ?? null,
          side: position.posSide === "short" ? "SHORT" : "LONG",
          status: slice?.status ?? "EXCHANGE_OPEN",
          quantity: position.total,
          leverage: position.leverage,
          marginMode: position.marginMode,
          entryPrice: position.avgPrice,
          markPrice: position.markPrice,
          unrealizedPnlUsdt: position.unrealisedPnl,
          profitRate: position.profitRate,
          stopPrice: slice?.stopPrice ?? null,
          target1: slice?.target1 ?? null,
          target2: slice?.target2 ?? null,
          openedAt: slice?.openedAt ?? position.createdAt,
          lastManagedAt: slice?.lastManagedAt ?? null,
        };
      });
        recentClosedPositions = closed.slice(0, 12).map((row) => ({
          positionId: row.positionId,
          symbol: row.symbol,
          side: row.posSide === "short" ? "SHORT" : "LONG",
          openPrice: row.openPriceAvg,
          closePrice: row.closePriceAvg,
          quantity: row.closeTotalPos || row.openTotalPos,
          netProfitUsdt: row.netProfit,
          realizedPnlUsdt: row.cumRealisedPnl,
          openedAt: row.createdAt,
          closedAt: row.updatedAt,
        }));
      }
    } catch {
      // Preserve the cached cron snapshot. A temporary Bitget read timeout must not make the
      // whole member status request fail or incorrectly erase a recent successful health check.
    }
  }

  // A successful exchange response with positions=[] is authoritative empty custody. Never
  // resurrect stale database slices merely because the confirmed exchange array is empty.
  if (!freshPositionsReadOk) {
    authoritativePositions = (officialStored.account?.slices ?? [])
      .filter((slice) => ["OPEN", "PARTIALLY_CLOSED"].includes(String(slice.status)))
      .slice(0, 20)
      .map((slice) => ({
        source: "MOOX_CUSTODY",
        id: slice.id,
        symbol: slice.symbol,
        horizon: slice.horizon,
        side: slice.side,
        status: slice.status,
        quantity: slice.quantity,
        leverage: slice.leverage,
        entryPrice: slice.entryPrice,
        markPrice: null,
        unrealizedPnlUsdt: null,
        profitRate: null,
        stopPrice: slice.stopPrice,
        target1: slice.target1,
        target2: slice.target2,
        openedAt: slice.openedAt,
        lastManagedAt: slice.lastManagedAt,
      }));
  }

  const allDecisions = strategyDashboard?.latestDecisions ?? [];
  const todayKey = getChinaDateKey(now);
  const dailyChampions = rankDailyChampionBoard(
    allDecisions
      .filter((row) => row.strategyType === "INTRADAY" && getChinaDateKey(new Date(row.updatedAt)) === todayKey)
      .map((row) => ({
        id: row.id,
        symbol: row.symbol,
        direction: row.direction,
        status: row.status,
        rejectionCode: row.rejectionCode,
        confidence: row.confidence,
        technicalScore: row.technicalScore,
        forecastScore: row.forecastScore,
        conditionsMet: row.conditionsMet,
        conditionsTotal: row.conditionsTotal,
        entryTriggered: row.conditions.some((condition) => condition.key === "entry" && condition.met),
        rewardRisk: decisionRewardRisk(row),
        marketSessionAllowed: evaluateMarketSessionExposureSafety({
          symbol: row.symbol,
          action: "DAILY_MINIMUM_ENTRY",
          nowMs: now.getTime(),
        }).allowed,
        focusPriority: aiTradingFocusPriority(row.symbol, now),
        currentPrice: row.currentPrice,
        entryPrice: row.entryPrice,
        stopLoss: row.stopLoss,
        target1: row.target1,
        target2: row.target2,
        rejectionReason: row.rejectionReason,
        updatedAt: row.updatedAt,
      })),
    3,
  );
  const plans = latestUnique(
    allDecisions.filter((row) => row.direction !== "NEUTRAL" && PLAN_STATUSES.has(row.status)),
    12,
  ).map(mapPlan);
  const recentExecutions = allDecisions.filter((row) => EXECUTION_STATUSES.has(row.status)).slice(0, 20).map(mapExecution);

  const lastScanAt = strategyDashboard?.profiles
    .map((profile) => profile.lastScanAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  const totals = (strategyDashboard?.stats ?? []).reduce((acc, row) => ({
    readyToday: acc.readyToday + row.readyToday,
    orderAttemptsToday: acc.orderAttemptsToday + row.orderAttemptsToday,
    openedToday: acc.openedToday + row.openedToday,
    scansToday: acc.scansToday + row.scansToday,
  }), { readyToday: 0, orderAttemptsToday: 0, openedToday: 0, scansToday: 0 });
  const recentErrors = allDecisions
    .filter((row) => row.status === "ERROR" || (row.rejectionReason && /error|fail|失败|拒绝/i.test(row.rejectionReason)))
    .slice(0, 5)
    .map((row) => `${row.symbol} ${row.rejectionReason || row.status}`);
  const diagnosis = summarizeNoOrderDiagnosis({
    migrationRequired: Boolean(officialStored.migrationRequired),
    strategyDatabaseReady: strategyDashboard?.databaseReady === true,
    lastScanAt,
    gateAllowed: newEntryGate.allowed === true,
    gateReasons: newEntryGate.reasons ?? [],
    bitgetConfigured: bitget.configured,
    bitgetExecutionAllowed: bitget.executionAllowed,
    bitgetMode: bitget.mode,
    exchangeSnapshotAvailable,
    riskBlocked: bitgetRuntime?.paused === true,
    riskBlockReason: bitgetRuntime?.pauseReason,
    positionsCount: authoritativePositions.length,
    plansCount: plans.length,
    readyToday: totals.readyToday,
    orderAttemptsToday: totals.orderAttemptsToday,
    openedToday: totals.openedToday,
    recentErrors,
  });
  if (bitgetRuntime) {
    if (bitgetRuntime.paused) diagnosis.reasons.unshift(`Bitget服务器执行已暂停：${bitgetRuntime.pauseReason || "PAUSED"}`);
    if (!bitgetRuntime.cronSecretConfigured) diagnosis.reasons.unshift("CRON_SECRET未配置，生产定时任务无法通过鉴权。");
    if (bitgetRuntime.heartbeatAgeSeconds == null) diagnosis.reasons.unshift("Bitget服务器运行时尚无心跳记录。");
    else if (bitgetRuntime.heartbeatAgeSeconds > 180) diagnosis.reasons.unshift(`Bitget服务器心跳距今${bitgetRuntime.heartbeatAgeSeconds}秒，超过3分钟。`);
    if (bitgetRuntime.lastError) diagnosis.reasons.push(`Bitget运行时最近错误：${bitgetRuntime.lastError}`);
  }

  const state = authoritativePositions.length
    ? "LIVE_POSITION_OPEN"
    : newEntryGate.allowed && diagnosis.runnerFresh && bitget.executionAllowed && strategyDashboard?.databaseReady
      ? "READY_WAITING_TRIGGER"
      : "BLOCKED";

  const envChecks = [
    { name: "MOOX_TRADING_CONTROL_MODE", ok: runtimeConfig.controlSource === "MOOX_TRADING_CONTROL_MODE" && runtimeConfig.mode === "LIVE", expected: "LIVE", secret: false },
    { name: "BITGET_LIVE_API_KEY", ok: Boolean(process.env.BITGET_LIVE_API_KEY?.trim()), expected: "已配置", secret: true },
    { name: "BITGET_LIVE_SECRET_KEY", ok: Boolean(process.env.BITGET_LIVE_SECRET_KEY?.trim()), expected: "已配置", secret: true },
    { name: "BITGET_LIVE_PASSPHRASE", ok: Boolean(process.env.BITGET_LIVE_PASSPHRASE?.trim()), expected: "已配置", secret: true },
    { name: "BITGET_LIVE_CONFIRMATION", ok: bitget.liveConfirmationAccepted, expected: "I_ACCEPT_REAL_LOSS", secret: false },
    { name: "BITGET_LIVE_INITIAL_CAPITAL_USDT", ok: Math.abs(bitget.liveInitialCapitalUsdt - 1000) < 0.01, expected: "1000", secret: false },
    { name: "CRON_SECRET", ok: bitgetRuntime?.cronSecretConfigured === true || Boolean(process.env.CRON_SECRET?.trim()), expected: "已配置", secret: true },
  ];
  const environmentReady = envChecks.every((item) => item.ok);
  const databaseReady = !officialStored.migrationRequired;
  const strategyDatabaseReady = strategyDashboard?.databaseReady === true;
  const exchangeReadOnlyReady = bitget.configured && bitgetReadOnlyOk;
  const cronReady = Boolean(bitgetRuntime?.cronSecretConfigured)
    && bitgetRuntime?.heartbeatAgeSeconds != null
    && bitgetRuntime.heartbeatAgeSeconds <= 180
    && !bitgetRuntime.paused;
  // Protection/orphan/duplicate/time-exit custody evidence is deliberately not collected in this
  // read-only endpoint. Keep switch readiness fail-closed; the admin mutation endpoint owns the
  // authoritative custody preflight.
  const custodyReady = false;
  const eligibleForServerPreflight = databaseReady
    && strategyDatabaseReady
    && environmentReady
    && exchangeReadOnlyReady
    && cronReady;
  // Compatibility field: "ready" means the administrator may submit the server-side preflight;
  // it never means this read-only GET has approved custody or permissioned an order.
  const readyForAccountSwitch = eligibleForServerPreflight;
  const accountLiveEnabled = result.account?.mode === "LIVE" && result.account?.newEntriesEnabled === true;
  const liveConfigured = accountLiveEnabled && eligibleForServerPreflight;

  const activation = {
    version: "7.20.10.8",
    targetMigration: "20260818143000_moox_unified_live_v72031",
    databaseReady,
    strategyDatabaseReady,
    environmentReady,
    exchangeReadOnlyAttempted: bitgetReadOnlyAttempted,
    exchangeReadOnlyReady,
    cronReady,
    custodyReady,
    custodyAuditAuthoritative: false,
    eligibleForServerPreflight,
    readyForAccountSwitch,
    accountLiveEnabled,
    liveConfigured,
    fullyLive: false,
    missingEnv: envChecks.filter((item) => !item.ok).map((item) => item.name),
    envChecks,
  };

  const officialFeed = {
    state,
    generatedAt: new Date().toISOString(),
    lastScanAt,
    runnerFresh: diagnosis.runnerFresh,
    lastScanAgeSeconds: diagnosis.lastScanAgeSeconds,
    runtimeHeartbeat: bitgetRuntime ? {
      serverHealthy: bitgetRuntime.serverHealthy,
      paused: bitgetRuntime.paused,
      pauseReason: bitgetRuntime.pauseReason,
      cronSecretConfigured: bitgetRuntime.cronSecretConfigured,
      lastHeartbeatAt: bitgetRuntime.lastHeartbeatAt,
      heartbeatAgeSeconds: bitgetRuntime.heartbeatAgeSeconds,
      lastStrategyAt: bitgetRuntime.lastStrategyAt,
      lastOrderAttemptAt: bitgetRuntime.lastOrderAttemptAt,
      lastOrderSuccessAt: bitgetRuntime.lastOrderSuccessAt,
      lastError: bitgetRuntime.lastError,
    } : null,
    exchangeSnapshotAvailable,
    positions: authoritativePositions,
    recentClosedPositions: officialControl ? recentClosedPositions : [],
    plans,
    dailyChampions,
    recentExecutions,
    diagnosis: diagnosis.reasons,
    today: totals,
  };

  if (!officialControl) {
    return NextResponse.json({
      migrationRequired: result.migrationRequired,
      account: result.account,
      scope: accountScope,
      officialControl: false,
      localAgentRequired: true,
      officialFeed,
      activation,
    });
  }

  return NextResponse.json({
    migrationRequired: result.migrationRequired,
    account: result.account,
    scope: "OFFICIAL",
    officialControl: true,
    experimentCapitalUsdt: 1000,
    runtimeConfig,
    newEntryGate,
    activation,
    bitgetReadiness: {
      mode: bitget.mode,
      configured: bitget.configured,
      executionAllowed: bitget.executionAllowed,
      liveConfirmationAccepted: bitget.liveConfirmationAccepted,
      initialCapitalUsdt: bitget.liveInitialCapitalUsdt,
      maxPositionNotionalUsdt: bitget.liveMaxPositionNotionalUsdt,
      maxConcurrentPositions: bitget.liveMaxConcurrentPositions,
      maxTradesPerDay: bitget.liveMaxTradesPerDay,
      strategyActiveExecutionEnabled,
    },
    officialFeed,
    strategyDiagnostics: strategyDashboard ? {
      generatedAt: new Date().toISOString(),
      databaseReady: strategyDashboard.databaseReady,
      executionEnvironmentAllowed: bitget.executionAllowed && strategyActiveExecutionEnabled,
      risk: {
        blocked: bitgetRuntime?.paused === true,
        blockReason: bitgetRuntime?.pauseReason || "",
        dailyLossPct: undefined,
        weeklyLossPct: undefined,
        openRiskPct: undefined,
        availableUsdt: typeof bitgetRuntime?.account?.availableUsdt === "number" ? bitgetRuntime.account.availableUsdt : null,
      },
      horizons: strategyDashboard.profiles.map((profile) => {
        const stats = strategyDashboard.stats.find((row) => row.strategyType === profile.strategyType);
        const recent = strategyDashboard.latestDecisions
          .filter((row) => row.strategyType === profile.strategyType)
          .slice(0, 4)
          .map((row) => ({
            symbol: row.symbol,
            status: row.status,
            direction: row.direction,
            rejectionReason: row.rejectionReason,
            updatedAt: row.updatedAt,
          }));
        return {
          strategyType: profile.strategyType,
          label: profile.label,
          lastScanAt: profile.lastScanAt,
          stats: stats ? {
            scansToday: stats.scansToday,
            symbolsEvaluatedToday: stats.symbolsEvaluatedToday,
            readyToday: stats.readyToday,
            blockedToday: stats.blockedToday,
            orderAttemptsToday: stats.orderAttemptsToday,
            openedToday: stats.openedToday,
          } : null,
          recent,
        };
      }),
    } : null,
  });
}

export async function GET(request: NextRequest) {
  // This is an observability endpoint, not an execution endpoint. A slow database,
  // exchange or runtime diagnostic must never leave the member page spinning forever.
  // The underlying trading engine remains fail-closed and is not changed here.
  const bounded = await withTimeout(buildLiveTradingStatus(request), LIVE_STATUS_DEADLINE_MS);
  if (bounded) return bounded;
  return NextResponse.json({
    error: "LIVE_STATUS_TIMEOUT",
    message: "AI交易状态读取超时；当前状态未知，不能视为无阻断。",
    retryable: true,
    generatedAt: new Date().toISOString(),
  }, { status: 503, headers: { "cache-control": "no-store" } });
}
