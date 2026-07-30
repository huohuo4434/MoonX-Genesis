import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CHANGXIN_DAILY_FORECASTS,
  CHANGXIN_IPO_HIGH_VOL_DATES,
  CHANGXIN_STOCK,
  CHANGXIN_WEEKLY_ANALYSES,
} from "../lib/data/member-stocks/changxin-688825";
import {
  applyStockDailyPriceOverlay,
  applyStockWeeklyPriceOverlay,
} from "../lib/data/apply-price-overlays";
import { capIpoConfidence, isIpoHighVolatilityDate } from "../lib/data/member-stocks/ipo-rules";
import {
  validateMemberStockDailyPublish,
  validateMemberStockWeeklyPublish,
} from "../lib/data/member-stocks/publish-rules";
import { buildWeeklyPublicSummary } from "../lib/data/weekly-analysis";

describe("member benefit stock — 长鑫科技", () => {
  test("stock identity", () => {
    assert.equal(CHANGXIN_STOCK.stockId, "688825");
    assert.equal(CHANGXIN_STOCK.name, "长鑫科技");
    assert.equal(CHANGXIN_STOCK.symbol, "688825");
  });

  test("first 5 sessions marked high-vol", () => {
    assert.equal(CHANGXIN_IPO_HIGH_VOL_DATES.length, 5);
    assert.ok(isIpoHighVolatilityDate("688825", "2026-07-28"));
    assert.equal(capIpoConfidence("688825", "2026-07-28", 80), 60);
  });

  test("published forecasts have formal directions and no 观望", () => {
    for (const raw of CHANGXIN_DAILY_FORECASTS) {
      const f = applyStockDailyPriceOverlay(raw);
      assert.equal(f.status, "published");
      assert.ok(f.primaryDirection);
      assert.ok(f.closingBias);
      assert.ok(f.pathDirection);
      assert.equal(f.accuracyEligible, true);
      assert.equal(/观望|观察承接|不预设立场/.test(`${f.direction}${f.headline}${f.expectedPath}`), false);
      assert.deepEqual(validateMemberStockDailyPublish(f), []);
      assert.ok(f.keySupport.length > 0 && /\d/.test(f.keySupport[0]!));
      assert.ok(f.keyResistance.length > 0 && /\d/.test(f.keyResistance[0]!));
    }
    for (const raw of CHANGXIN_WEEKLY_ANALYSES) {
      const w = applyStockWeeklyPriceOverlay(raw);
      assert.equal(w.primaryDirection, "先涨后跌");
      assert.equal(w.closingBias, "偏弱");
      assert.ok(w.overallDirection.includes("先涨后跌"));
      assert.equal(/观望|观察承接/.test(`${w.headline}${w.weeklyPath}`), false);
      assert.deepEqual(validateMemberStockWeeklyPublish(w), []);
    }
  });

  test("today and tomorrow labels", () => {
    const today = CHANGXIN_DAILY_FORECASTS.find((f) => f.forecastDate === "2026-07-28");
    const tom = CHANGXIN_DAILY_FORECASTS.find((f) => f.forecastDate === "2026-07-29");
    assert.equal(today?.direction, "区间震荡，略偏上涨");
    assert.equal(tom?.direction, "区间震荡，略偏上涨");
  });
});

describe("weekly time label", () => {
  test("publishedAtLabel does not duplicate 北京时间", () => {
    const summary = buildWeeklyPublicSummary();
    const matches = summary.publishedAtLabel.match(/北京时间/g) ?? [];
    assert.ok(matches.length <= 1, summary.publishedAtLabel);
    assert.equal(summary.publishedAtLabel.includes("（北京时间）（北京时间）"), false);
  });
});
