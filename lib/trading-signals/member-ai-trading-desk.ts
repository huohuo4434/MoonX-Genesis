import "server-only";

import {
  getBitgetDemoClosedPositions,
  getBitgetDemoCurrentPositions,
  getBitgetDemoPendingStrategyOrders,
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
  if (!(await ensureMemberAiTradingDeskTables()) || !prisma) {
    return { ...DEFAULT_SETTINGS };
  }
  const rows = await prisma.$queryRawUnsafe<DbDeskSettings[]>(`
    SELECT enabled, show_current_positions, show_trade_history,
           show_absolute_pnl, history_limit, updated_at
    FROM trade_member_ai_desk_settings
    WHERE id = 'default'
    LIMIT 1
  `);
  return mapSettings(rows[0]);
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
  const snapshot: AiTradingDeskSnapshot = {
    generatedAt: new Date().toISOString(),
    lastSyncedAt: null,
    mode: "BITGET_DEMO",
    ledgerSource: "BITGET_DEMO",
    ledgerNotice: "会员端只展示Bitget Demo真实模拟订单；MOOX站内模拟盘是独立账本。",
    strategyEnabled: false,
    mirrorEnabled: false,
    executionAllowed: false,
    serverHealthy: false,
    syncStatus: settings.enabled ? "ERROR" : "DISABLED",
    syncMessage: message,
    operationalState: settings.enabled ? "SERVICE_ERROR" : "PAUSED",
    operationalStateLabel: settings.enabled ? "服务异常" : "已暂停",
    quoteReady: false,
    latestQuoteAt: null,
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
  const settings = await getMemberAiTradingDeskSettings();
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
  const positions = allPositions.filter((row) => planSymbols.has(row.symbol.toUpperCase()));
  const closed = bitgetClosed.filter((row) => planSymbols.has(row.symbol.toUpperCase()));
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
    mode: "BITGET_DEMO",
    ledgerSource: "BITGET_DEMO",
    ledgerNotice: "会员端只展示Bitget Demo实际模拟持仓和成交；管理员站内模拟盘不会混入本页统计。",
    strategyEnabled: dashboard.settings.enabled,
    mirrorEnabled: dashboard.mirrorEnabled,
    executionAllowed: dashboard.executionAllowed,
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
          ? "Bitget Demo行情、服务器心跳、策略检查与账户对账正常。"
          : "服务器心跳或行情时间尚未达到正常状态。",
    operationalState: "CONNECTING",
    operationalStateLabel: "正在连接",
    quoteReady: runtime.quoteAgeSeconds != null && runtime.quoteAgeSeconds <= 180,
    latestQuoteAt: runtime.lastMarketAt,
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
  const settings = await getMemberAiTradingDeskSettings();
  if (!(await ensureMemberAiTradingDeskTables()) || !prisma) {
    return emptySnapshot(settings, "交易数据库未连接。");
  }
  const rows = await prisma.$queryRawUnsafe<DbDeskSnapshot[]>(`
    SELECT payload, last_synced_at, last_error
    FROM trade_member_ai_desk_snapshot
    WHERE id = 'default'
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) return syncMemberAiTradingDeskSnapshot();
  const payload = parseJson<AiTradingDeskSnapshot>(row.payload);
  const hasPayload = payload && Array.isArray(payload.plans);
  const syncedAt = iso(row.last_synced_at);
  const stale = !syncedAt || Date.now() - new Date(syncedAt).getTime() > 3 * 60_000;
  if (!hasPayload) {
    try {
      return await syncMemberAiTradingDeskSnapshot();
    } catch (error) {
      return emptySnapshot(
        settings,
        error instanceof Error ? error.message : "首次同步失败。"
      );
    }
  }
  if (stale) {
    try {
      return await syncMemberAiTradingDeskSnapshot();
    } catch {
      // 读取最近一次快照，避免会员页因交易所短暂故障完全不可用。
    }
  }
  return applyAiDeskOperationalState({
    ...payload,
    settings,
    strategies: payload.strategies ?? [],
    planSummary: payload.planSummary ?? { publishedToday: 0, watching: 0, armed: 0, submittedOrOpen: 0, closedToday: 0 },
    publishedPlans: payload.publishedPlans ?? [],
    lastSyncedAt: syncedAt ?? payload.lastSyncedAt,
    syncStatus: row.last_error ? "PARTIAL" : payload.syncStatus,
    syncMessage: row.last_error ? `最近同步异常：${row.last_error}` : payload.syncMessage,
    operationalState: payload.operationalState ?? "CONNECTING",
    operationalStateLabel: payload.operationalStateLabel ?? "正在连接",
    quoteReady: payload.quoteReady ?? false,
    latestQuoteAt: payload.latestQuoteAt ?? null,
    ledgerSource: payload.ledgerSource ?? "BITGET_DEMO",
    ledgerNotice:
      payload.ledgerNotice ??
      "会员端只展示Bitget Demo实际模拟订单；MOOX站内模拟盘是独立账本。",
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
}
