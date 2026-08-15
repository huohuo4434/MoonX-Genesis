import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { decideChanMultiTimeframe, CHAN_V2_TIMEFRAMES } from "../lib/trading-signals/chan-multi-timeframe-core";
import {
  readChanFormalDirectionWithDependencies,
  resolveChanFormalDirection,
  type ChanDirectionPlan,
} from "../lib/trading-signals/chan-formal-direction-core";
import { buildChanChartAnnotations } from "../lib/trading-signals/chan-structure-core";
import type { ChanMultiTimeframeFrame, ChanStructure } from "../types/chan-execution";

function structure(overrides: Partial<ChanStructure> = {}): ChanStructure {
  const bearish = overrides.sellPoint === "SECOND" || overrides.sellPoint === "THIRD";
  const strokes = bearish
    ? [
        { startIndex: 0, endIndex: 3, startPrice: 90, endPrice: 120, direction: "UP" as const, complete: true },
        { startIndex: 3, endIndex: 6, startPrice: 120, endPrice: 100, direction: "DOWN" as const, complete: true },
        { startIndex: 6, endIndex: 9, startPrice: 100, endPrice: 115, direction: "UP" as const, complete: true },
        { startIndex: 9, endIndex: 12, startPrice: 115, endPrice: 98, direction: "DOWN" as const, complete: true },
      ]
    : [
        { startIndex: 0, endIndex: 3, startPrice: 120, endPrice: 90, direction: "DOWN" as const, complete: true },
        { startIndex: 3, endIndex: 6, startPrice: 90, endPrice: 110, direction: "UP" as const, complete: true },
        { startIndex: 6, endIndex: 9, startPrice: 110, endPrice: 95, direction: "DOWN" as const, complete: true },
        { startIndex: 9, endIndex: 12, startPrice: 95, endPrice: 112, direction: "UP" as const, complete: true },
      ];
  return {
    sufficient: true,
    normalizedCandles: [],
    fractals: [],
    strokes,
    segments: [{ startStroke: 0, endStroke: 4, direction: "UP", complete: true }],
    zones: [{ startStroke: 0, endStroke: 2, low: 95, high: 105 }],
    trendState: "COMPLETE",
    divergence: false,
    divergenceEvidence: { priceExtended: false, momentumContracted: false, zoneConfirmed: false, segmentComplete: false },
    buyPoint: "SECOND",
    sellPoint: "NONE",
    riskLevels: {
      long: { invalidation: 95, tp1: 115, tp2: 125, breakevenTrigger: 115 },
      short: { invalidation: 105, tp1: 85, tp2: 75, breakevenTrigger: 85 },
    },
    ...overrides,
  };
}

function frames(overrides: Partial<Record<(typeof CHAN_V2_TIMEFRAMES)[number], Partial<ChanStructure>>> = {}): ChanMultiTimeframeFrame[] {
  return CHAN_V2_TIMEFRAMES.map((timeframe) => ({
    timeframe,
    structure: structure(overrides[timeframe]),
    error: null,
  }));
}

const capturedNowMs = Date.parse("2026-08-14T04:00:00.000Z");
const formalLeg = (overrides: Record<string, unknown> = {}) => ({
  status: "LOCKED",
  publishedAt: "2026-08-13T00:00:00.000Z",
  lockedAt: "2026-08-13T00:01:00.000Z",
  periodStart: "2026-08-10",
  periodEnd: "2026-08-16",
  ...overrides,
});
const directionPlan = (overrides: Partial<ChanDirectionPlan> = {}): ChanDirectionPlan => ({
  symbol: "BTC",
  weeklyForecast: formalLeg(),
  monthlyForecast: null,
  weeklyDirection: "LONG",
  monthlyDirection: "NEUTRAL",
  ...overrides,
});

test("all timeframes bullish still WAIT when formal weekly/monthly authority is missing", () => {
  const result = decideChanMultiTimeframe({ authoritativeDirection: "NEUTRAL", frames: frames() });
  assert.equal(result.action, "WAIT");
  assert.ok(result.reasons.includes("AUTHORITATIVE_DIRECTION_UNAVAILABLE"));
  assert.equal(result.confirmation, null);
  assert.equal(result.invalidation, null);
  assert.equal(result.technicalBias, "BULL");
  assert.equal(result.chanContribution, 35);
});

test("formal LONG plus four completed bullish second-buy structures yields one research BUY candidate", () => {
  const result = decideChanMultiTimeframe({ authoritativeDirection: "BULL", frames: frames() });
  assert.equal(result.action, "BUY_CANDIDATE");
  assert.deepEqual(result.reasons, []);
  assert.equal(result.invalidation, 95);
  assert.equal(result.confirmation, 115);
  assert.equal(result.tradingEligible, false);
  assert.equal(result.chanContribution, 35);
  assert.ok(result.timeframeSignals.every((row) => row.stage.code === "SECOND_BUY_CONFIRMED" && row.stage.status === "ACTIVE"));
});

test("a strict higher-low sequence without its confirmation stroke exposes waiting stage and stays WAIT", () => {
  const waiting = structure({ buyPoint: "NONE", trendState: "NEAR_COMPLETE" });
  waiting.strokes = waiting.strokes.slice(0, 3);
  const result = decideChanMultiTimeframe({ authoritativeDirection: "BULL", frames: CHAN_V2_TIMEFRAMES.map((timeframe) => ({ timeframe, structure: waiting, error: null })) });
  assert.equal(result.action, "WAIT");
  assert.ok(result.timeframeSignals.every((row) => row.stage.code === "WAIT_SECOND_BUY_CONFIRMATION" && row.stage.status === "AWAITING_CONFIRMATION"));
});

test("timeframe conflict strictly WAIT and never flips formal LONG to SELL", () => {
  const bearish: Partial<ChanStructure> = { buyPoint: "NONE", sellPoint: "SECOND" };
  const result = decideChanMultiTimeframe({ authoritativeDirection: "BULL", frames: frames({ "30m": bearish }) });
  assert.equal(result.action, "WAIT");
  assert.ok(result.reasons.includes("TIMEFRAME_CONFLICT_OR_NO_ENTRY"));
  assert.notEqual(result.action as string, "SELL_CANDIDATE");
  assert.equal(result.chanContribution, 26.25, "3:1 conflict keeps only the dominant side contribution");
});

test("a 2 BULL to 2 BEAR tie has zero Chan contribution and remains WAIT", () => {
  const bearish: Partial<ChanStructure> = { buyPoint: "NONE", sellPoint: "SECOND" };
  const result = decideChanMultiTimeframe({
    authoritativeDirection: "BULL",
    frames: frames({ "30m": bearish, "1H": bearish }),
  });
  assert.equal(result.technicalBias, "MIXED");
  assert.equal(result.chanContribution, 0);
  assert.equal(result.action, "WAIT");
});

test("one incomplete critical timeframe forces WAIT", () => {
  const result = decideChanMultiTimeframe({
    authoritativeDirection: "BULL",
    frames: frames({ "4H": { trendState: "NEAR_COMPLETE" } }),
  });
  assert.equal(result.action, "WAIT");
  assert.ok(result.reasons.includes("TIMEFRAME_STRUCTURE_INCOMPLETE"));
});

test("one failed timeframe read and structurally insufficient data each force WAIT", () => {
  const failed = frames();
  failed[0] = { ...failed[0]!, error: "MARKET_DATA_TIMEOUT_OR_FAILURE" };
  const failedResult = decideChanMultiTimeframe({ authoritativeDirection: "BULL", frames: failed });
  assert.equal(failedResult.action, "WAIT");
  assert.ok(failedResult.reasons.includes("TIMEFRAME_DATA_UNAVAILABLE"));

  const insufficient = decideChanMultiTimeframe({
    authoritativeDirection: "BULL",
    frames: frames({ "1D": { sufficient: false } }),
  });
  assert.equal(insufficient.action, "WAIT");
  assert.ok(insufficient.reasons.includes("TIMEFRAME_STRUCTURE_INCOMPLETE"));
});

test("formal SHORT plus four completed bearish candidates yields SELL without direction invention", () => {
  const bearish = frames(Object.fromEntries(
    CHAN_V2_TIMEFRAMES.map((timeframe) => [timeframe, { buyPoint: "NONE", sellPoint: "SECOND" }])
  ));
  const result = decideChanMultiTimeframe({ authoritativeDirection: "BEAR", frames: bearish });
  assert.equal(result.action, "SELL_CANDIDATE");
  assert.equal(result.authoritativeDirection, "BEAR");
  assert.equal(result.tradingEligible, false);
});

test("formal weekly BULL/BEAR is accepted, while a missing week may fall back to a formal month", () => {
  assert.deepEqual(resolveChanFormalDirection({ plan: directionPlan(), capturedNowMs }), {
    direction: "BULL", sourceHorizon: "WEEK", reason: "FORMAL_WEEKLY",
  });
  assert.deepEqual(resolveChanFormalDirection({
    plan: directionPlan({ weeklyDirection: "SHORT" }), capturedNowMs,
  }), { direction: "BEAR", sourceHorizon: "WEEK", reason: "FORMAL_WEEKLY" });
  assert.deepEqual(resolveChanFormalDirection({
    plan: directionPlan({
      weeklyForecast: null,
      weeklyDirection: "NEUTRAL",
      monthlyForecast: formalLeg(),
      monthlyDirection: "SHORT",
    }),
    capturedNowMs,
  }), { direction: "BEAR", sourceHorizon: "MONTH", reason: "FORMAL_MONTHLY_FALLBACK" });
});

test("draft future unlocked and week/month conflict all fail closed to NEUTRAL", () => {
  for (const weeklyForecast of [
    formalLeg({ status: "DRAFT" }),
    formalLeg({ publishedAt: "2026-08-14T05:00:00.000Z" }),
    formalLeg({ lockedAt: null }),
    formalLeg({ periodStart: "2026-08-17", periodEnd: "2026-08-23" }),
  ]) {
    assert.equal(resolveChanFormalDirection({
      plan: directionPlan({ weeklyForecast }), capturedNowMs,
    }).direction, "NEUTRAL");
  }
  assert.deepEqual(resolveChanFormalDirection({
    plan: directionPlan({ monthlyForecast: formalLeg(), monthlyDirection: "SHORT" }),
    capturedNowMs,
  }), { direction: "NEUTRAL", sourceHorizon: null, reason: "FORMAL_WEEK_MONTH_CONFLICT" });
});

test("empty malformed impossible and reversed formal periods all fail closed", () => {
  const invalidPeriods = [
    { periodStart: "", periodEnd: "2026-08-16" },
    { periodStart: "2026/08/10", periodEnd: "2026-08-16" },
    { periodStart: "2026-02-30", periodEnd: "2026-08-16" },
    { periodStart: "9999-99-99", periodEnd: "9999-99-99" },
    { periodStart: "2026-08-16", periodEnd: "2026-08-10" },
  ];
  for (const period of invalidPeriods) {
    const result = resolveChanFormalDirection({
      plan: directionPlan({ weeklyForecast: formalLeg(period) }),
      capturedNowMs,
    });
    assert.equal(result.direction, "NEUTRAL", JSON.stringify(period));
  }
});

test("formal WEEK and MONTH accept bounded spans and reject longer or sentinel ranges", () => {
  assert.equal(resolveChanFormalDirection({
    plan: directionPlan({
      weeklyForecast: formalLeg({ periodStart: "2026-08-01", periodEnd: "2026-08-14" }),
    }),
    capturedNowMs,
  }).direction, "BULL", "14 inclusive days is the WEEK boundary");
  assert.equal(resolveChanFormalDirection({
    plan: directionPlan({
      weeklyForecast: formalLeg({ periodStart: "2026-08-01", periodEnd: "2026-08-15" }),
    }),
    capturedNowMs,
  }).direction, "NEUTRAL", "15 inclusive days is too long for WEEK");

  const monthlyBase = directionPlan({
    weeklyForecast: null,
    weeklyDirection: "NEUTRAL",
    monthlyForecast: formalLeg({ periodStart: "2026-06-14", periodEnd: "2026-08-14" }),
    monthlyDirection: "LONG",
  });
  assert.equal(resolveChanFormalDirection({ plan: monthlyBase, capturedNowMs }).direction, "BULL", "62 inclusive days is the MONTH boundary");
  assert.equal(resolveChanFormalDirection({
    plan: directionPlan({
      weeklyForecast: null,
      weeklyDirection: "NEUTRAL",
      monthlyForecast: formalLeg({ periodStart: "2026-06-13", periodEnd: "2026-08-14" }),
      monthlyDirection: "LONG",
    }),
    capturedNowMs,
  }).direction, "NEUTRAL", "63 inclusive days is too long for MONTH");
  assert.equal(resolveChanFormalDirection({
    plan: directionPlan({
      weeklyForecast: null,
      weeklyDirection: "NEUTRAL",
      monthlyForecast: formalLeg({ periodStart: "2026-08-01", periodEnd: "9999-12-31" }),
      monthlyDirection: "LONG",
    }),
    capturedNowMs,
  }).direction, "NEUTRAL", "a valid-format far-future sentinel must fail by bounded span");
});

test("formal direction reader is symbol-scoped, read-only, captured-time stable, and read errors fail closed", async () => {
  const calls: Array<{ readOnly?: boolean; symbols?: readonly string[]; nowMs?: number }> = [];
  const resolved = await readChanFormalDirectionWithDependencies({
    symbol: "ETHUSDT",
    capturedNowMs,
  }, {
    readSettings: async (options) => { calls.push(options); return { id: "settings" }; },
    resolvePlans: async (_settings, now, symbols) => {
      calls.push({ symbols, nowMs: now.getTime() });
      return [directionPlan({ symbol: "ETH", weeklyDirection: "SHORT" })];
    },
  });
  assert.equal(resolved.direction, "BEAR");
  assert.deepEqual(calls, [{ readOnly: true }, { symbols: ["ETH"], nowMs: capturedNowMs }]);

  let planCalls = 0;
  const failed = await readChanFormalDirectionWithDependencies({ symbol: "BTCUSDT", capturedNowMs }, {
    readSettings: async () => { throw new Error("read failed"); },
    resolvePlans: async () => { planCalls += 1; return []; },
  });
  assert.deepEqual(failed, { direction: "NEUTRAL", sourceHorizon: null, reason: "FORMAL_DIRECTION_READ_FAILED" });
  assert.equal(planCalls, 0);
});

test("all technical timeframes opposing a formal LONG still WAIT and never become SHORT authority", () => {
  const bearish = frames(Object.fromEntries(
    CHAN_V2_TIMEFRAMES.map((timeframe) => [timeframe, { buyPoint: "NONE", sellPoint: "SECOND" }])
  ));
  const result = decideChanMultiTimeframe({ authoritativeDirection: "BULL", frames: bearish });
  assert.equal(result.action, "WAIT");
  assert.ok(result.reasons.includes("STRUCTURE_OPPOSES_AUTHORITY"));
  assert.equal(result.authoritativeDirection, "BULL");
});

test("chart annotations expose buy/sell markers and symmetric direction-specific risk", () => {
  const bullish = structure({ buyPoint: "THIRD", sellPoint: "NONE" });
  assert.deepEqual(buildChanChartAnnotations(bullish, "BULL"), {
    marker: { side: "BUY", label: "三买" },
    risk: bullish.riskLevels.long,
  });
  const bearish = structure({ buyPoint: "NONE", sellPoint: "THIRD" });
  assert.deepEqual(buildChanChartAnnotations(bearish, "BEAR"), {
    marker: { side: "SELL", label: "三卖" },
    risk: bearish.riskLevels.short,
  });
  assert.deepEqual(buildChanChartAnnotations(bullish, "NEUTRAL"), {
    marker: { side: "BUY", label: "三买" }, risk: null,
  });
});

test("Chan V2 sources are strict UTF-8 without replacement characters or known mojibake", () => {
  const files = [
    "app/member/technical-methods/page.tsx",
    "components/member/ChanStructureChart.tsx",
    "lib/trading-signals/chan-multi-timeframe-core.ts",
    "lib/trading-signals/chan-structure-core.ts",
  ];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const file of files) {
    const content = decoder.decode(readFileSync(resolve(file)));
    assert.doesNotMatch(content, /\uFFFD|锟斤拷|馃|鈥|鍒嗗瀷|涓灑|缁撴瀯/);
  }
});

test("page uses one captured now and the market adapter fans out all four reads in parallel", () => {
  const page = readFileSync(resolve("app/member/technical-methods/page.tsx"), "utf8");
  const market = readFileSync(resolve("lib/market-data/chan-market-data.ts"), "utf8");
  const reader = readFileSync(resolve("lib/trading-signals/chan-formal-direction-reader.ts"), "utf8");
  assert.match(page, /const capturedNowMs = Date\.now\(\)/);
  assert.match(page, /loadChanTimeframes\(\{ symbol, capturedNowMs/);
  assert.match(market, /return Promise\.all\(/);
  assert.match(market, /\["30m", "1H", "4H", "1D"\]/);
  assert.match(market, /capturedNowMs = input\.capturedNowMs \?\? Date\.now\(\)/);
  assert.match(reader, /getPredictionAutoTraderSettings/);
  assert.match(reader, /resolvePredictionStrategyPlans/);
  assert.doesNotMatch(reader, /ensure|executeRaw|UPDATE|INSERT|DELETE|createEvent/i);
  const deniedReturn = page.indexOf('gate.status === "DEVICE_REQUIRED"');
  const marketImport = page.indexOf('import("@/lib/market-data/chan-market-data")');
  assert.ok(deniedReturn >= 0 && marketImport > deniedReturn, "server market data must load only after the device denial return");
  assert.match(page, /当前阶段：\{selectedStage\.labelZh\}/);
  assert.match(page, /怎么看这页/);
  assert.doesNotMatch(page, /方法、权重与局限|TeacherMethodRulebookPanel|研究委员会|RESEARCH_ONLY|tradingEligible=false/);
});
