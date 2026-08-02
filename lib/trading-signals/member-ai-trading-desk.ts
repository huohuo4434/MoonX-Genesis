import "server-only";

import {
  getBitgetDemoClosedPositions,
  getBitgetDemoCurrentPositions,
  getBitgetDemoPendingStrategyOrders,
  type BitgetDemoClosedPosition,
  type BitgetDemoPosition,
  type BitgetDemoStrategyOrder,
} from "@/lib/bitget/demo-client";
import { prisma } from "@/lib/prisma";
import {
  ensurePredictionAutoTraderTables,
  getPredictionAutoTraderDashboard,
} from "@/lib/trading-signals/prediction-auto-trader";
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

type DbClosedMoonxPosition = {
  id: string;
  symbol: string;
  direction: string;
  original_quantity: number;
  average_entry_price: number;
  current_price: number;
  realized_pnl: number;
  opened_at: Date | string;
  closed_at: Date | string | null;
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

function finite(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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
  hasPosition: boolean
): { status: AiTradingDeskPlanStatus; label: string } {
  if (hasPosition) return { status: "POSITION_OPEN", label: "持仓中" };
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
  positions: BitgetDemoPosition[]
): AiTradingDeskPlan[] {
  const latest = latestRunsBySymbol(runs);
  const openSymbols = new Set(positions.map((row) => row.symbol.replace(/USDT$/i, "")));
  return plans.map((plan) => {
    const run = latest.get(plan.symbol.toUpperCase());
    const market = marketFromRun(run);
    const state = planStatus(plan, run, openSymbols.has(plan.symbol.toUpperCase()));
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
        ? `${directionText(plan.weeklyDirection)} · ${plan.weeklyForecast.path}`
        : "缺少周预测",
      dailyText: plan.dailyForecast
        ? `${directionText(plan.dailyDirection)} · ${plan.dailyForecast.path}`
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

async function loadClosedMoonxMirroredPositions(limit = 100): Promise<BitgetDemoClosedPosition[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbClosedMoonxPosition[]>(
    `SELECT p.id, p.symbol, p.direction, p.original_quantity,
            p.average_entry_price, p.current_price, p.realized_pnl,
            p.opened_at, p.closed_at
     FROM trade_paper_positions p
     JOIN trade_signals s ON s.id = p.signal_id
     WHERE p.status = 'CLOSED'
       AND s.draft_source = 'PREDICTION_AUTO_TRADER'
       AND EXISTS (
         SELECT 1 FROM trade_bitget_demo_mirrors m
         WHERE m.signal_id = p.signal_id AND m.status = 'SUCCESS'
       )
     ORDER BY p.closed_at DESC NULLS LAST
     LIMIT $1`,
    Math.max(1, Math.min(100, limit))
  );
  return rows.map((row) => ({
    positionId: row.id,
    symbol: String(row.symbol).toUpperCase().endsWith('USDT')
      ? String(row.symbol).toUpperCase()
      : `${String(row.symbol).toUpperCase()}USDT`,
    posSide: String(row.direction).toUpperCase() === 'SHORT' ? 'short' : 'long',
    openPriceAvg: finite(row.average_entry_price),
    closePriceAvg: finite(row.current_price),
    openTotalPos: finite(row.original_quantity),
    netProfit: finite(row.realized_pnl),
    createdAt: iso(row.opened_at),
    updatedAt: iso(row.closed_at),
  }));
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
  return {
    generatedAt: new Date().toISOString(),
    lastSyncedAt: null,
    mode: "BITGET_DEMO",
    strategyEnabled: false,
    mirrorEnabled: false,
    executionAllowed: false,
    serverHealthy: false,
    syncStatus: settings.enabled ? "ERROR" : "DISABLED",
    syncMessage: message,
    settings,
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
}

export async function buildMemberAiTradingDeskSnapshot(
  now = new Date()
): Promise<AiTradingDeskSnapshot> {
  const settings = await getMemberAiTradingDeskSettings();
  if (!settings.enabled) return emptySnapshot(settings, "AI交易公开台已由管理员关闭。");

  const dashboard = await getPredictionAutoTraderDashboard(now);
  const liveResults = await Promise.allSettled([
    getBitgetDemoCurrentPositions(),
    getBitgetDemoClosedPositions(100),
    getBitgetDemoPendingStrategyOrders(),
    loadClosedMoonxMirroredPositions(100),
  ]);
  const allPositions = liveResults[0].status === "fulfilled" ? liveResults[0].value : [];
  const bitgetClosed = liveResults[1].status === "fulfilled" ? liveResults[1].value : [];
  const strategyOrders = liveResults[2].status === "fulfilled" ? liveResults[2].value : [];
  const moonxClosed = liveResults[3].status === "fulfilled" ? liveResults[3].value : [];
  const planSymbols = new Set(dashboard.plans.map((plan) => `${plan.symbol}USDT`.toUpperCase()));
  const positions = allPositions.filter((row) => planSymbols.has(row.symbol.toUpperCase()));
  const closed = moonxClosed.length ? moonxClosed : bitgetClosed.filter((row) => planSymbols.has(row.symbol.toUpperCase()));
  const errors = liveResults
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : "Bitget读取失败");

  const snapshot: AiTradingDeskSnapshot = {
    generatedAt: now.toISOString(),
    lastSyncedAt: now.toISOString(),
    mode: "BITGET_DEMO",
    strategyEnabled: dashboard.settings.enabled,
    mirrorEnabled: dashboard.mirrorEnabled,
    executionAllowed: dashboard.executionAllowed,
    serverHealthy: dashboard.server.serverHealthy,
    syncStatus: errors.length ? (errors.length < liveResults.length ? "PARTIAL" : "ERROR") : "OK",
    syncMessage: errors.length ? `部分数据同步失败：${errors.join("；")}` : "Bitget Demo与AI策略同步正常。",
    settings,
    plans: buildPlanRows(dashboard.plans, dashboard.recentRuns, positions),
    positions: buildPositions(positions, strategyOrders, settings, {
      stopLossPct: dashboard.settings.stopLossPct,
      target1Pct: dashboard.settings.target1Pct,
    }),
    recentTrades: buildTrades(closed, settings),
    stats: buildStats(closed, settings),
  };
  return snapshot;
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
  return {
    ...payload,
    settings,
    lastSyncedAt: syncedAt ?? payload.lastSyncedAt,
    syncStatus: row.last_error ? "PARTIAL" : payload.syncStatus,
    syncMessage: row.last_error ? `最近同步异常：${row.last_error}` : payload.syncMessage,
  };
}
