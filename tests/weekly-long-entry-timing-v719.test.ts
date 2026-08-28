import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyWeeklyTimingToEntryEligibility,
  evaluateNewExposureSafety,
  evaluateWeeklyLongEntryTiming,
  isExposureLedgerConsistent,
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

test("locked late-week risk blocks a new long and cannot be offset by technical location", () => {
  const result = evaluateWeeklyLongEntryTiming(base);
  assert.equal(result.blocked, true);
  assert.equal(result.riskMatched, "冲高回落");
  assert.match(result.reason, /禁止新增或追加多头敞口/);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, atDirectionalEdge: true }).blocked, true);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, falseBreakReclaimed: true }).blocked, true);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPath: "SURGE_THEN_PULLBACK" }).blocked, true);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPath: "先涨后跌" }).blocked, true);
});

test("timing language never flips shorts but covers every horizon that could add a long", () => {
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, direction: "SHORT" }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, strategyType: "INTRADAY" }).blocked, true);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, strategyType: "POSITION" }).blocked, true);
});

test("unlocked, expired, early-period, or ordinary paths cannot invent a timing block", () => {
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyLockedAt: null }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPeriodEnd: "2026-08-13" }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPeriodStart: null }).blocked, false);
  assert.equal(evaluateWeeklyLongEntryTiming({ ...base, weeklyPath: "回踩后逐步走强" }).blocked, false);
  const monday = Date.parse("2026-08-10T12:00:00+08:00");
  assert.match(evaluateWeeklyLongEntryTiming({ ...base, nowMs: monday }).reason, /尚未进入.*后半段/);
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
      { id: "future-v9", status: "LOCKED", publishedAt: "2026-08-14T12:00:01+08:00", lockedAt: "2026-08-14T12:00:01+08:00", periodStart: "2026-08-10", periodEnd: "2026-08-16", version: 9 },
      { id: "captured-v1", status: "PUBLISHED", publishedAt: "2026-08-14T11:59:59+08:00", lockedAt: "2026-08-14T11:59:59+08:00", periodStart: "2026-08-10", periodEnd: "2026-08-16", version: 1 },
    ],
  });
  assert.equal(selected?.id, "captured-v1");
});

test("forecast selection never activates a pre-locked future period", () => {
  const selected = selectFormallyLockedForecast({
    today: "2026-08-28",
    nowMs: Date.parse("2026-08-28T12:00:00+08:00"),
    score: (row) => row.version ?? 0,
    rows: [
      { id: "future-week", status: "LOCKED", publishedAt: "2026-08-24T09:00:00+08:00", lockedAt: "2026-08-24T09:00:00+08:00", periodStart: "2026-08-31", periodEnd: "2026-09-06", version: 9 },
    ],
  });
  assert.equal(selected, null);
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
});

test("production eligibility composition blocks a high-score candidate but never bypasses another risk", () => {
  const timing = evaluateWeeklyLongEntryTiming(base);
  assert.deepEqual(applyWeeklyTimingToEntryEligibility({ otherwiseEligible: true, timing }), {
    eligible: false,
    rejectionCode: "TIMING_RISK",
  });
  const ordinary = evaluateWeeklyLongEntryTiming({ ...base, weeklyPath: "回踩后逐步走强" });
  assert.deepEqual(applyWeeklyTimingToEntryEligibility({ otherwiseEligible: false, timing: ordinary }), {
    eligible: false,
    rejectionCode: null,
  });
});

test("all four real entry routes and scale-in share the same fail-closed timing gate", () => {
  const timing = evaluateWeeklyLongEntryTiming(base);
  for (const action of ["COMMISSIONING_ENTRY", "NORMAL_PROFILE_ENTRY", "DAILY_MINIMUM_ENTRY", "ACTIVITY_FALLBACK_ENTRY", "SCALE_IN"] as const) {
    const result = evaluateNewExposureSafety({ action, direction: "LONG", authorityReadsOk: true, ledgerConsistent: true, timing });
    assert.equal(result.allowed, false, action);
    assert.equal(result.rejectionCode, "TIMING_RISK", action);
  }
});

test("authority failure or ledger mismatch blocks adds while risk reduction remains available", () => {
  const timing = evaluateWeeklyLongEntryTiming({ ...base, weeklyPath: "回踩后逐步走强" });
  for (const fields of [{ authorityReadsOk: false, ledgerConsistent: true }, { authorityReadsOk: true, ledgerConsistent: false }]) {
    const blocked = evaluateNewExposureSafety({ action: "SCALE_IN", direction: "LONG", timing, ...fields });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.rejectionCode, "RECONCILIATION_REQUIRED");
  }
  const reduction = evaluateNewExposureSafety({ action: "RISK_REDUCTION", direction: "LONG", authorityReadsOk: false, ledgerConsistent: false, timing: evaluateWeeklyLongEntryTiming(base) });
  assert.equal(reduction.allowed, true);
  assert.equal(reduction.rejectionCode, null);
});

test("ledger reconciliation requires exact position, protection and active-decision side matches", () => {
  const row = { symbol: "BTCUSDT", side: "long" as const };
  assert.equal(isExposureLedgerConsistent({ positions: [row], protections: [row], activeDecisions: [row] }), true);
  assert.equal(isExposureLedgerConsistent({ positions: [row], protections: [], activeDecisions: [row] }), false);
  assert.equal(isExposureLedgerConsistent({ positions: [row], protections: [row], activeDecisions: [] }), false);
  assert.equal(isExposureLedgerConsistent({ positions: [row], protections: [row], activeDecisions: [row, row] }), false);
  assert.equal(isExposureLedgerConsistent({ positions: [row], protections: [row], activeDecisions: [{ symbol: "BTCUSDT", side: "short" }] }), false);
});

test("timing gate never creates a short or forces an existing long to close", () => {
  const timing = evaluateWeeklyLongEntryTiming(base);
  assert.equal(evaluateNewExposureSafety({ action: "NORMAL_PROFILE_ENTRY", direction: "SHORT", authorityReadsOk: true, ledgerConsistent: true, timing }).allowed, true);
  assert.equal(evaluateNewExposureSafety({ action: "RISK_REDUCTION", direction: "LONG", authorityReadsOk: true, ledgerConsistent: true, timing }).allowed, true);
});

test("production wiring centralizes all entry routes and leaves risk-reducing management intact", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/trading-signals/three-horizon-strategy.ts"), "utf8");
  for (const action of ["COMMISSIONING_ENTRY", "NORMAL_PROFILE_ENTRY", "DAILY_MINIMUM_ENTRY", "ACTIVITY_FALLBACK_ENTRY"]) {
    assert.match(source, new RegExp(`exposureAction: "${action}"`));
  }
  assert.match(source, /action: "SCALE_IN"/);
  assert.match(source, /const newExposureGate = evaluateNewExposureSafety\(/);
  assert.match(source, /closePosition\(/);
  assert.match(source, /runTp1ProtectionTransition\(/);
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
