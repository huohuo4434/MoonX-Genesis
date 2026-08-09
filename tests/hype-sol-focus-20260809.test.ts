import test from "node:test";
import assert from "node:assert/strict";
import { CONVICTION_ASSET_SEED, CONVICTION_ASSETS_MAX } from "../lib/data/conviction/seed";
import {
  listHypePeriodForecasts20260809,
  listSolPeriodForecasts20260809,
} from "../lib/data/conviction/hype-sol-20260809";
import { WATCHLIST_TEASERS } from "../lib/data/conviction/watchlist-teasers";
import { buildWatchlistResonanceRanking } from "../lib/data/conviction/resonance-ranking";

function latestByIdPrefix(items: ReturnType<typeof listHypePeriodForecasts20260809>, id: string) {
  return items.find((item) => item.id === id);
}

test("HYPE update keeps old audit records and adds the new three-week route", () => {
  const periods = listHypePeriodForecasts20260809();
  assert.ok(periods.some((item) => item.id === "HYPE-W1-20260731-V1" || item.periodStart === "2026-07-31"), "old HYPE record must remain auditable");
  assert.equal(latestByIdPrefix(periods, "HYPE-W2-20260809-V3")?.direction, "上涨");
  assert.equal(latestByIdPrefix(periods, "HYPE-W3-20260817-V3")?.direction, "下跌");
  assert.equal(latestByIdPrefix(periods, "HYPE-W4-20260823-V3")?.direction, "上涨");
});

test("HYPE year roadmap contains the new Sep-Dec monthly path without overwriting prior year versions", () => {
  const periods = listHypePeriodForecasts20260809();
  const year = periods.find((item) => item.id === "HYPE-Y1-20260731-V3");
  assert.ok(year);
  assert.deepEqual(year.calendarMonthPath?.map((item) => [item.period, item.direction]), [
    ["2026-09", "下跌"],
    ["2026-10", "震荡下跌"],
    ["2026-11", "下跌"],
    ["2026-12", "震荡上涨"],
  ]);
  assert.ok(periods.some((item) => item.forecastType === "YEAR_1" && item.version < 3), "older HYPE year version must remain");
});

test("SOL publishes a complete new watchlist research route", () => {
  const periods = listSolPeriodForecasts20260809();
  const week = periods.find((item) => item.forecastType === "WEEK");
  const week2 = periods.find((item) => item.forecastType === "WEEK_2");
  const week3 = periods.find((item) => item.forecastType === "WEEK_3");
  const month = periods.find((item) => item.forecastType === "MONTH_1");
  assert.equal(week?.direction, "冲高回落");
  assert.equal(week2?.direction, "先跌后涨");
  assert.equal(week3?.direction, "上涨");
  assert.equal(month?.direction, "上涨");
  assert.ok(periods.some((item) => item.forecastType === "YEAR_1" && item.direction === "震荡下跌"));
  assert.ok(periods.some((item) => item.forecastType === "YEAR_3" && item.direction === "震荡上涨"));
  assert.ok(periods.some((item) => item.forecastType === "YEAR_10" && item.direction === "震荡"));
});

test("SOL is a real published conviction asset without exceeding the watchlist cap", () => {
  const sol = CONVICTION_ASSET_SEED.find((item) => item.slug === "sol");
  assert.ok(sol);
  assert.equal(sol.symbol, "SOL");
  assert.equal(sol.isPublished, true);
  assert.equal(sol.researchUpdatedAt, "2026-08-09");
  assert.ok(CONVICTION_ASSET_SEED.length <= CONVICTION_ASSETS_MAX);
});

test("target-week ranking includes updated HYPE and SOL and does not fake resonance across conflicting cycles", () => {
  const ranking = buildWatchlistResonanceRanking("2026-08-09");
  const hype = ranking.find((item) => item.slug === "hype");
  const sol = ranking.find((item) => item.slug === "sol");
  assert.ok(hype);
  assert.ok(sol);
  assert.equal(hype.targetPeriodStart, "2026-08-10");
  assert.equal(sol.targetPeriodStart, "2026-08-10");
  assert.equal(sol.direction, "UNCLEAR");
  assert.equal(sol.strengthZh, "方向冲突");
  assert.match(sol.evidenceZh.join(" | "), /目标周周卦：看跌/);
  assert.match(sol.evidenceZh.join(" | "), /月卦：看涨/);
});

test("HYPE and SOL public teaser copy stays hook-only and does not reveal direction", () => {
  for (const slug of ["hype", "sol"]) {
    const teaser = WATCHLIST_TEASERS.find((item) => item.slug === slug);
    assert.ok(teaser);
    const copy = [teaser.eyebrowZh, teaser.headlineZh, teaser.hookZh, teaser.coverageZh, ...teaser.lockedPreviewZh].join(" | ");
    assert.equal(/看涨|看跌|唯一方向|周卦：|月卦：/.test(copy), false, `${slug} public copy leaks member direction`);
  }
});
