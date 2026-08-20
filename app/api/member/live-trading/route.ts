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
import { readUnifiedLiveRuntimeConfig } from "@/lib/trading-signals/unified-live-config";
import {
  ensureUnifiedLiveAccount,
  getUnifiedLiveAccount,
} from "@/lib/trading-signals/unified-live-store";
import { runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";
import { getThreeHorizonStrategyDashboard } from "@/lib/trading-signals/three-horizon-strategy";
import type { ThreeHorizonStrategyDecision } from "@/types/three-horizon-strategy";
import { getBitgetRuntimeState } from "@/lib/bitget/demo-runtime";

// MOOX_V720105_LIVE_VISIBILITY: authoritative positions + plans + no-order diagnosis for the member live page.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIVE_SLICE_STATUSES = new Set(["PENDING", "OPEN", "PARTIALLY_CLOSED", "ORPHAN_PENDING_CLAIM"]);
const PLAN_STATUSES = new Set(["OBSERVING", "READY", "SHADOW_READY", "BLOCKED"]);
const EXECUTION_STATUSES = new Set(["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSED", "ERROR"]);

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
  if (!ensured.ok) {
    return NextResponse.json({
      migrationRequired: true,
      account: null,
      scope: accountScope,
      officialControl,
      officialFeed: {
        state: "BLOCKED",
        positions: [],
        plans: [],
        recentExecutions: [],
        diagnosis: ["Unified Live 数据库迁移未完成。"],
      },
    });
  }

  const custody = officialControl
    ? await runUnifiedLiveCustodyCycle({ trigger: "OFFICIAL_MEMBER_STATUS", ownerKey: "official" }).catch(() => null)
    : null;
  const result = await getUnifiedLiveAccount(ownerKey);
  const officialStored = officialControl ? result : await getUnifiedLiveAccount("official");

  const runtimeConfig = readUnifiedLiveRuntimeConfig();
  const bitget = getBitgetDemoEnvironment();
  const [strategyDashboard, bitgetRuntime] = await Promise.all([
    getThreeHorizonStrategyDashboard().catch(() => null),
    getBitgetRuntimeState().catch(() => null),
  ]);
  const strategyActiveExecutionEnabled = process.env.MOOX_LIVE_ACTIVE_EXECUTION_V641?.toLowerCase() !== "false";
  const baseNewEntryGate = await evaluateUnifiedLiveNewEntryGate("official").catch((error) => ({
    allowed: false,
    reasons: [error instanceof Error ? error.message : "UNIFIED_LIVE_GATE_UNAVAILABLE"],
    mode: "MANAGE_ONLY" as const,
    positionManagementContinues: true,
  }));
  const newEntryGate = strategyActiveExecutionEnabled
    ? baseNewEntryGate
    : { ...baseNewEntryGate, allowed: false, reasons: [...baseNewEntryGate.reasons, "LEGACY_STRATEGY_EXECUTION_DISABLED"] };

  let exchangeSnapshotAvailable = Boolean(custody?.audit?.snapshotAvailable);
  let authoritativePositions: Array<Record<string, unknown>> = [];
  let recentClosedPositions: Array<Record<string, unknown>> = [];

  if (officialControl && bitget.configured) {
    try {
      const [positions, closed] = await Promise.all([
        getBitgetDemoCurrentPositions(),
        getBitgetDemoClosedPositions(20),
      ]);
      exchangeSnapshotAvailable = true;
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
    } catch {
      exchangeSnapshotAvailable = false;
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
