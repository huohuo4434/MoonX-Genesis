import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { annualPositionWindow, positionContextEligibility, cappedHoldingMinutes, newPositionHoldingDeadline } from "../lib/trading-signals/strategy-horizon-policy-core";
import { resolveForecastAuthorityContext } from "../lib/trading-signals/forecast-authority-context-core";
import { getAnnualForecastRoadmap2026 } from "../lib/research/annual-forecast-roadmap-2026";
import type { PredictionStrategyPlan } from "../types/prediction-auto-trader";
import { auditUnifiedLiveCustody } from "../lib/trading-signals/unified-live-custody-core";

const nowMs = Date.parse("2026-09-05T10:00:00+08:00");
const roadmap = getAnnualForecastRoadmap2026("bitcoin")!;
const week = { id: "w", version: 1, status: "LOCKED", confidence: 70, direction: "下跌", path: "", sourceLabel: "六爻", periodStart: "2026-08-31", periodEnd: "2026-09-06", publishedAt: "2026-08-28T00:00:00Z", lockedAt: "2026-08-28T00:00:00Z" };
const plan = { weeklyForecast: week, monthlyForecast: { ...week, periodStart: "2026-09-01", periodEnd: "2026-09-30" }, weeklyDirection: "SHORT", monthlyDirection: "SHORT" } as PredictionStrategyPlan;

test("annual windows only veto POSITION and never enable a long in a high month", () => {
  assert.equal(annualPositionWindow({ strategy: "POSITION", direction: "SHORT", roadmap, nowMs }).allowed, true);
  for (const direction of ["LONG", "NEUTRAL", "bad"]) assert.equal(annualPositionWindow({ strategy: "POSITION", direction, roadmap, nowMs }).allowed, false);
  for (const strategy of ["INTRADAY", "SWING"] as const) assert.equal(annualPositionWindow({ strategy, direction: "LONG", roadmap: null, nowMs }).allowed, true);
  for (const value of [null, { ...roadmap, locked: false }, { ...roadmap, publishedAt: "2026-10-01T00:00:00Z" }, { ...roadmap, publishedAt: "bad" }, { ...roadmap, months: [] }]) {
    assert.equal(annualPositionWindow({ strategy: "POSITION", direction: "SHORT", roadmap: value as typeof roadmap, nowMs }).allowed, false);
  }
  assert.equal(annualPositionWindow({ strategy: "POSITION", direction: "SHORT", roadmap, nowMs: NaN }).allowed, false);
  assert.equal(annualPositionWindow({ strategy: "POSITION", direction: "SHORT", roadmap, nowMs: Date.parse("2027-09-05T00:00:00Z") }).allowed, false);
});

test("annual month rolls in Beijing, and remains a candidate not price authority", () => {
  assert.equal(annualPositionWindow({ strategy: "POSITION", direction: "LONG", roadmap, nowMs: Date.parse("2026-09-30T16:00:00Z") }).allowed, true);
  assert.equal(annualPositionWindow({ strategy: "POSITION", direction: "LONG", roadmap, nowMs: Date.parse("2026-09-30T15:59:59Z") }).allowed, false);
});

test("month owns direction while missing, expired, future or opposite week vetoes entry", () => {
  assert.equal(positionContextEligibility({ strategy: "POSITION", direction: "SHORT", plan, roadmap, nowMs }).allowed, true);
  for (const status of ["UNLOCKED", "UNPUBLISHED", "NOT_VERIFIED", "VERIFIED", "formally locked", ""]) {
    assert.equal(positionContextEligibility({ strategy: "POSITION", direction: "SHORT", plan: { ...plan, weeklyForecast: { ...week, status } }, roadmap, nowMs }).allowed, false);
  }
  for (const weeklyForecast of [null, { ...week, status: "DRAFT" }, { ...week, publishedAt: "bad" }, { ...week, lockedAt: "2026-09-06T00:00:00Z" }, { ...week, periodStart: "2026-09-07", periodEnd: "2026-09-13" }, { ...week, periodEnd: "2026-09-04" }]) {
    assert.equal(positionContextEligibility({ strategy: "POSITION", direction: "SHORT", plan: { ...plan, weeklyForecast }, roadmap, nowMs }).allowed, false);
  }
  const opposite = { ...plan, monthlyDirection: "LONG" as const };
  assert.equal(resolveForecastAuthorityContext(opposite, "POSITION").direction, "LONG");
  assert.equal(positionContextEligibility({ strategy: "POSITION", direction: "LONG", plan: opposite, roadmap, nowMs }).allowed, false);
});

test("new deadlines use the exact approved forecast and cap 72 hours", () => {
  const input = { strategy: "SWING" as const, configuredMinutes: 10080, nowMs, forecastValidUntil: "2026-09-06T23:59:59+08:00" };
  assert.equal(newPositionHoldingDeadline(input), Date.parse(input.forecastValidUntil));
  assert.equal(newPositionHoldingDeadline({ ...input, forecastValidUntil: "2026-09-30T23:59:59+08:00" }), nowMs + 72 * 60 * 60_000);
  assert.equal(newPositionHoldingDeadline({ ...input, configuredMinutes: 60 }), nowMs + 60 * 60_000);
  for (const forecastValidUntil of [null, undefined, "", "bad", new Date(nowMs).toISOString(), new Date(nowMs - 1).toISOString()]) assert.equal(newPositionHoldingDeadline({ ...input, forecastValidUntil }), null);
  assert.equal(newPositionHoldingDeadline({ ...input, nowMs: NaN }), null);
  assert.equal(cappedHoldingMinutes("INTRADAY", 480), 90);
  assert.equal(cappedHoldingMinutes("SWING", NaN), 4320);
  assert.equal(cappedHoldingMinutes("POSITION", 999999), 40320);
});

test("all entry paths carry approved expiry; persistence freezes it before submission", () => {
  const source = readFileSync("lib/trading-signals/three-horizon-strategy.ts", "utf8");
  assert.equal((source.match(/forecastValidUntil: planGate.plan\?\.forecastValidUntil \?\? null/g) ?? []).length, 4);
  assert.match(source, /const eligibility = positionContextEligibility/);
  assert.match(source, /const annualWindow = positionContextEligibility/);
  const execute = source.slice(source.indexOf("async function executeReadyDecision"));
  assert.ok(execute.indexOf("maxHoldingUntil: new Date(deadline)") < execute.indexOf("const order = await placeBitgetDemoMarketOrder"));
  assert.equal((execute.match(/maxHoldingUntil: new Date\(deadline\)/g) ?? []).length, 2);
  assert.doesNotMatch(execute, /maxHoldingUntil: new Date\(submittedAt.getTime\(\) \+/);
  assert.match(source, /WHEN strategy_type='SWING' THEN 4320/);
  assert.match(source, /openedAt: submittedAt,\s+maxHoldMinutes: Math.max\(0, Math.floor\(\(deadline - submittedAt.getTime\(\)\)/);
  assert.match(source, /scaleInContext.allowed && Number.isFinite\(scaleInDeadline\) && Date.now\(\) < scaleInDeadline/);
});

test("time exits retain exchange protection and remain in the managed closing lifecycle", () => {
  const source = readFileSync("lib/trading-signals/three-horizon-strategy.ts", "utf8");
  const close = source.slice(source.indexOf("async function closePosition("), source.indexOf("async function manageActiveDecisions("));
  assert.doesNotMatch(close, /cancelBitgetDemoStrategyOrder/);
  assert.match(close, /reduceOnly: true/);
  assert.match(close, /paperOrderId: `\$\{decision.id\}:time-close`/);
  assert.match(source, /status: "CLOSING",\s+rejectionCode: "TIME_EXIT_FAILED"/);
  assert.match(source, /decisionForManagement.status === "CLOSING" \? "CLOSING"/);
  assert.match(source, /current.status === "CLOSING" \|\| ultraShortTimeExit/);
});

test("a zero-minute remaining custody window is due immediately, never reset to a week", () => {
  const audit = auditUnifiedLiveCustody({ snapshotAvailable: true, positions: [], orders: [], now: new Date(nowMs),
    slices: [{ id: "s", symbol: "BTCUSDT", horizon: "MEDIUM", side: "LONG", status: "OPEN", quantity: 1, openedAt: new Date(nowMs), maxHoldMinutes: 0 }],
  });
  assert.ok(audit.issues.some((issue) => issue.code === "TIME_EXIT_DUE" && issue.sliceId === "s"));
});
