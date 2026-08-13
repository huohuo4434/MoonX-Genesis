import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyWeeklyTimingToEntryEligibility,
  evaluateWeeklyLongEntryTiming,
} from "../lib/trading-signals/weekly-long-entry-timing-core";
import { resolveLiveCapacityV4 } from "../lib/bitget/live-capacity-core";
import {
  isFormalForecastStatus,
  selectFormallyLockedForecast,
} from "../lib/trading-signals/formal-forecast-lock-core";

const nowMs = Date.parse("2026-08-14T12:00:00+08:00");
const base = {
  strategyType: "SWING" as const,
  direction: "LONG" as const,
  weeklyPath: "周中反弹，后段冲高回落并有兑现风险",
  weeklyStatus: "LOCKED",
  weeklyPublishedAt: "2026-08-09T20:00:00+08:00",
  weeklyLockedAt: "2026-08-10T00:00:00+08:00",
  weeklyPeriodStart: "2026-08-10",
  weeklyPeriodEnd: "2026-08-16",
  nowMs,
  atDirectionalEdge: false,
  falseBreakReclaimed: false,
};

test("locked late-week risk blocks a new swing long and cannot be offset by momentum", () => {
  const result = evaluateWeeklyLongEntryTiming(base);
  assert.equal(result.blocked, true);
  assert.equal(result.riskMatched, "冲高回落");
  assert.match(result.reason, /禁止新波段多仓/);
  assert.doesNotMatch(result.reason, /SHORT|翻空/);
});

test("a pullback to the directional lower edge or false-break reclaim can clear only the timing gate", () => {
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, atDirectionalEdge: true }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, falseBreakReclaimed: true }).blocked, false);
});

test("timing language never blocks shorts, existing-position management, or other horizons", () => {
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, direction: "SHORT" }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, strategyType: "INTRADAY" }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, strategyType: "POSITION" }).blocked, false);
});

test("unlocked, expired, or ordinary bullish paths cannot invent a timing block", () => {
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyLockedAt: null }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPeriodEnd: "2026-08-13" }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPeriodStart: null }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPath: "回踩后逐步走强" }).blocked, false);
});

test("a late-week narrative does not block early in its locked Hong Kong week", () => {
  const monday = Date.parse("2026-08-10T12:00:00+08:00");
  const result = evaluateWeeklyLongEntryTiming({ ...base, nowMs: monday });
  assert.equal(result.blocked, false);
  assert.match(result.reason, /尚未进入.*周后段/);
});

test("draft pending and non-mature publication metadata never enable the timing gate", () => {
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyStatus: "DRAFT" }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyStatus: "PENDING" }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPublishedAt: null }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPublishedAt: "2026-08-15T00:00:00+08:00" }).blocked, false);
});

test("formal forecast status uses an exact repository-backed allowlist", () => {
  assert.equal(isFormalForecastStatus("LOCKED"), true);
  assert.equal(isFormalForecastStatus("published"), true);
  for (const status of ["UNKNOWN", "UNPUBLISHED", "UNLOCKED", "NOT_LOCKED", "LOCKED_PENDING_VERIFICATION", "VERIFIED"]) {
    assert.equal(isFormalForecastStatus(status), false, status);
  }
});

test("forecast selection uses captured now and cannot mature against a later wall clock", () => {
  const capturedNowMs = Date.parse("2026-08-14T12:00:00+08:00");
  const selected = selectFormallyLockedForecast({
    today: "2026-08-14",
    nowMs: capturedNowMs,
    score: (row) => row.version ?? 0,
    rows: [
      {
        id: "future-v9",
        status: "LOCKED",
        publishedAt: "2026-08-14T12:00:01+08:00",
        lockedAt: "2026-08-14T12:00:01+08:00",
        periodStart: "2026-08-10",
        periodEnd: "2026-08-16",
        version: 9,
      },
      {
        id: "captured-v1",
        status: "PUBLISHED",
        publishedAt: "2026-08-14T11:59:59+08:00",
        lockedAt: "2026-08-14T11:59:59+08:00",
        periodStart: "2026-08-10",
        periodEnd: "2026-08-16",
        version: 1,
      },
    ],
  });
  assert.equal(selected?.id, "captured-v1");
});

test("production forecast selection threads one captured now without Date.now drift", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/trading-signals/prediction-auto-trader.ts"), "utf8");
  const formalStart = source.indexOf("function rowIsFormallyLocked(");
  const legStart = source.indexOf("function forecastLeg(", formalStart);
  const selectionSection = source.slice(formalStart, legStart);
  assert.doesNotMatch(selectionSection, /Date\.now\(\)/);
  assert.match(selectionSection, /rowIsFormallyLocked\(row, nowMs\)/);
  assert.match(source, /selectForecast\(rows, assetId, "WEEK", today, now\.getTime\(\)\)/);
  assert.match(source, /selectForecast\(rows, meta\.assetId, "MONTH", today, nowMs\)/);
  assert.match(source, /selectForecast\(rows, meta\.assetId, "WEEK", today, nowMs\)/);
  assert.match(source, /selectForecast\(rows, meta\.assetId, "DAY", today, nowMs\)/);
});

test("production eligibility composition blocks a high-score candidate but never bypasses other risk", () => {
  const blockedTiming = evaluateWeeklyLongEntryTiming(base);
  const highTechnicalCandidate = applyWeeklyTimingToEntryEligibility({ otherwiseEligible: true, timing: blockedTiming });
  assert.deepEqual(highTechnicalCandidate, { eligible: false, rejectionCode: "WEEKLY_LONG_TIMING_BLOCK" });

  const timingClearedAtEdge = evaluateWeeklyLongEntryTiming({ ...base, atDirectionalEdge: true });
  const separateRiskFailed = applyWeeklyTimingToEntryEligibility({ otherwiseEligible: false, timing: timingClearedAtEdge });
  assert.deepEqual(separateRiskFailed, { eligible: false, rejectionCode: null });
});

test("production swing evaluation applies timing after weekly direction but before readiness", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/trading-signals/three-horizon-strategy.ts"), "utf8");
  const evaluationAt = source.indexOf("const weeklyLongTiming = evaluateWeeklyLongEntryTiming(");
  const contextAt = source.indexOf("timingBlockReason: weeklyLongTiming.blocked", evaluationAt);
  const readinessAt = source.indexOf("const entryEligibility = applyWeeklyTimingToEntryEligibility(", contextAt);
  assert.ok(evaluationAt >= 0);
  assert.ok(contextAt > evaluationAt);
  assert.ok(readinessAt > contextAt);
  assert.match(source, /const baseValid = entryEligibility\.eligible/);
  assert.match(source, /rejectionCode = entryEligibility\.rejectionCode/);
});

test("authorized V4 capacity deterministically supersedes every legacy three configuration", () => {
  assert.equal(resolveLiveCapacityV4({ v4: undefined, v3: undefined, legacy: undefined }), 10);
  assert.equal(resolveLiveCapacityV4({ v4: undefined, v3: "3", legacy: "3" }), 10);
  assert.equal(resolveLiveCapacityV4({ v4: undefined, v3: "3", legacy: undefined }), 10);
  assert.equal(resolveLiveCapacityV4({ v4: undefined, v3: undefined, legacy: "3" }), 10);
  assert.equal(resolveLiveCapacityV4({ v4: "7", v3: "3", legacy: "3" }), 7);
  assert.equal(resolveLiveCapacityV4({ v4: "99", v3: "3", legacy: "3" }), 10);
});

test("capacity wiring preserves independent notional loss and drawdown gates", () => {
  const client = readFileSync(resolve(process.cwd(), "lib/bitget/demo-client.ts"), "utf8");
  assert.match(client, /MOOX_LIVE_MAX_CONCURRENT_POSITIONS_V4/);
  assert.match(client, /MOOX_LIVE_MAX_TRADES_PER_DAY_V4/);
  assert.match(client, /liveMaxGrossNotionalPct/);
  assert.match(client, /liveMaxPositionNotionalUsdt/);
  assert.match(client, /liveDailyLossUsdt/);
  assert.match(client, /liveMaxDrawdownUsdt/);
});
