import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildMemberDeskPlansFromPersistedAudit } from "../lib/trading-signals/member-desk-persisted-plan-core";
import type { AiTradePlan } from "../types/ai-trade-plan";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function plan(strategyType: "INTRADAY" | "SWING" | "POSITION", version: number): AiTradePlan {
  const horizon = strategyType === "POSITION" ? "MONTH" : "WEEK";
  return {
    id: `${strategyType}-${version}`,
    planGroupId: `${strategyType}:BTCUSDT`,
    version,
    contentHash: `${strategyType}-${version}`,
    strategyType,
    strategyLabel: strategyType === "INTRADAY" ? "短线" : strategyType === "SWING" ? "中线" : "长线",
    symbol: "BTCUSDT",
    direction: "LONG",
    tier: "FORMAL",
    status: "WATCHING",
    executionMode: "BITGET_LIVE",
    thesisSummary: "正式预测锁定偏多",
    planningConfidence: 68,
    executionThreshold: 60,
    entryZoneLow: 100,
    entryZoneHigh: 101,
    triggerRule: "等待收盘确认",
    confirmationTimeframe: strategyType === "INTRADAY" ? "5m/1m" : strategyType === "SWING" ? "1H" : "4H",
    orderTypeIfTriggered: "MARKET",
    protectiveStop: 98,
    target1: 103,
    target2: 105,
    target3: 107,
    riskPercent: 0.2,
    maxLeverage: 2,
    validFrom: "2026-08-24T00:00:00.000Z",
    expiresAt: "2026-09-24T00:00:00.000Z",
    invalidationRule: "正式方向失效",
    cancelIf: "硬风控拦截",
    conditionsMet: 3,
    conditionsTotal: 5,
    currentPrice: 100.5,
    distanceToEntryPct: 0,
    publishedAt: "2026-08-24T00:00:00.000Z",
    lastCheckedAt: "2026-08-24T00:01:00.000Z",
    submittedAt: null,
    firstFillAt: null,
    averageFillPrice: null,
    closedAt: null,
    closeReason: null,
    clientOid: null,
    bitgetOrderId: null,
    sourceDecisionId: null,
    forecastId: `${horizon}-BTC`,
    forecastVersion: `${horizon}:v1`,
    forecastHorizon: horizon,
    forecastPublishedAt: "2026-08-23T00:00:00.000Z",
    forecastLockedAt: "2026-08-23T00:00:00.000Z",
    forecastValidFrom: "2026-08-24T00:00:00.000Z",
    forecastValidUntil: "2026-09-24T00:00:00.000Z",
    forecastSource: "MOOX",
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:01:00.000Z",
    events: [],
  };
}

test("同一品种的短中长计划同时保留，互不覆盖", () => {
  const rows = buildMemberDeskPlansFromPersistedAudit({
    plans: [plan("INTRADAY", 1), plan("SWING", 1), plan("POSITION", 1)],
    openPositions: [],
    executionMode: "BITGET_LIVE",
  });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.strategyType).sort(), ["INTRADAY", "POSITION", "SWING"]);
});

test("页面首屏不再同步等待交易所，多方观点使用共享短缓存", () => {
  const layout = read("app/member/ai-trading/layout.tsx");
  const page = read("app/member/ai-trading/page.tsx");
  const alphaCache = read("lib/trading-signals/member-alpha-feed-cache.ts");
  assert.doesNotMatch(layout, /getAdminTradingPerformanceSnapshot|getBitget/);
  assert.match(page, /MemberAiTradingDashboardLazy/);
  assert.match(alphaCache, /unstable_cache/);
  assert.match(alphaCache, /revalidate: 60/);
});

test("短线每分钟扫描但1分钟不能替代5分钟入场，三周期有独立数量上限", () => {
  const engine = read("lib/trading-signals/three-horizon-strategy.ts");
  assert.match(engine, /entryTimeframe: "5m\/1m"/);
  assert.match(engine, /scanIntervalMinutes: 1/);
  assert.match(engine, /const entryMet = strictChanTrigger \|\| rightSideTrigger/);
  assert.match(engine, /label: "1分钟成交微调"[\s\S]*weight: 0/);
  assert.match(engine, /strategyType === "SWING"[\s\S]*beijingStartOfWeek/);
  assert.match(engine, /strategyType === "POSITION"[\s\S]*beijingStartOfMonth/);
  assert.match(engine, /HORIZON_PERIOD_TRADE_CAP/);
  assert.match(engine, /所有新开仓入口（含首笔闭环验收）均已关闭/);
  assert.match(engine, /TRADE_CADENCE_READ_FAILED/);
  assert.match(engine, /LIVE_ACTIVITY_CONTROL\.configured && LIVE_ACTIVITY_CONTROL\.mode === "LIVE"/);
  assert.match(engine, /"MOOX_LIVE_ACTIVITY_TARGET_V641", 1, 1, 5/);
  assert.match(engine, /bitget_order_id IS NOT NULL OR client_oid IS NOT NULL OR status IN/);
});

test("Unified Live只记录可追溯六爻来源，综合正式预测不冒充六爻", () => {
  const engine = read("lib/trading-signals/three-horizon-strategy.ts");
  const store = read("lib/trading-signals/unified-live-store.ts");
  assert.match(engine, /traceableLiuyao = \/六爻\|liu/);
  assert.match(engine, /leg\?\.sourceLabel/);
  assert.match(engine, /liuyaoDirection: lockedLiuyaoDirection/);
  assert.match(store, /liuyaoDirection: input\.liuyaoDirection \?\? null/);
});

test("必需周期按策略隔离失败，可选1分钟失败不会拖死短线", () => {
  const engine = read("lib/trading-signals/three-horizon-strategy.ts");
  assert.match(engine, /Promise\.allSettled/);
  assert.match(engine, /\["5m", "30m", "4H"\]/);
  assert.match(engine, /\["1H", "4H", "1D"\]/);
  assert.match(engine, /REQUIRED_TIMEFRAME_UNAVAILABLE/);
});
