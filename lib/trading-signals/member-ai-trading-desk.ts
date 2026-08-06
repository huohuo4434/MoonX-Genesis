import "server-only";

import {
  getBitgetDemoClosedPositions,
  getBitgetDemoCurrentPositions,
  getBitgetDemoPendingStrategyOrders,
  getBitgetDemoEnvironment,
  type BitgetDemoClosedPosition,
  type BitgetDemoPosition,
  type BitgetDemoStrategyOrder,
} from "@/lib/bitget/demo-client";
import { getBitgetRuntimeState } from "@/lib/bitget/demo-runtime";
import { prisma } from "@/lib/prisma";
import {
  ensurePredictionAutoTraderTables,
  getPredictionAutoTraderDashboard,
} from "@/lib/trading-signals/prediction-auto-trader";
import { getThreeHorizonPublicStrategies } from "@/lib/trading-signals/three-horizon-strategy";
import { getAiTradePlanDashboard } from "@/lib/trading-signals/ai-trade-plans";
import { applyAiDeskOperationalState, sanitizePlanHorizonText } from "@/lib/trading-signals/ai-desk-status";
import type {
  AiTradingDeskPlan,
  AiTradingDeskPlanStatus,
  AiTradingDeskPosition,
  AiTradingDeskSettings,
  AiTradingDeskSnapshot,
  AiTradingDeskStats,
  AiTradingDeskTrade,
} from "@/types/ai-trading-desk";
import type {
  PredictionAutoRunLog,
  PredictionStrategyPlan,
} from "@/types/prediction-auto-trader";

type DbDeskSettings = {
  enabled: boolean;
  show_current_positions: boolean;
  show_trade_history: boolean;
  show_absolute_pnl: boolean;
  history_limit: number;
  updated_at: Date | string;
};

type DbDeskSnapshot = {
  payload: AiTradingDeskSnapshot | string;
  last_synced_at: Date | string | null;
  last_error: string | null;
};


const DEFAULT_SETTINGS: AiTradingDeskSettings = {
  enabled: true,
  showCurrentPositions: true,
  showTradeHistory: true,
  showAbsolutePnl: false,
  historyLimit: 20,
  updatedAt: new Date(0).toISOString(),
};

let ensured = false;
const MEMBER_DESK_READ_TIMEOUT_MS = 2_500;
let lastReadableSnapshot: AiTradingDeskSnapshot | null = null;

async function withReadTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}读取超时`)), MEMBER_DESK_READ_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function iso(value: Date | string | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function parseJson<T>(value: T | string): T {
  if (typeof value !== "string") return value;
  return JSON.parse(value) as T;
}

function mapSettings(row?: DbDeskSettings): AiTradingDeskSettings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    enabled: Boolean(row.enabled),
    showCurrentPositions: Boolean(row.show_current_positions),
    showTradeHistory: Boolean(row.show_trade_history),
    showAbsolutePnl: Boolean(row.show_absolute_pnl),
    historyLimit: Math.max(5, Math.min(100, Number(row.history_limit || 20))),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

export async function ensureMemberAiTradingDeskTables(): Promise<boolean> {
  if (!(await ensurePredictionAutoTraderTables()) || !prisma) return false;
  if (ensured) return true;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_member_ai_desk_settings (
        id TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        show_current_positions BOOLEAN NOT NULL DEFAULT TRUE,
        show_trade_history BOOLEAN NOT NULL DEFAULT TRUE,
        show_absolute_pnl BOOLEAN NOT NULL DEFAULT FALSE,
        history_limit INTEGER NOT NULL DEFAULT 20,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO trade_member_ai_desk_settings (id)
      VALUES ('default')
      ON CONFLICT (id) DO NOTHING
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_member_ai_desk_snapshot (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_synced_at TIMESTAMPTZ,
        last_error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO trade_member_ai_desk_snapshot (id)
      VALUES ('default')
      ON CONFLICT (id) DO NOTHING
    `);
    ensured = true;
    return true;
  } catch (error) {
    console.error("member AI trading desk tables unavailable", error);
    return false;
  }
}

export async function getMemberAiTradingDeskSettings(): Promise<AiTradingDeskSettings> {
  if (!prisma) return { ...DEFAULT_SETTINGS };
  try {
    const rows = await withReadTimeout(
      prisma.$queryRawUnsafe<DbDeskSettings[]>(`
        SELECT enabled, show_current_positions, show_trade_history,
               show_absolute_pnl, history_limit, updated_at
        FROM trade_member_ai_desk_settings
        WHERE id = 'default'
        LIMIT 1
      `),
      "交易台设置"
    );
    return mapSettings(rows[0]);
  } catch (error) {
    console.warn("member AI trading desk settings read failed", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateMemberAiTradingDeskSettings(
  patch: Partial<Pick<
    AiTradingDeskSettings,
    | "enabled"
    | "showCurrentPositions"
    | "showTradeHistory"
    | "showAbsolutePnl"
    | "historyLimit"
  >>
): Promise<AiTradingDeskSettings> {
  if (!(await ensureMemberAiTradingDeskTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }
  const current = await getMemberAiTradingDeskSettings();
  const next = {
    enabled: patch.enabled ?? current.enabled,
    showCurrentPositions: patch.showCurrentPositions ?? current.showCurrentPositions,
    showTradeHistory: patch.showTradeHistory ?? current.showTradeHistory,
    showAbsolutePnl: patch.showAbsolutePnl ?? current.showAbsolutePnl,
    historyLimit: Math.max(5, Math.min(100, Math.floor(patch.historyLimit ?? current.historyLimit))),
  };
  await prisma.$executeRaw`
    UPDATE trade_member_ai_desk_settings SET
      enabled = ${next.enabled},
      show_current_positions = ${next.showCurrentPositions},
      show_trade_history = ${next.showTradeHistory},
      show_absolute_pnl = ${next.showAbsolutePnl},
      history_limit = ${next.historyLimit},
      updated_at = NOW()
    WHERE id = 'default'
  `;
  return getMemberAiTradingDeskSettings();
}

function latestRunsBySymbol(runs: PredictionAutoRunLog[]): Map<string, PredictionAutoRunLog> {
  const result = new Map<string, PredictionAutoRunLog>();
  for (const run of runs) {
    const key = run.symbol.toUpperCase();
    if (!result.has(key)) result.set(key, run);
  }
  return result;
}

function marketFromRun(run: PredictionAutoRunLog | undefined): {
  currentPrice: number | null;
  capturedAt: string | null;
} {
  const payload = run?.payload;
  if (!payload || typeof payload !== "object") {
    return { currentPrice: run?.price ?? null, capturedAt: run?.createdAt ?? null };
  }
  const market = (payload as { market?: unknown }).market;
  if (!market || typeof market !== "object") {
    return { currentPrice: run?.price ?? null, capturedAt: run?.createdAt ?? null };
  }
  const row = market as { currentPrice?: unknown; capturedAt?: unknown };
  const currentPrice = Number(row.currentPrice);
  return {
    currentPrice: Number.isFinite(currentPrice) ? currentPrice : run?.price ?? null,
    capturedAt: typeof row.capturedAt === "string" ? row.capturedAt : run?.createdAt ?? null,
  };
}

function planStatus(
  plan: PredictionStrategyPlan,
  run: PredictionAutoRunLog | undefined,
  market: { currentPrice: number | null; capturedAt: string | null },
  hasPosition: boolean
): { status: AiTradingDeskPlanStatus; label: string } {
  if (hasPosition) return { status: "POSITION_OPEN", label: "持仓中" };
  if (market.currentPrice == null || market.capturedAt == null) {
    return { status: "PLAN_ONLY", label: "仅有计划" };
  }
  if (run?.status === "ERROR") return { status: "ERROR", label: "检查异常" };
  if (run?.status === "BLOCKED") return { status: "BLOCKED", label: "风控拦截" };
  if (run?.status === "EXECUTED") return { status: "READY", label: "已触发开仓" };
  if (plan.setup === "BUY_DIP") return { status: "WAIT_LONG", label: "等待低吸" };
  if (plan.setup === "SELL_RALLY") return { status: "WAIT_SHORT", label: "等待高空" };
  return { status: "OBSERVE", label: "暂不交易" };
}

function directionText(direction: string): string {
  if (direction === "LONG") return "偏多";
  if (direction === "SHORT") return "偏空";
  return "中性";
}

function buildPlanRows(
  plans: PredictionStrategyPlan[],
  runs: PredictionAutoRunLog[],
  positions: BitgetDemoPosition[],
  runtimeQuotes: Map<string, { price: number; capturedAt: string }>
): AiTradingDeskPlan[] {
  const latest = latestRunsBySymbol(runs);
  const openSymbols = new Set(positions.map((row) => row.symbol.replace(/USDT$/i, "")));
  return plans.map((plan) => {
    const run = latest.get(plan.symbol.toUpperCase());
    const runMarket = marketFromRun(run);
    const quote = runtimeQuotes.get(`${plan.symbol}USDT`.toUpperCase());
    const market = runMarket.currentPrice != null && runMarket.capturedAt
      ? runMarket
      : {
          currentPrice: quote?.price ?? null,
          capturedAt: quote?.capturedAt ?? null,
        };
    const state = planStatus(
      plan,
      run,
      market,
      openSymbols.has(plan.symbol.toUpperCase())
    );
    const point = plan.pointGuidance;
    const triggerText = [
      plan.reason,
      point ? `关键点位 ${point.threshold.toLocaleString("en-US")}，${point.closeInterval}收盘确认。` : "",
      run?.reason ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      symbol: `${plan.symbol}USDT`,
      assetName: plan.assetName,
      status: state.status,
      statusLabel: state.label,
      direction: plan.setup === "BUY_DIP" ? "LONG" : plan.setup === "SELL_RALLY" ? "SHORT" : "NEUTRAL",
      confidence: plan.confidence,
      weeklyText: plan.weeklyForecast
        ? sanitizePlanHorizonText(`${directionText(plan.weeklyDirection)} · ${plan.weeklyForecast.path}`, "WEEKLY")
        : "缺少周预测",
      dailyText: plan.dailyForecast
        ? sanitizePlanHorizonText(`${directionText(plan.dailyDirection)} · ${plan.dailyForecast.path}`, "DAILY")
        : "缺少日预测",
      actionText: run?.reason || plan.reason,
      triggerText,
      invalidationText: point?.invalidationRule ?? "预测失效或止损触发时退出。",
      keyLevel: point?.threshold ?? null,
      currentPrice: market.currentPrice,
      lastCheckedAt: market.capturedAt,
    };
  });
}

function strategyOrderMap(rows: BitgetDemoStrategyOrder[]): Map<string, BitgetDemoStrategyOrder> {
  const map = new Map<string, BitgetDemoStrategyOrder>();
  for (const row of rows) {
    map.set(`${row.symbol}:${row.posSide}`, row);
  }
  return map;
}

function plannedRiskPrices(
  position: BitgetDemoPosition,
  settings: { stopLossPct: number; target1Pct: number }
): { stopLoss: number; takeProfit: number } {
  const isLong = position.posSide === "long";
  return {
    stopLoss: round(position.avgPrice * (1 + (isLong ? -1 : 1) * settings.stopLossPct / 100), 8),
    takeProfit: round(position.avgPrice * (1 + (isLong ? 1 : -1) * settings.target1Pct / 100), 8),
  };
}

function buildPositions(
  positions: BitgetDemoPosition[],
  strategyOrders: BitgetDemoStrategyOrder[],
  settings: AiTradingDeskSettings,
  riskSettings: { stopLossPct: number; target1Pct: number }
): AiTradingDeskPosition[] {
  if (!settings.showCurrentPositions) return [];
  const orderMap = strategyOrderMap(strategyOrders);
  return positions.map((position) => {
    const order = orderMap.get(`${position.symbol}:${position.posSide}`);
    const planned = plannedRiskPrices(position, riskSettings);
    const hasExchangeRisk = Boolean(order?.stopLoss || order?.takeProfit);
    return {
      symbol: position.symbol,
      direction: position.posSide === "short" ? "SHORT" : "LONG",
      averageEntryPrice: position.avgPrice,
      markPrice: position.markPrice,
      profitRatePct: round(position.profitRate * 100, 2),
      leverage: position.leverage,
      marginMode: position.marginMode,
      openedAt: position.createdAt,
      stopLoss: order?.stopLoss ?? planned.stopLoss,
      takeProfit: order?.takeProfit ?? planned.takeProfit,
      riskSource: hasExchangeRisk ? "BITGET_ORDER" : "SYSTEM_PLAN",
      unrealisedPnlUsdt: settings.showAbsolutePnl ? round(position.unrealisedPnl, 4) : null,
    };
  });
}

function tradeReturn(row: BitgetDemoClosedPosition): number {
  const notional = Math.abs(row.openPriceAvg * row.openTotalPos);
  if (!Number.isFinite(notional) || notional <= 0) return 0;
  return (row.netProfit / notional) * 100;
}

function buildTrades(
  rows: BitgetDemoClosedPosition[],
  settings: AiTradingDeskSettings
): AiTradingDeskTrade[] {
  if (!settings.showTradeHistory) return [];
  return rows.slice(0, settings.historyLimit).map((row) => ({
    id: row.positionId,
    symbol: row.symbol,
    direction: row.posSide === "short" ? "SHORT" : "LONG",
    openPrice: row.openPriceAvg,
    closePrice: row.closePriceAvg,
    returnPct: round(tradeReturn(row), 2),
    netProfitUsdt: settings.showAbsolutePnl ? round(row.netProfit, 4) : null,
    openedAt: row.createdAt,
    closedAt: row.updatedAt,
  }));
}

function maxDrawdown(returns: number[]): number | null {
  if (!returns.length) return null;
  let equity = 1;
  let peak = 1;
  let drawdown = 0;
  for (const value of [...returns].reverse()) {
    equity *= Math.max(0.000001, 1 + value / 100);
    peak = Math.max(peak, equity);
    drawdown = Math.max(drawdown, ((peak - equity) / peak) * 100);
  }
  return round(drawdown, 2);
}

function buildStats(
  closed: BitgetDemoClosedPosition[],
  settings: AiTradingDeskSettings
): AiTradingDeskStats {
  const returns = closed.map(tradeReturn);
  const wins = closed.filter((row) => row.netProfit > 0).length;
  const losses = closed.filter((row) => row.netProfit < 0).length;
  return {
    closedTrades: closed.length,
    wins,
    losses,
    winRatePct: closed.length ? round((wins / closed.length) * 100, 1) : null,
    averageReturnPct: returns.length
      ? round(returns.reduce((sum, value) => sum + value, 0) / returns.length, 2)
      : null,
    bestReturnPct: returns.length ? round(Math.max(...returns), 2) : null,
    worstReturnPct: returns.length ? round(Math.min(...returns), 2) : null,
    tradeCurveMaxDrawdownPct: maxDrawdown(returns),
    netProfitUsdt: settings.showAbsolutePnl
      ? round(closed.reduce((sum, row) => sum + row.netProfit, 0), 4)
      : null,
  };
}

function emptySnapshot(settings: AiTradingDeskSettings, message: string): AiTradingDeskSnapshot {
  const environment = getBitgetDemoEnvironment();
  const live = environment.mode === "LIVE_EXPERIMENT";
  const snapshot: AiTradingDeskSnapshot = {
    generatedAt: new Date().toISOString(),
    lastSyncedAt: null,
    mode: live ? "BITGET_LIVE_EXPERIMENT" : "BITGET_DEMO",
    ledgerSource: live ? "BITGET_LIVE" : "BITGET_DEMO",
    ledgerNotice: live
      ? "本页直接读取独立Bitget实盘实验账户；实验本金、盈亏与回撤均来自交易所账户，不与站内模拟账本混合。"
      : "会员端只展示Bitget Demo真实模拟订单；MOOX站内模拟盘是独立账本。",
    strategyEnabled: false,
    mirrorEnabled: false,
    executionConfigured: false,
    executionAllowed: false,
    serverHealthy: false,
    syncStatus: settings.enabled ? "ERROR" : "DISABLED",
    syncMessage: message,
    operationalState: settings.enabled ? "SERVICE_ERROR" : "PAUSED",
    operationalStateLabel: settings.enabled ? "服务异常" : "已暂停",
    quoteReady: false,
    latestQuoteAt: null,
    experiment: {
      status: live ? "NOT_STARTED" : "DISABLED", startedAt: null, endsAt: null,
      initialEquityUsdt: live ? environment.liveInitialCapitalUsdt : null, currentEquityUsdt: null,
      pnlUsdt: null, pnlPct: null, maxDrawdownUsdt: null, maxDrawdownPct: null, dailyPnlUsdt: null, dailyPnlPct: null, dailyHistory: [],
      stopReason: "", securityMessage: "",
    },
    runtime: {
      paused: false,
      pauseReason: "",
      lastHeartbeatAt: null,
      lastStrategyAt: null,
      lastReconcileAt: null,
      heartbeatAgeSeconds: null,
      quoteAgeSeconds: null,
      decisionStatsToday: {
        scanRuns: 0,
        symbolsEvaluated: 0,
        confidenceBlocked: 0,
        alignmentBlocked: 0,
        triggerWaiting: 0,
        riskBlocked: 0,
        marketErrors: 0,
        orderAttempts: 0,
        executed: 0,
      },
    },
    settings,
    strategies: [],
    planSummary: { publishedToday: 0, watching: 0, armed: 0, submittedOrOpen: 0, closedToday: 0 },
    intentDecisions: [],
    marketQuotes: [],
    publishedPlans: [],
    plans: [],
    positions: [],
    recentTrades: [],
    stats: {
      closedTrades: 0,
      wins: 0,
      losses: 0,
      winRatePct: null,
      averageReturnPct: null,
      bestReturnPct: null,
      worstReturnPct: null,
      tradeCurveMaxDrawdownPct: null,
      netProfitUsdt: null,
    },
  };
  return applyAiDeskOperationalState(snapshot);
}

export async function buildMemberAiTradingDeskSnapshot(
  now = new Date()
): Promise<AiTradingDeskSnapshot> {
  const storedSettings = await getMemberAiTradingDeskSettings();
  const environment = getBitgetDemoEnvironment();
  const live = environment.mode === "LIVE_EXPERIMENT";
  const settings = live ? { ...storedSettings, showAbsolutePnl: true } : storedSettings;
  if (!settings.enabled) return emptySnapshot(settings, "AI交易公开台已由管理员关闭。");

  const [dashboard, runtime, strategies, planDashboard] = await Promise.all([
    getPredictionAutoTraderDashboard(now),
    getBitgetRuntimeState(now),
    getThreeHorizonPublicStrategies(now),
    getAiTradePlanDashboard(now),
  ]);
  const liveResults = await Promise.allSettled([
    getBitgetDemoCurrentPositions(),
    getBitgetDemoClosedPositions(100),
    getBitgetDemoPendingStrategyOrders(),
  ]);
  const allPositions = liveResults[0].status === "fulfilled" ? liveResults[0].value : [];
  const bitgetClosed = liveResults[1].status === "fulfilled" ? liveResults[1].value : [];
  const strategyOrders = liveResults[2].status === "fulfilled" ? liveResults[2].value : [];
  const planSymbols = new Set(dashboard.plans.map((plan) => `${plan.symbol}USDT`.toUpperCase()));
  const allowedSymbols: Set<string> = live ? new Set<string>(environment.liveAllowedSymbols) : planSymbols;
  const experimentStartMs = runtime.liveExperiment?.startedAt
    ? Date.parse(runtime.liveExperiment.startedAt)
    : Number.NaN;
  const positions = allPositions.filter((row) => allowedSymbols.has(row.symbol.toUpperCase()));
  const closed = bitgetClosed.filter((row) => {
    if (!allowedSymbols.has(row.symbol.toUpperCase())) return false;
    if (!live || !Number.isFinite(experimentStartMs)) return true;
    const closedAt = Date.parse(row.updatedAt ?? row.createdAt ?? "");
    return Number.isFinite(closedAt) && closedAt >= experimentStartMs;
  });
  const runtimeQuotes = new Map(
    runtime.latestQuotes.map((row) => [
      row.symbol.toUpperCase(),
      { price: row.price, capturedAt: row.capturedAt },
    ] as const)
  );
  const errors = liveResults
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : "Bitget读取失败");

  const snapshot: AiTradingDeskSnapshot = {
    generatedAt: now.toISOString(),
    lastSyncedAt: now.toISOString(),
    mode: live ? "BITGET_LIVE_EXPERIMENT" : "BITGET_DEMO",
    ledgerSource: live ? "BITGET_LIVE" : "BITGET_DEMO",
    ledgerNotice: live
      ? "本页只统计独立Bitget实盘实验账户。API不含提币权限；系统最多同时持有3个仓位，单仓风险、风险组敞口、日止损与总回撤均受约束。"
      : "会员端只展示Bitget Demo实际模拟持仓和成交；管理员站内模拟盘不会混入本页统计。",
    strategyEnabled: live ? strategies.some((row) => row.enabled) : dashboard.settings.enabled,
    mirrorEnabled: live ? false : dashboard.mirrorEnabled,
    executionConfigured: runtime.executionAllowed,
    executionAllowed: runtime.executionAllowed,
    serverHealthy: runtime.serverHealthy,
    syncStatus: errors.length
      ? (errors.length < liveResults.length ? "PARTIAL" : "ERROR")
      : runtime.serverHealthy
        ? "OK"
        : "PARTIAL",
    syncMessage: errors.length
      ? `部分数据同步失败：${errors.join("；")}`
      : runtime.paused
        ? `服务器交易执行已暂停：${runtime.pauseReason || "等待管理员恢复"}`
        : runtime.serverHealthy
          ? live ? "Bitget实盘行情、服务器心跳、策略检查与账户对账正常。" : "Bitget Demo行情、服务器心跳、策略检查与账户对账正常。"
          : (runtime.freshQuotesCount ?? 0) > 0
            ? `服务器正常运行；${runtime.freshQuotesCount}/${runtime.totalSymbols ?? 0}个品种报价新鲜，其余休市或延迟品种已单独跳过。`
            : "服务器正在等待可用行情或账户对账恢复；不会提交新订单。",
    operationalState: "CONNECTING",
    operationalStateLabel: "正在连接",
    quoteReady: (runtime.freshQuotesCount ?? 0) > 0,
    latestQuoteAt: runtime.lastMarketAt,
    experiment: runtime.liveExperiment ?? {
      status: live ? "NOT_STARTED" : "DISABLED", startedAt: null, endsAt: null,
      initialEquityUsdt: live ? environment.liveInitialCapitalUsdt : null, currentEquityUsdt: null,
      pnlUsdt: null, pnlPct: null, maxDrawdownUsdt: null, maxDrawdownPct: null, dailyPnlUsdt: null, dailyPnlPct: null, dailyHistory: [],
      stopReason: "", securityMessage: "",
    },
    runtime: {
      paused: runtime.paused,
      pauseReason: runtime.pauseReason,
      lastHeartbeatAt: runtime.lastHeartbeatAt,
      lastStrategyAt: runtime.lastStrategyAt,
      lastReconcileAt: runtime.lastReconcileAt,
      heartbeatAgeSeconds: runtime.heartbeatAgeSeconds,
      quoteAgeSeconds: runtime.quoteAgeSeconds,
      decisionStatsToday: runtime.decisionStatsToday,
    },
    settings,
    strategies,
    planSummary: planDashboard.summary,
    intentDecisions: planDashboard.decisions,
    marketQuotes: planDashboard.quotes,
    publishedPlans: planDashboard.plans,
    plans: buildPlanRows(
      dashboard.plans,
      dashboard.recentRuns,
      positions,
      runtimeQuotes
    ),
    positions: buildPositions(positions, strategyOrders, settings, {
      stopLossPct: dashboard.settings.stopLossPct,
      target1Pct: dashboard.settings.target1Pct,
    }),
    recentTrades: buildTrades(closed, settings),
    stats: buildStats(closed, settings),
  };
  return applyAiDeskOperationalState(snapshot, now);
}

export async function syncMemberAiTradingDeskSnapshot(
  now = new Date()
): Promise<AiTradingDeskSnapshot> {
  if (!(await ensureMemberAiTradingDeskTables()) || !prisma) {
    const settings = await getMemberAiTradingDeskSettings();
    return emptySnapshot(settings, "交易数据库未连接。");
  }
  try {
    const snapshot = await buildMemberAiTradingDeskSnapshot(now);
    await prisma.$executeRaw`
      UPDATE trade_member_ai_desk_snapshot SET
        payload = ${JSON.stringify(snapshot)}::jsonb,
        last_synced_at = ${now},
        last_error = NULL,
        updated_at = NOW()
      WHERE id = 'default'
    `;
    lastReadableSnapshot = snapshot;
    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失败";
    await prisma.$executeRaw`
      UPDATE trade_member_ai_desk_snapshot SET
        last_error = ${message},
        updated_at = NOW()
      WHERE id = 'default'
    `;
    throw error;
  }
}

export async function getMemberAiTradingDeskSnapshot(): Promise<AiTradingDeskSnapshot> {
  const settingsPromise = getMemberAiTradingDeskSettings();
  if (!prisma) {
    const settings = await settingsPromise;
    return lastReadableSnapshot
      ? applyAiDeskOperationalState({
          ...lastReadableSnapshot,
          settings,
          syncStatus: "PARTIAL",
          syncMessage: "交易数据库暂时不可用，继续展示本实例最近一次只读快照。",
        })
      : emptySnapshot(settings, "交易数据库暂时不可用；页面保持可打开并等待自动恢复。");
  }

  try {
    const [settings, rows] = await Promise.all([
      settingsPromise,
      withReadTimeout(
        prisma.$queryRawUnsafe<DbDeskSnapshot[]>(`
          SELECT payload, last_synced_at, last_error
          FROM trade_member_ai_desk_snapshot
          WHERE id = 'default'
          LIMIT 1
        `),
        "交易台快照"
      ),
    ]);
    const row = rows[0];
    if (!row) {
      return lastReadableSnapshot
        ? applyAiDeskOperationalState({
            ...lastReadableSnapshot,
            settings,
            syncStatus: "PARTIAL",
            syncMessage: "数据库尚未写入新的交易台快照，继续展示最近一次可读数据。",
          })
        : emptySnapshot(settings, "等待服务器任务写入首轮交易台快照；会员访问不会直连Bitget。");
    }
    const payload = parseJson<AiTradingDeskSnapshot>(row.payload);
    const hasPayload = payload && Array.isArray(payload.plans);
    const syncedAt = iso(row.last_synced_at);
    const stale = !syncedAt || Date.now() - new Date(syncedAt).getTime() > 3 * 60_000;
    if (!hasPayload) {
      return emptySnapshot(settings, "等待服务器完成首轮交易台同步；页面已经正常打开。");
    }
    const staleMessage = stale
      ? `交易台快照等待服务器更新；最近同步时间${syncedAt ?? "未知"}，旧数据继续只读展示。`
      : "";
    const snapshot = applyAiDeskOperationalState({
      ...payload,
      settings,
      strategies: payload.strategies ?? [],
      planSummary: payload.planSummary ?? { publishedToday: 0, watching: 0, armed: 0, submittedOrOpen: 0, closedToday: 0 },
      intentDecisions: payload.intentDecisions ?? [],
      marketQuotes: payload.marketQuotes ?? [],
      publishedPlans: payload.publishedPlans ?? [],
      lastSyncedAt: syncedAt ?? payload.lastSyncedAt,
      syncStatus: row.last_error || stale ? "PARTIAL" : payload.syncStatus,
      syncMessage: row.last_error ? `最近同步异常：${row.last_error}` : staleMessage || payload.syncMessage,
      operationalState: payload.operationalState ?? "CONNECTING",
      operationalStateLabel: payload.operationalStateLabel ?? "正在连接",
      quoteReady: payload.quoteReady ?? false,
      latestQuoteAt: payload.latestQuoteAt ?? null,
      ledgerSource: payload.ledgerSource ?? (payload.mode === "BITGET_LIVE_EXPERIMENT" ? "BITGET_LIVE" : "BITGET_DEMO"),
      ledgerNotice:
        payload.ledgerNotice ??
        (payload.mode === "BITGET_LIVE_EXPERIMENT"
          ? "本页只统计独立Bitget实盘实验账户。"
          : "会员端只展示Bitget Demo实际模拟订单；MOOX站内模拟盘是独立账本。"),
      experiment: payload.experiment ?? {
        status: "DISABLED", startedAt: null, endsAt: null, initialEquityUsdt: null, currentEquityUsdt: null,
        pnlUsdt: null, pnlPct: null, maxDrawdownUsdt: null, maxDrawdownPct: null, dailyPnlUsdt: null, dailyPnlPct: null, dailyHistory: [],
        stopReason: "", securityMessage: "",
      },
      runtime: payload.runtime ?? {
        paused: false,
        pauseReason: "",
        lastHeartbeatAt: null,
        lastStrategyAt: null,
        lastReconcileAt: null,
        heartbeatAgeSeconds: null,
        quoteAgeSeconds: null,
        decisionStatsToday: {
          scanRuns: 0,
          symbolsEvaluated: 0,
          confidenceBlocked: 0,
          alignmentBlocked: 0,
          triggerWaiting: 0,
          riskBlocked: 0,
          marketErrors: 0,
          orderAttempts: 0,
          executed: 0,
        },
      },
    });
    lastReadableSnapshot = snapshot;
    return snapshot;
  } catch (error) {
    const settings = await settingsPromise;
    const message = error instanceof Error ? error.message : "交易台读取失败";
    console.warn("member AI trading desk snapshot read failed", error);
    if (lastReadableSnapshot) {
      return applyAiDeskOperationalState({
        ...lastReadableSnapshot,
        settings,
        syncStatus: "PARTIAL",
        syncMessage: `${message}；继续展示本实例最近一次只读快照。`,
      });
    }
    return emptySnapshot(settings, `${message}；页面保持可用并将在后台自动重试。`);
  }
}

