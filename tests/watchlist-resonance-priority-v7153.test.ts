import assert from "node:assert/strict";
import test from "node:test";
import { evaluateResonanceVotes, targetWeekWindow } from "../lib/data/conviction/resonance-core";
import { buildWatchlistResonanceRanking } from "../lib/data/conviction/resonance-ranking";

test("Sunday Aug 9 ranks the Aug 10-16 target week", () => {
  assert.deepEqual(targetWeekWindow("2026-08-09"), {
    start: "2026-08-10",
    end: "2026-08-16",
    labelZh: "08/10–08/16",
  });
});

test("bullish and bearish four-horizon resonance have identical priority", () => {
  const bull = evaluateResonanceVotes([
    { label: "目标周周卦", direction: "BULLISH", weight: 50, horizon: "WEEK" },
    { label: "月卦", direction: "BULLISH", weight: 30, horizon: "MONTH" },
    { label: "3个月卦", direction: "BULLISH", weight: 18, horizon: "LONG" },
    { label: "1年卦", direction: "BULLISH", weight: 10, horizon: "LONG" },
  ]);
  const bear = evaluateResonanceVotes([
    { label: "目标周周卦", direction: "BEARISH", weight: 50, horizon: "WEEK" },
    { label: "月卦", direction: "BEARISH", weight: 30, horizon: "MONTH" },
    { label: "3个月卦", direction: "BEARISH", weight: 18, horizon: "LONG" },
    { label: "1年卦", direction: "BEARISH", weight: 10, horizon: "LONG" },
  ]);
  assert.equal(bull.strengthZh, "极强共振");
  assert.equal(bear.strengthZh, "极强共振");
  assert.equal(bull.score, bear.score);
});

test("week-month disagreement is always unclear instead of averaged", () => {
  const result = evaluateResonanceVotes([
    { label: "目标周周卦", direction: "BULLISH", weight: 50, horizon: "WEEK" },
    { label: "月卦", direction: "BEARISH", weight: 30, horizon: "MONTH" },
    { label: "3个月卦", direction: "BULLISH", weight: 18, horizon: "LONG" },
  ]);
  assert.equal(result.direction, "UNCLEAR");
  assert.equal(result.strengthZh, "方向冲突");
});

test("long-horizon-only agreement cannot outrank week-month resonance", () => {
  const weekly = evaluateResonanceVotes([
    { label: "目标周周卦", direction: "BULLISH", weight: 50, horizon: "WEEK" },
    { label: "月卦", direction: "BULLISH", weight: 30, horizon: "MONTH" },
  ]);
  const longOnly = evaluateResonanceVotes([
    { label: "月卦", direction: "BULLISH", weight: 30, horizon: "MONTH" },
    { label: "3个月卦", direction: "BULLISH", weight: 18, horizon: "LONG" },
    { label: "1年卦", direction: "BULLISH", weight: 10, horizon: "LONG" },
  ]);
  assert.equal(weekly.strengthZh, "强共振");
  assert.equal(longOnly.hasWeeklyVote, false);
  assert.ok(weekly.score > longOnly.score);
});

test("real watchlist ranking targets Aug 10-16 and is sorted by resonance score", () => {
  const ranking = buildWatchlistResonanceRanking("2026-08-09");
  assert.ok(ranking.length >= 10);
  for (const item of ranking) {
    assert.equal(item.targetPeriodStart, "2026-08-10");
    assert.equal(item.targetPeriodEnd, "2026-08-16");
  }
  for (let i = 1; i < ranking.length; i += 1) {
    assert.ok(ranking[i - 1]!.score >= ranking[i]!.score);
  }
  assert.deepEqual(ranking.slice(0, 4).map((item) => item.slug), ["spcx", "btc", "msft", "googl"]);
  const google = ranking.find((item) => item.slug === "googl");
  assert.ok(google);
  assert.equal(google.direction, "BULLISH");
  assert.equal(google.hasWeeklyVote, true);
  assert.ok(google.sameDirectionPeriods >= 2);
  const eth = ranking.find((item) => item.slug === "eth");
  assert.ok(eth);
  assert.equal(eth.direction, "UNCLEAR");
  assert.equal(eth.strengthZh, "方向冲突");
});
