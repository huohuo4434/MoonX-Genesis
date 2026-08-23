import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalAssetCode,
  canonicalAssetId,
  assetDisplaySymbol,
} from "@/lib/presentation/asset-catalog";
import {
  containsForecastPathMethodTerms,
  mergeCanonicalForecastCandidates,
  normalizeForecastContract,
  sanitizeForecastPathText,
} from "@/lib/forecasts/forecast-contract";
import { ALLOWED_FORMAL_DIRECTIONS } from "@/lib/forecasts/formal-direction";
import { listCurrentMonthlyMarketOutlooks } from "@/lib/data/monthly-market-outlook";
import {
  applyAiDeskOperationalState,
  sanitizePlanHorizonText,
} from "@/lib/trading-signals/ai-desk-status";
import {
  forecastFreshnessStatus,
  summarizeForecastFreshness,
} from "@/lib/data/conviction/freshness";
import type { AiTradingDeskSnapshot } from "@/types/ai-trading-desk";
import type { DailyForecast } from "@/types/daily-forecast";
import { formatBeijingDeskTime } from "@/lib/presentation/member-desk-time-core";

function forecast(overrides: Partial<DailyForecast> = {}): DailyForecast {
  return {
    id: "test",
    assetId: "sp500",
    assetName: "标普500指数",
    symbol: "SPX",
    market: "us",
    forecastForDate: "2026-08-04",
    tradingSessionLabel: "下一美股交易日",
    publishedAt: "2026-08-03T10:00:00+08:00",
    accessLevel: "member",
    status: "published",
    version: 1,
    direction: "看涨",
    directionLabel: "上涨",
    confidence: 60,
    summary: "等待技术确认。",
    ...overrides,
  };
}

function snapshot(overrides: Partial<AiTradingDeskSnapshot> = {}): AiTradingDeskSnapshot {
  return {
    generatedAt: "2026-08-03T10:00:00.000Z",
    lastSyncedAt: "2026-08-03T10:00:00.000Z",
    mode: "BITGET_DEMO",
    ledgerSource: "BITGET_DEMO",
    ledgerNotice: "测试账本",
    strategyEnabled: true,
    mirrorEnabled: true,
    executionConfigured: true,
    executionAllowed: true,
    serverHealthy: true,
    syncStatus: "OK",
    syncMessage: "",
    operationalState: "CONNECTING",
    operationalStateLabel: "正在连接",
    quoteReady: false,
    latestQuoteAt: null,
    runtime: {
      paused: false,
      pauseReason: "",
      lastHeartbeatAt: "2026-08-03T10:00:30.000Z",
      lastStrategyAt: "2026-08-03T10:00:30.000Z",
      lastReconcileAt: null,
      heartbeatAgeSeconds: 30,
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
    settings: {
      enabled: true,
      showCurrentPositions: true,
      showTradeHistory: true,
      showAbsolutePnl: false,
      historyLimit: 20,
      updatedAt: "2026-08-03T10:00:00.000Z",
    },
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
    ...overrides,
  };
}

test("canonical market codes are stable across aliases", () => {
  assert.equal(canonicalAssetCode("GC"), "GOLD");
  assert.equal(canonicalAssetCode("SI=F"), "SILVER");
  assert.equal(canonicalAssetCode("CL"), "WTI");
  assert.equal(canonicalAssetId("GC=F"), "gold");
  assert.equal(assetDisplaySymbol("XAGUSD"), "SILVER");
});

test("one asset and target session exposes one final answer", () => {
  const rows = mergeCanonicalForecastCandidates([
    { forecast: forecast({ id: "legacy", directionLabel: "震荡", version: 3 }), source: "CURATED" },
    { forecast: forecast({ id: "store", directionLabel: "震荡上涨", version: 2 }), source: "STORE" },
    { forecast: forecast({ id: "fallback", directionLabel: "震荡下跌", version: 9 }), source: "FALLBACK" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "store");
  assert.equal(rows[0]?.targetSessionKey, "US-2026-08-04");
  assert.match(rows[0]?.targetSessionLabel ?? "", /2026年8月4日.*美股常规交易时段/);
});

test("public path removes Liu-Yao evidence terms", () => {
  const pathText = sanitizeForecastPathText("开盘后妻财子水仍受未月土压。盘中探底后反弹；尾盘观察压力");
  assert.equal(containsForecastPathMethodTerms(pathText), false);
  assert.equal(pathText, "盘中探底后反弹 → 尾盘观察压力");
  const normalized = normalizeForecastContract(forecast({ pathBias: "世爻受克", expectedPath: [] }));
  assert.equal(normalized.pathBias, "运行路径待技术确认");
});

test("monthly final directions stay inside the formal enum", () => {
  const allowed = new Set<string>(ALLOWED_FORMAL_DIRECTIONS);
  for (const item of listCurrentMonthlyMarketOutlooks()) {
    assert.equal(allowed.has(item.direction), true, `${item.symbol}: ${item.direction}`);
  }
  assert.equal(listCurrentMonthlyMarketOutlooks().some((item) => item.direction === "宽幅震荡" as never), false);
});

test("AI desk uses runtime quote freshness and pauses execution when data is stale", () => {
  const monitoredPlan = {
    symbol: "BTCUSDT",
    assetName: "比特币",
    status: "WAIT_LONG" as const,
    statusLabel: "等待低吸",
    direction: "LONG" as const,
    confidence: 50,
    weeklyText: "震荡",
    dailyText: "待确认",
    actionText: "等待",
    triggerText: "等待",
    invalidationText: "失效",
    keyLevel: null,
    currentPrice: 62000,
    lastCheckedAt: "2026-08-03T10:00:30.000Z",
  };
  const disconnected = applyAiDeskOperationalState(snapshot({ plans: [monitoredPlan] }), new Date("2026-08-03T10:01:00.000Z"));
  assert.equal(disconnected.operationalState, "DATA_DISCONNECTED");
  assert.equal(disconnected.executionAllowed, false);

  const ready = applyAiDeskOperationalState(snapshot({
    latestQuoteAt: "2026-08-03T10:00:30.000Z",
    runtime: { ...snapshot().runtime, quoteAgeSeconds: 30 },
    plans: [monitoredPlan],
  }), new Date("2026-08-03T10:01:00.000Z"));
  assert.equal(ready.operationalState, "WAITING_ENTRY");
  assert.equal(ready.syncStatus, "OK");
  assert.equal(ready.quoteReady, true);
  assert.equal(ready.executionAllowed, true);

  const delayed = applyAiDeskOperationalState(snapshot({
    latestQuoteAt: "2026-08-03T09:50:00.000Z",
    runtime: { ...snapshot().runtime, quoteAgeSeconds: 660 },
    plans: [monitoredPlan],
  }), new Date("2026-08-03T10:01:00.000Z"));
  assert.equal(delayed.operationalState, "DATA_DELAYED");
  assert.equal(delayed.executionAllowed, false);
});

test("AI plan horizon rejects weekly/monthly text in daily or weekly slots", () => {
  assert.equal(sanitizePlanHorizonText("周初上涨、后半周回落", "DAILY"), "日内节奏待重新确认");
  assert.equal(sanitizePlanHorizonText("8—9月震荡，10月修复", "WEEKLY"), "周度方向待重新确认");
});

test("expired member research is explicitly historical", () => {
  assert.equal(forecastFreshnessStatus("2026-07-28", "2026-08-02", "2026-08-03"), "EXPIRED");
  const summary = summarizeForecastFreshness(["EXPIRED", "MISSING"], "2026-08-03");
  assert.equal(summary.needsUpdate, true);
  assert.match(summary.label, /待更新/);
});

test("hydration-sensitive client copy uses stable server dates and Beijing timezone", () => {
  const root = process.cwd();
  const conviction = fs.readFileSync(path.join(root, "components/conviction/ConvictionDetailClient.tsx"), "utf8");
  const desk = fs.readFileSync(path.join(root, "components/member/AiTradingDeskClient.tsx"), "utf8");
  assert.equal(conviction.includes("new Date().toISOString().slice(0, 10)"), false);
  assert.match(desk, /formatBeijingDeskTime/);
  assert.match(desk, /北京时间/);
  assert.equal(formatBeijingDeskTime("2026-08-23T16:07:00.000Z"), "08/24 00:07");
});
