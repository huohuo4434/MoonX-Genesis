import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";
import {
  buildWeeklyDerivedFallbackForMarket,
  PUBLIC_FALLBACK_MARKETS,
} from "../lib/forecasts/public-daily-fallback.ts";
import {
  CORE_DAILY_MARKETS,
  generateCoreMarketFromWeeklyPure,
  generateCoreMarketsFromWeeklyPure,
} from "../lib/forecasts/daily-pipeline.ts";
import { isTradingDay } from "../lib/calendar/next-trading-day.ts";
import { marketMeta } from "../lib/forecasts/weekly-to-daily.ts";

const WEEK_DATES = [
  "2026-08-17",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
  "2026-08-22",
  "2026-08-23",
] as const;

test("current target week has all nine weekly-derived daily rows", () => {
  for (const date of ["2026-08-17", "2026-08-18"] as const) {
    const rows = generateCoreMarketsFromWeeklyPure(date, "LOCKED");
    assert.equal(rows.length, 9, `${date} should have nine core markets`);
    assert.deepEqual(
      rows.map((row) => row.marketCode).sort(),
      [...CORE_DAILY_MARKETS].sort()
    );
  }
});

test("single-market generator isolates failures instead of blanking the batch", () => {
  for (const market of CORE_DAILY_MARKETS) {
    const row = generateCoreMarketFromWeeklyPure(market, "2026-08-17", "LOCKED");
    assert.ok(row, `${market} should have a current-week source`);
    assert.equal(row!.marketCode, market);
  }
});

test("fallback reads the canonical weekly loader and covers all valid sessions", () => {
  let validSessionCount = 0;
  for (const date of WEEK_DATES) {
    for (const market of PUBLIC_FALLBACK_MARKETS) {
      const meta = marketMeta(market);
      const row = buildWeeklyDerivedFallbackForMarket(market, date, "member");
      if (isTradingDay(meta.legacyMarket, date)) {
        validSessionCount += 1;
        assert.ok(row, `${market}:${date} should be available`);
      } else {
        assert.equal(row, null, `${market}:${date} must not fabricate a closed-market row`);
      }
    }
  }
  assert.equal(validSessionCount, 49);
});

test("today loader merges partial persistence with the complete fallback batch", () => {
  const source = readFileSync(resolve("lib/prediction-access-server.ts"), "utf8");
  assert.doesNotMatch(source, /persisted\.length\s*\?\s*persisted\s*:/);
  assert.match(source, /for \(const row of persisted\)/);
  assert.match(source, /generateCoreMarketsFromWeeklyPure\(today, "LOCKED"\)/);
  assert.match(source, /generateCoreMarketFromWeeklyPure\(/);
});

test("fallback does not freeze the source list at July or early August", () => {
  const source = readFileSync(resolve("lib/forecasts/public-daily-fallback.ts"), "utf8");
  assert.match(source, /listAllWeeklyAnalyses\(\)/);
  assert.doesNotMatch(source, /ALL_WEEKLY_ANALYSES,\s*\.\.\.PUBLISHED_WEEKLY_ANALYSES_20260803/);
});
