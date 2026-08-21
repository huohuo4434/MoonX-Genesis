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
import { evaluateUnifiedLiveNewEntryGate } from "@/lib/trading-signals/unified-live-entry-gate";
import {
  isUnifiedLiveActiveExecutionEnabled,
  readUnifiedLiveRuntimeConfig,
} from "@/lib/trading-signals/unified-live-config";
import {
  ensureUnifiedLiveAccount,
  getUnifiedLiveAccount,
} from "@/lib/trading-signals/unified-live-store";
import { getThreeHorizonStrategyDashboard } from "@/lib/trading-signals/three-horizon-strategy";
import type { ThreeHorizonStrategyDecision } from "@/types/three-horizon-strategy";
import { getBitgetRuntimeState } from "@/lib/bitget/demo-runtime";

// MOOX_V720105_LIVE_VISIBILITY: authoritative positions + plans + no-order diagnosis for the member live page.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function mapPlan(row: ThreeHorizonStrategyDecision) {
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

function mapExecution(row: ThreeHorizonStrategyDecision) {
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

export async function GET(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  if (!actor) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const officialControl = await isUnifiedLiveAdmin(actor);
  const ownerKey = officialControl ? "official" : `member:${actor.id}`;
  const accountScope = officialControl ? "OFFICIAL" : "MEMBER";
  const ensured = await ensureUnifiedLiveAccount({
    ownerKey,
    accountScope,
    displayName: officialControl ? "MOOX Official 1000U" : actor.email,
  });
  const migrationRequired = !ensured.ok;

  // Status pages are read-only. Custody/reconciliation belongs to the minute runner;
  // running it inside a member GET made the UI exceed its 10s timeout and hid admin controls.
  const result = migrationRequired
    ? { migrationRequired: true, account: null }
    : await getUnifiedLiveAccount(ownerKey);
  const officialStored = officialControl
    ? result
    : await getUnifiedLiveAccount("official").catch(() => ({ migrationRequired: true, account: null }));

  const runtimeConfig = readUnifiedLiveRuntimeConfig();
  const bitget = getBitgetDemoEnvironment();
  const [strategyDashboard, bitgetRuntime, baseNewEntryGate] = await Promise.all([
    getThreeHorizonStrategyDashboard().catch(() => null),
    getBitgetRuntimeState().catch(() => null),
    evaluateUnifiedLiveNewEntryGate("official").catch((error) => ({
      allowed: false,
      reasons: [error instanceof Error ? error.message : "UNIFIED_LIVE_GATE_UNAVAILABLE"],
      mode: "MANAGE_ONLY" as const,
      positionManagementContinues: true,
    })),
  ]);
  const strategyActiveExecutionEnabled = isUnifiedLiveActiveExecutionEnabled();
  const newEntryGate = strategyActiveExecutionEnabled
    ? baseNewEntryGate
    : { ...baseNewEntryGate, allowed: false, reasons: [...baseNewEntryGate.reasons, "LEGACY_STRATEGY_EXECUTION_DISABLED"] };

  // The minute runner already persists an account snapshot. Use that immediately so the page can
  // establish readiness without waiting on a fresh exchange round-trip. A best-effort live snapshot
  // is still attempted below, but it is capped so it can never stall the whole status response.
  const cachedExchangeReady = bitgetRuntime?.account?.connected === true
    && isFreshIso(bitgetRuntime.account.checkedAt, 300);
  let exchangeSnapshotAvailable = cachedExchangeReady;
  let bitgetReadOnlyAttempted = cachedExchangeReady;
  let bitgetReadOnlyOk = cachedExchangeReady;
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

  if (!authoritativePositions.length) {
    authoritativePositions = (officialStored.account?.slices ?? [])
      .filter((slice) => ACTIVE_SLICE_STATUSES.has(String(slice.status)))
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
    riskBlocked: strategyDashboard?.risk.blocked === true,
    riskBlockReason: strategyDashboard?.risk.blockReason,
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
  const custodyReady = databaseReady && !(newEntryGate.reasons ?? []).includes("CUSTODY_BLOCKER_PRESENT");
  const readyForAccountSwitch = databaseReady
    && strategyDatabaseReady
    && environmentReady
    && exchangeReadOnlyReady
    && cronReady
    && custodyReady;
  const accountLiveEnabled = result.account?.mode === "LIVE" && result.account?.newEntriesEnabled === true;

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
    readyForAccountSwitch,
    accountLiveEnabled,
    fullyLive: readyForAccountSwitch && accountLiveEnabled && newEntryGate.allowed === true,
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
      generatedAt: strategyDashboard.generatedAt,
      databaseReady: strategyDashboard.databaseReady,
      executionEnvironmentAllowed: strategyDashboard.executionEnvironmentAllowed,
      risk: {
        blocked: strategyDashboard.risk.blocked,
        blockReason: strategyDashboard.risk.blockReason,
        dailyLossPct: strategyDashboard.risk.dailyLossPct,
        weeklyLossPct: strategyDashboard.risk.weeklyLossPct,
        openRiskPct: strategyDashboard.risk.openRiskPct,
        availableUsdt: strategyDashboard.risk.availableUsdt,
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
