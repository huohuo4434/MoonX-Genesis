import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getBeijingTodayKey, getBeijingTomorrowKey } from "../lib/calendar/beijing-date.ts";
import {
  buildTomorrowPublicSummary,
  getPublicTodayForecasts,
  getTomorrowCoreForecasts,
  isHumanPublishedForecast,
} from "../lib/data/daily-forecasts.ts";
import { PUBLISHED_DAILY_FORECASTS } from "../lib/data/published-daily-forecasts-20260728.ts";

describe("published Jul 28/29 daily forecasts", () => {
  const now = new Date("2026-07-28T12:00:00+08:00");

  test("beijing today/tomorrow keys", () => {
    assert.equal(getBeijingTodayKey(now), "2026-07-28");
    assert.equal(getBeijingTomorrowKey(now), "2026-07-29");
  });

  test("fourteen curated records exist with locked ids", () => {
    assert.equal(PUBLISHED_DAILY_FORECASTS.length, 14);
    assert.ok(PUBLISHED_DAILY_FORECASTS.every((f) => isHumanPublishedForecast(f)));
  });

  test("today public shows seven assets for 2026-07-28", () => {
    const today = getPublicTodayForecasts(now);
    assert.equal(today.length, 7);
    assert.deepEqual(
      today.map((f) => f.symbol),
      ["BTC", "SPX", "NDX", "000001.SS", "HSTECH", "GLD", "WTI"]
    );
    const btc = today.find((f) => f.symbol === "BTC")!;
    assert.equal(btc.accuracyEligible, false);
    assert.equal(btc.directionLabel, "震荡上涨");
    const spx = today.find((f) => f.symbol === "SPX")!;
    const ndx = today.find((f) => f.symbol === "NDX")!;
    assert.notEqual(spx.summary, ndx.summary);
    assert.ok(/宽度|金融|工业|消费/.test(spx.summary));
    assert.equal(spx.accuracyEligible, false);
    const wti = today.find((f) => f.symbol === "WTI")!;
    assert.equal(wti.assetName, "WTI原油");
    assert.equal(wti.accuracyEligible, false);
  });

  test("tomorrow member shows seven published assets for 2026-07-29", () => {
    const tomorrow = getTomorrowCoreForecasts(now);
    assert.equal(tomorrow.length, 7);
    assert.ok(tomorrow.every((f) => isHumanPublishedForecast(f)));
    assert.ok(tomorrow.every((f) => f.forecastForDate === "2026-07-29"));
    const summary = buildTomorrowPublicSummary(now);
    assert.equal(summary.allDraft, false);
    assert.equal(summary.publishedCount, 7);
    assert.equal(summary.nextDateIso, "2026-07-29");
  });

  test("Jul 29 records auto become today when Beijing date rolls", () => {
    const nextDay = new Date("2026-07-29T08:00:00+08:00");
    const today = getPublicTodayForecasts(nextDay);
    assert.equal(today.length, 7);
    assert.ok(today.every((f) => f.forecastForDate === "2026-07-29"));
  });
});
