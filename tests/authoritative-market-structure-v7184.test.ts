import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDirectionalMarketStructure,
  resolveAuthoritativeForecastDirection,
  resolveWeeklyAuthoritySetup,
  type StructureCandle,
} from "../lib/trading-signals/authoritative-market-structure-core";

const reference: StructureCandle[] = [
  { high: 110, low: 100, close: 106 },
  { high: 109.5, low: 100.5, close: 105 },
  { high: 109, low: 101, close: 104 },
  { high: 108.5, low: 101.5, close: 105 },
  { high: 108, low: 102, close: 104 },
  { high: 107.5, low: 102.5, close: 105 },
];

test("formal weekly direction overrides missing or opposite daily/fallback direction", () => {
  assert.equal(resolveAuthoritativeForecastDirection({ weeklyDirection: "LONG", fallbackDirection: "SHORT" }), "LONG");
  assert.equal(resolveAuthoritativeForecastDirection({ weeklyDirection: "SHORT", fallbackDirection: "LONG" }), "SHORT");
  assert.equal(resolveAuthoritativeForecastDirection({ weeklyDirection: "LONG", fallbackDirection: "NEUTRAL" }), "LONG");
});

test("formal weekly setup does not require a daily forecast or daily alignment", () => {
  assert.equal(resolveWeeklyAuthoritySetup({ weeklyAvailable: true, weeklyDirection: "LONG", weeklyConfidence: 72, minimumConfidence: 50 }), "BUY_DIP");
  assert.equal(resolveWeeklyAuthoritySetup({ weeklyAvailable: true, weeklyDirection: "SHORT", weeklyConfidence: 72, minimumConfidence: 50 }), "SELL_RALLY");
  assert.equal(resolveWeeklyAuthoritySetup({ weeklyAvailable: false, weeklyDirection: "NEUTRAL", weeklyConfidence: 0, minimumConfidence: 50 }), "MISSING_FORECAST");
  assert.equal(resolveWeeklyAuthoritySetup({ weeklyAvailable: true, weeklyDirection: "LONG", weeklyConfidence: 40, minimumConfidence: 50 }), "HOLD");
});

test("without an authoritative direction technical structure cannot create a trade side", () => {
  const structure = classifyDirectionalMarketStructure([
    ...reference,
    { high: 108, low: 99, close: 100 },
    { high: 109, low: 100, close: 108 },
  ], "NEUTRAL");
  assert.equal(structure.structure, "UNAVAILABLE");
  assert.equal(structure.atDirectionalEdge, false);
  assert.equal(structure.breakoutConfirmed, false);
});

test("directional edge permits probe timing while a false break reclaim keeps weekly side", () => {
  const edge = classifyDirectionalMarketStructure([
    ...reference,
    { high: 105, low: 101, close: 103 },
    { high: 104, low: 100.4, close: 101 },
  ], "LONG");
  assert.equal(edge.structure, "CONVERGING");
  assert.equal(edge.atDirectionalEdge, true);
  assert.equal(edge.currentEntryInvalidated, false);

  const reclaim = classifyDirectionalMarketStructure([
    ...reference,
    { high: 101, low: 98, close: 99 },
    { high: 103, low: 99, close: 101 },
  ], "LONG");
  assert.equal(reclaim.falseBreakReclaimed, true);
  assert.equal(reclaim.currentEntryInvalidated, false);
  assert.match(reclaim.label, /假突破已收回/);
});

test("valid adverse break invalidates only current entry and never emits an opposite side", () => {
  const broken = classifyDirectionalMarketStructure([
    ...reference,
    { high: 100, low: 97.5, close: 98.5 },
    { high: 99.5, low: 97, close: 98 },
  ], "LONG");
  assert.equal(broken.currentEntryInvalidated, true);
  assert.equal(broken.atDirectionalEdge, false);
  assert.match(broken.label, /不自动反手/);
  assert.equal("direction" in broken, false);
});

test("confirmed breakout is direction-relative and does not manufacture head-and-shoulders", () => {
  const breakout = classifyDirectionalMarketStructure([
    ...reference,
    { high: 109, low: 104, close: 107 },
    { high: 112, low: 107, close: 111 },
  ], "LONG");
  assert.equal(breakout.breakoutConfirmed, true);
  assert.doesNotMatch(breakout.label, /头肩/);
});
