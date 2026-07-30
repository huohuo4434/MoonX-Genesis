import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyDailyPriceOverlay, getBtcJul27BeijingLevels } from "../lib/data/apply-price-overlays.ts";
import { listDailyForecasts } from "../lib/data/daily-forecasts.ts";
import { listPublishedWeeklyAnalyses } from "../lib/data/weekly-analysis.ts";
import { BANNED_FUZZY, formatAssetPrice, roundBtcUsd, validatePublishedPriceLevels } from "../lib/market-data/price-levels.ts";
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
    assert.equal(BANNED_FUZZY.test(f.invalidation ?? ""), false);
    assert.deepEqual(
      validatePublishedPriceLevels({
        supportLevels: f.supportLevels,
        resistanceLevels: f.resistanceLevels,
        invalidation: f.invalidation,
        confirmation: f.confirmation,
        priceSnapshot: f.priceSnapshot,
      }),
      []
    );
  });

  test("published daily overlays strip fuzzy phrases", () => {
    const now = new Date("2026-07-28T12:00:00+08:00");
    const list = listDailyForecasts(now).filter((f) => f.status === "published" || f.forecastForDate === "2026-07-28");
    let fixed = 0;
    for (const f of list) {
      if (!f.supportLevels?.length) continue;
      fixed += 1;
      assert.equal(BANNED_FUZZY.test(`${f.invalidation}${f.supportLevels.join("")}${f.resistanceLevels?.join("")}`), false);
    }
    assert.ok(fixed >= 7);
  });

  test("weekly published has concrete supports", () => {
    const w = listPublishedWeeklyAnalyses();
    for (const a of w) {
      assert.ok((a.keySupport?.length ?? 0) > 0);
      assert.ok(/\d/.test(a.keySupport![0]!));
      assert.equal(BANNED_FUZZY.test(a.invalidation), false);
    }
  });
});
