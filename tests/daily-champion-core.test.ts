import test from "node:test";
import assert from "node:assert/strict";
import {
  dailyChampionScore,
  dailyChampionRiskScale,
  rankDailyChampionBoard,
  type DailyChampionBoardInput,
} from "@/lib/trading-signals/daily-champion-core";

const row = (overrides: Partial<DailyChampionBoardInput> = {}): DailyChampionBoardInput => ({
  id: "btc",
  symbol: "BTCUSDT",
  direction: "LONG",
  status: "READY",
  rejectionCode: "",
  confidence: 55,
  technicalScore: 50,
  forecastScore: 60,
  conditionsMet: 3,
  conditionsTotal: 4,
  entryTriggered: true,
  rewardRisk: 1.5,
  marketSessionAllowed: true,
  focusPriority: 10,
  currentPrice: 100,
  entryPrice: 100,
  stopLoss: 98,
  target1: 103,
  target2: 105,
  rejectionReason: "等待执行",
  updatedAt: "2026-08-26T01:00:00.000Z",
  ...overrides,
});

test("daily champion score rewards resonance quality and a real entry trigger", () => {
  const base = dailyChampionScore({
    focusPriority: 10, confidence: 50, technicalScore: 40, forecastScore: 50,
    conditionsMet: 2, conditionsTotal: 4, rewardRisk: 1.2, entryTriggered: false, ready: false,
  });
  const confirmed = dailyChampionScore({
    focusPriority: 10, confidence: 50, technicalScore: 40, forecastScore: 50,
    conditionsMet: 3, conditionsTotal: 4, rewardRisk: 1.8, entryTriggered: true, ready: true,
  });
  assert.ok(confirmed > base);
});

test("activity promotion preserves the strictest risk-reduction overlay", () => {
  assert.equal(dailyChampionRiskScale([1, 0.65, 0.5, 0.8]), 0.5);
  assert.equal(dailyChampionRiskScale([]), 1);
});

test("the board chooses one champion across the full pool and deduplicates symbols", () => {
  const ranked = rankDailyChampionBoard([
    row(),
    row({ id: "btc-new", confidence: 62, updatedAt: "2026-08-26T02:00:00.000Z" }),
    row({ id: "lite", symbol: "LITEUSDT", confidence: 68, technicalScore: 70, forecastScore: 72 }),
    row({ id: "eth", symbol: "ETHUSDT", confidence: 40, technicalScore: 20, entryTriggered: false }),
  ]);
  assert.deepEqual(ranked.map((item) => item.symbol), ["LITEUSDT", "BTCUSDT", "ETHUSDT"]);
  assert.equal(ranked[0]?.tier, "CHAMPION");
  assert.equal(ranked[0]?.suggestedRiskPct, 0.2);
  assert.equal(ranked[2]?.qualified, false);
  assert.equal(ranked[2]?.suggestedRiskPct, 0);
});

test("a neutral opinion never enters the executable champion pool", () => {
  assert.deepEqual(rankDailyChampionBoard([row({ direction: "NEUTRAL" })]), []);
});

test("an observing row is executable only for the narrow low-confidence activity path", () => {
  assert.equal(rankDailyChampionBoard([row({ status: "OBSERVING", rejectionCode: "TECHNICAL_SCORE_LOW" })])[0]?.qualified, false);
  assert.equal(rankDailyChampionBoard([row({ status: "OBSERVING", rejectionCode: "CONFIDENCE_LOW" })])[0]?.qualified, true);
});

test("preflight eligibility requires sufficient evidence, complete levels, and an open market session", () => {
  assert.equal(rankDailyChampionBoard([row({ conditionsMet: 1, conditionsTotal: 20 })])[0]?.qualified, false);
  assert.equal(rankDailyChampionBoard([row({ stopLoss: null })])[0]?.qualified, false);
  assert.equal(rankDailyChampionBoard([row({ marketSessionAllowed: false })])[0]?.qualified, false);
});

test("every ranked executable fallback discloses the same 0.20 percent ceiling used by execution", () => {
  const ranked = rankDailyChampionBoard([
    row({ id: "btc", symbol: "BTCUSDT" }),
    row({ id: "eth", symbol: "ETHUSDT", confidence: 54 }),
    row({ id: "sol", symbol: "SOLUSDT", confidence: 53 }),
  ]);
  assert.deepEqual(ranked.map((item) => item.suggestedRiskPct), [0.2, 0.2, 0.2]);
});
