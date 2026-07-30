import assert from "node:assert/strict";
import test from "node:test";
import {
  applyBeijingForecastDateRoll,
  filterStrictBeijingToday,
} from "../lib/data/daily-forecast-date-roll.ts";
import { getPublicTodayForecasts } from "../lib/data/daily-forecasts.ts";
import {
  calculateWaveWeight,
  nearestLevelDistancePct,
  waveWeightFromProximity,
  WAVE_BASE_WEIGHT,
  WAVE_MAX_WEIGHT,
} from "../lib/wave/scoring.ts";
import type { DailyForecast } from "../types/daily-forecast.ts";

const base: DailyForecast = {
  id: "DAILY-BTC-TEST",
  assetId: "bitcoin",
  assetName: "比特币",
  symbol: "BTC",
  market: "crypto",
  forecastForDate: "2026-07-29",
  tradingSessionLabel: "北京时间自然日",
  publishedAt: "2026-07-28T18:30:00+08:00",
  accessLevel: "public",
  status: "published",
  version: 1,
  direction: "看涨",
  confidence: 55,
  summary: "test",
  reviewedBy: "admin",
  reviewedAt: "2026-07-28T18:30:00+08:00",
  publishedBy: "admin",
};

test("wave proximity steps 5 → 10 → 15 → 20", () => {
  assert.equal(waveWeightFromProximity(null), 0.05);
  assert.equal(waveWeightFromProximity(6), 0.05);
  assert.equal(waveWeightFromProximity(5), 0.08);
  assert.equal(waveWeightFromProximity(3), 0.12);
  assert.equal(waveWeightFromProximity(1.5), 0.15);
  assert.equal(waveWeightFromProximity(0.4), 0.2);
  assert.equal(WAVE_BASE_WEIGHT, 0.05);
  assert.equal(WAVE_MAX_WEIGHT, 0.2);
});

test("wave weight never exceeds 20%", () => {
  const w = calculateWaveWeight({
    total: 100,
    wins: 90,
    partials: 5,
    recentWins: 20,
    recentPartials: 2,
    recentTotal: 30,
    proximityDistancePct: 0.1,
    maxWeight: 0.2,
  });
  assert.ok(w <= 0.2);
});

test("nearest level distance percent", () => {
  assert.equal(nearestLevelDistancePct(100, [98, 105]), 2);
  assert.equal(nearestLevelDistancePct(null, [98]), null);
});

test("beijing date roll no longer masquerades older cohorts as today", () => {
  const now = new Date("2026-07-31T01:00:00+08:00");
  const rolled = applyBeijingForecastDateRoll(
    [
      { ...base, forecastForDate: "2026-07-28" },
      { ...base, id: "DAILY-BTC-0729", forecastForDate: "2026-07-29" },
    ],
    now
  );
  assert.equal(rolled.find((f) => f.id === "DAILY-BTC-0729")?.forecastForDate, "2026-07-29");
  assert.equal(rolled.find((f) => f.id === "DAILY-BTC-TEST")?.forecastForDate, "2026-07-28");
  assert.equal(filterStrictBeijingToday(rolled, now).length, 0);
});

test("public today only returns exact beijing today keys", () => {
  const now = new Date("2026-07-29T09:00:00+08:00");
  const today = getPublicTodayForecasts(now);
  assert.ok(today.every((f) => f.forecastForDate === "2026-07-29"));
});

test("old cohort does not become today after midnight", () => {
  const now = new Date("2026-07-30T00:30:00+08:00");
  const today = getPublicTodayForecasts(now);
  assert.ok(today.every((f) => f.forecastForDate === "2026-07-30"));
  // curated seed has no 07-30 batch → empty or only exact matches
  assert.equal(
    today.some((f) => f.forecastForDate === "2026-07-28" || f.forecastForDate === "2026-07-29"),
    false
  );
});
