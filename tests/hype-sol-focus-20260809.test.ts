import test from "node:test";
import assert from "node:assert/strict";
import { CONVICTION_ASSET_SEED, CONVICTION_ASSETS_MAX } from "../lib/data/conviction/seed";
import {
  listHypePeriodForecasts20260809,
  listSolPeriodForecasts20260809,
} from "../lib/data/conviction/hype-sol-20260809";
import { WATCHLIST_TEASERS } from "../lib/data/conviction/watchlist-teasers";
import { buildWatchlistResonanceRanking } from "../lib/data/conviction/resonance-ranking";

type PeriodRows = ReturnType<typeof listHypePeriodForecasts20260809>;

function latestByType(items: PeriodRows, type: string) {
  return items
    .filter((item) => item.forecastType === type && item.status === "published")
    .sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt))[0];
}

test("HYPE keeps old audit rows while the dual-teacher publications become latest", () => {
  const periods = listHypePeriodForecasts20260809();
  assert.ok(
    periods.some((item) => item.id === "HYPE-W1-20260731-V1" || item.periodStart === "2026-07-31"),
    "old HYPE record must remain auditable",
  );
  assert.equal(latestByType(periods, "WEEK_2")?.direction, "震荡下跌");
  assert.equal(latestByType(periods, "WEEK_3")?.direction, "先跌后涨");
  assert.equal(latestByType(periods, "WEEK_4")?.direction, "上涨");
  assert.ok(periods.some((item) => item.id === "HYPE-W2-20260809-V3"), "pre-V6 HYPE week remains auditable");
});

test("HYPE Sep-Dec route reflects the confirmed two-teacher monthly path", () => {
  const row = latestByType(listHypePeriodForecasts20260809(), "MONTH_3");
  assert.equal(row?.id, "HYPE-AUTUMN-20260901-V6");
  assert.deepEqual(row?.calendarMonthPath?.map((item) => [item.period, item.direction]), [
    ["2026-09", "震荡下跌"],
    ["2026-10", "上涨"],
    ["2026-11", "下跌"],
    ["2026-12", "震荡下跌"],
  ]);
});

test("SOL publishes the confirmed weekly, monthly and long-horizon route", () => {
  const periods = listSolPeriodForecasts20260809();
  assert.equal(latestByType(periods, "WEEK")?.direction, "震荡上涨");
  assert.equal(latestByType(periods, "WEEK_2")?.direction, "冲高回落");
  assert.equal(latestByType(periods, "WEEK_3")?.direction, "上涨");
  assert.equal(latestByType(periods, "MONTH_1")?.direction, "上涨");
  assert.equal(latestByType(periods, "YEAR_1")?.direction, "震荡下跌");
  assert.equal(latestByType(periods, "YEAR_3")?.direction, "震荡上涨");
  assert.ok(periods.some((item) => item.id === "SOL-W1-20260809-V2"), "pre-V3 SOL week remains auditable");
});

test("SOL is published and its research timestamp advances to the dual-teacher release", () => {
  const sol = CONVICTION_ASSET_SEED.find((item) => item.slug === "sol");
  const hype = CONVICTION_ASSET_SEED.find((item) => item.slug === "hype");
  assert.ok(sol);
  assert.ok(hype);
  assert.equal(sol.symbol, "SOL");
  assert.equal(sol.isPublished, true);
  assert.equal(sol.researchUpdatedAt, "2026-08-10");
  assert.equal(hype.researchUpdatedAt, "2026-08-10");
  assert.ok(CONVICTION_ASSET_SEED.length <= CONVICTION_ASSETS_MAX);
});

test("target-week ranking consumes the new publications instead of stale pre-review directions", () => {
  const ranking = buildWatchlistResonanceRanking("2026-08-09");
  const hype = ranking.find((item) => item.slug === "hype");
  const sol = ranking.find((item) => item.slug === "sol");
  assert.ok(hype);
  assert.ok(sol);
  assert.equal(hype.targetPeriodStart, "2026-08-10");
  assert.equal(sol.targetPeriodStart, "2026-08-10");
  assert.equal(sol.direction, "BULLISH");
  assert.equal(sol.hasWeeklyVote, true);
  assert.ok(sol.sameDirectionPeriods >= 2, "SOL weekly/monthly bullish agreement should be visible to ranking");
  assert.match(sol.evidenceZh.join(" | "), /目标周周卦：看涨/);
  assert.match(sol.evidenceZh.join(" | "), /月卦：看涨/);
  assert.match(hype.evidenceZh.join(" | "), /目标周周卦：看跌/);
});

test("HYPE and SOL public teaser copy stays hook-only and does not reveal member direction", () => {
  for (const slug of ["hype", "sol"]) {
    const teaser = WATCHLIST_TEASERS.find((item) => item.slug === slug);
    assert.ok(teaser);
    const copy = [teaser.eyebrowZh, teaser.headlineZh, teaser.hookZh, teaser.coverageZh, ...teaser.lockedPreviewZh].join(" | ");
    assert.equal(/看涨|看跌|唯一方向|周卦：|月卦：/.test(copy), false, `${slug} public copy leaks member direction`);
  }
});
