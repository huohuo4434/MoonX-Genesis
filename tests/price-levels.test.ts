import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyDailyPriceOverlay, getBtcJul27BeijingLevels } from "../lib/data/apply-price-overlays.ts";
import { listDailyForecasts } from "../lib/data/daily-forecasts.ts";
import { listPublishedWeeklyAnalyses } from "../lib/data/weekly-analysis.ts";
import { formatAssetPrice, roundBtcUsd } from "../lib/market-data/price-levels.ts";
import { PUBLISHED_DAILY_FORECASTS } from "../lib/data/published-daily-forecasts-20260728.ts";

describe("locked price levels", () => {
  test("BTC Jul 27 Beijing high/low rounded to $10", () => {
    const b = getBtcJul27BeijingLevels();
    assert.equal(roundBtcUsd(b.highRaw), 65640);
    assert.equal(roundBtcUsd(b.lowRaw), 64370);
    assert.equal(formatAssetPrice(b.lowRaw, "BTC").display, "64,370美元");
    assert.equal(formatAssetPrice(b.highRaw, "BTC").display, "65,640美元");
  });

  test("DAILY-BTC-20260728-V1 has concrete invalidation", () => {
    const raw = PUBLISHED_DAILY_FORECASTS.find((f) => f.id === "DAILY-BTC-20260728-V1")!;
    const f = applyDailyPriceOverlay(raw);
    assert.match(f.invalidation ?? "", /64,370美元/);
    assert.match(f.invalidation ?? "", /1小时K线收盘/);
    assert.match(f.supportLevels?.[0] ?? "", /64,370/);
    assert.match(f.resistanceLevels?.[0] ?? "", /65,640/);
  });

  test("locked Jul 28 daily overlays retain concrete historical levels", () => {
    const now = new Date("2026-07-28T12:00:00+08:00");
    const list = listDailyForecasts(now).filter((f) => f.forecastForDate === "2026-07-28");
    let fixed = 0;
    for (const f of list) {
      if (!f.supportLevels?.length) continue;
      fixed += 1;
      assert.match(f.supportLevels.join(""), /\d/);
      assert.match(f.resistanceLevels?.join("") ?? "", /\d/);
      assert.match(f.invalidation ?? "", /\d/);
    }
    assert.ok(fixed >= 7);
  });

  test("weekly direction records never fabricate missing technical supports", () => {
    const w = listPublishedWeeklyAnalyses();
    for (const a of w) {
      assert.ok(a.overallDirection.length > 0);
      assert.ok(a.invalidation.length > 0);
      for (const level of a.keySupport ?? []) assert.match(level, /\d/);
    }
  });
});
