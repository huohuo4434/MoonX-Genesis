import assert from "node:assert/strict";
import test from "node:test";
import { concisePlanState, conciseSnapshotFresh, concisePrice, latestConcisePlans } from "../lib/presentation/concise-trade-plan";
import type { AiTradePlan } from "../types/ai-trade-plan";

const now = Date.parse("2026-09-12T08:00:00Z");
const from = "2026-09-12T00:00:00Z";
const until = "2026-09-13T00:00:00Z";
function fixture(patch: Partial<AiTradePlan> = {}): AiTradePlan {
  return { id: "plan-1", planGroupId: "group-1", version: 1, symbol: "BTCUSDT", strategyType: "INTRADAY",
    executionMode: "BITGET_LIVE", status: "WATCHING", tier: "FORMAL", direction: "LONG", contentHash: "12345678",
    forecastId: "forecast-1", forecastVersion: "v1", forecastHorizon: "WEEK", publishedAt: from, updatedAt: from,
    forecastPublishedAt: from, forecastLockedAt: from, validFrom: from, expiresAt: until,
    forecastValidFrom: from, forecastValidUntil: until, triggerRule: "Wait for a closed candle confirmation",
    entryZoneLow: 100, entryZoneHigh: 102, protectiveStop: 98, target1: 106, target2: 110, target3: 115,
    ...patch } as AiTradePlan;
}
test("formal plan remains conditional even when armed", () => {
  assert.equal(concisePlanState(fixture(), now), "CONDITIONAL");
  assert.equal(concisePlanState(fixture({ status: "ARMED" }), now), "CONDITIONAL");
});
test("submitted, position and error states are not new entries", () => {
  assert.equal(concisePlanState(fixture({ status: "ORDER_SUBMITTED" }), now), "SUBMITTED");
  assert.equal(concisePlanState(fixture({ status: "OPEN" }), now), "POSITION");
  assert.equal(concisePlanState(fixture({ status: "EXECUTION_ERROR" }), now), "WAIT");
});
test("expired, future, unlocked and candidate records hide prices", () => {
  for (const patch of [{ expiresAt: from }, { validFrom: until }, { forecastValidUntil: from }, { forecastLockedAt: until },
    { forecastId: null }, { tier: "CANDIDATE" as const }, { contentHash: "" }, { triggerRule: "" }]) {
    assert.equal(concisePlanState(fixture(patch), now), "WAIT");
  }
  assert.equal(concisePlanState(fixture(), Date.parse(until)), "WAIT");
});
test("long and short geometry must match direction", () => {
  assert.equal(concisePlanState(fixture({ protectiveStop: 103 }), now), "WAIT");
  assert.equal(concisePlanState(fixture({ target2: 104 }), now), "WAIT");
  assert.equal(concisePlanState(fixture({ target3: NaN }), now), "WAIT");
  assert.equal(concisePlanState(fixture({ direction: "SHORT", protectiveStop: 105, target1: 97, target2: 95, target3: 93 }), now), "CONDITIONAL");
});
test("cancelled new version cannot resurrect an old plan", () => {
  assert.deepEqual(latestConcisePlans([fixture(), fixture({ version: 2, status: "CANCELLED" })], "BITGET_LIVE"), []);
});
test("separate execution modes and horizons without mutating records", () => {
  const rows = [fixture(), fixture({ planGroupId: "swing", strategyType: "SWING" }), fixture({ planGroupId: "demo", executionMode: "BITGET_DEMO" })];
  const before = JSON.stringify(rows);
  assert.equal(latestConcisePlans(rows, "BITGET_LIVE").length, 2);
  assert.equal(JSON.stringify(rows), before);
});
test("stale or future snapshots never imply current entry readiness", () => {
  assert.equal(conciseSnapshotFresh(new Date(now - 60_000).toISOString(), now), true);
  for (const value of [null, "bad", new Date(now + 1).toISOString(), new Date(now - 120_001).toISOString()]) assert.equal(conciseSnapshotFresh(value, now), false);
});
test("small-cap prices are not rounded to zero", () => {
  assert.equal(concisePrice(0.0000001234), "0.0000001234");
});
