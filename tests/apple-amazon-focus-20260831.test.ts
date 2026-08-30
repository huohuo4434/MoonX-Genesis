import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLE_AMAZON_LIUYAO_FORECASTS_20260831,
  APPLE_AMAZON_LIUYAO_SOURCE_META_20260831,
  listAppleAmazonLiuyaoForecasts20260831,
} from "../lib/data/conviction/apple-amazon-liuyao-20260831";
import { getConvictionWeeklyFreshnessOverview } from "../lib/data/conviction/admin-weekly-freshness";
import { focusDailyChanCapability, focusDailyQuoteCapability } from "../lib/data/conviction/focus-daily-generation-core";
import { STATIC_FOCUS_ASSET_IDS, STATIC_MEMBER_AUTOMATION_FOCUS } from "../lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { buildSectorResonanceBoard } from "../lib/data/conviction/sector-resonance-board";
import { CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed";
import { buildMemberKeyDateRadar } from "../lib/data/member-key-date-radar";

const LABELS = [
  "月令六亲流派（主判）",
  "动爻节奏流派（复核）",
  "用神强弱流派（复核）",
  "卦象取形流派（复核）",
];

test("苹果和亚马逊四张原盘按前瞻周期锁定且可追溯", () => {
  assert.equal(APPLE_AMAZON_LIUYAO_FORECASTS_20260831.length, 4);
  assert.equal(APPLE_AMAZON_LIUYAO_SOURCE_META_20260831.aapl.annual.sourceFile, "苹果/2026.jpg");
  assert.equal(APPLE_AMAZON_LIUYAO_SOURCE_META_20260831.aapl.monthly.sourceFile, "苹果/9月.jpg");
  assert.equal(APPLE_AMAZON_LIUYAO_SOURCE_META_20260831.amzn.annual.sourceFile, "亚马逊/2026.jpg");
  assert.equal(APPLE_AMAZON_LIUYAO_SOURCE_META_20260831.amzn.monthly.sourceFile, "亚马逊/9月.jpg");
  assert.ok(APPLE_AMAZON_LIUYAO_FORECASTS_20260831.every((row) => row.status === "published" && row.validationStatus === "UNVERIFIED"));
  assert.ok(APPLE_AMAZON_LIUYAO_FORECASTS_20260831.filter((row) => row.forecastType === "YEAR_1").every((row) => row.periodStart === "2026-08-31"), "annual charts must not backfill January-August");
  assert.deepEqual(listAppleAmazonLiuyaoForecasts20260831("aapl").map((row) => row.direction), ["先涨后跌", "先跌后涨"]);
  assert.deepEqual(listAppleAmazonLiuyaoForecasts20260831("amzn").map((row) => row.direction), ["先涨后跌", "先跌后涨"]);
});

test("四种方法匿名展示并真实保留一致与分歧", () => {
  for (const row of APPLE_AMAZON_LIUYAO_FORECASTS_20260831) {
    assert.deepEqual(row.methodViews?.map((view) => view.label), LABELS);
    assert.doesNotMatch(JSON.stringify(row.methodViews), /丙午|狼叔|万里|秋六爻/);
  }
  const amazonAnnual = listAppleAmazonLiuyaoForecasts20260831("amzn").find((row) => row.forecastType === "YEAR_1");
  assert.deepEqual(amazonAnnual?.methodViews?.map((view) => view.direction), ["先涨后跌", "先涨后跌", "震荡上涨", "先涨后跌"]);
  assert.equal(amazonAnnual?.consensusStars, 3, "one auxiliary disagreement must remain visible");
  for (const assetId of ["aapl", "amzn"] as const) {
    const monthly = listAppleAmazonLiuyaoForecasts20260831(assetId).find((row) => row.forecastType === "MONTH_1");
    assert.equal(monthly?.methodViews?.every((view) => view.direction === "先跌后涨"), true);
    assert.equal(monthly?.calendarMonthPath?.length, 5);
    assert.ok(monthly?.calendarMonthPath?.every((row) => /不是独立周卦/.test(row.sourceNote ?? "")));
  }
});

test("两只股票进入重点关注和大型科技共振，但不获得自动交易权限", () => {
  const seedSlugs = new Set(CONVICTION_ASSET_SEED.map((row) => row.slug));
  for (const assetId of ["aapl", "amzn"] as const) {
    assert.equal(STATIC_FOCUS_ASSET_IDS.includes(assetId), true);
    assert.equal(seedSlugs.has(assetId), true);
    assert.equal(STATIC_MEMBER_AUTOMATION_FOCUS[assetId].canonicalSymbol, null);
    assert.deepEqual(listStaticFocusForecasts(assetId).map((row) => row.forecastType), ["YEAR_1", "MONTH_1"]);
  }

  const board = buildSectorResonanceBoard();
  for (const symbol of ["AAPL", "AMZN"]) {
    const row = board.rows.find((item) => item.symbol === symbol);
    assert.equal(row?.group, "大型科技");
    assert.equal(row?.cells[0]?.sourceKind, "MISSING");
    assert.ok(row?.cells.slice(1).every((cell) => cell.sourceKind === "MONTHLY_CONTEXT"));
    assert.ok(row?.cells.slice(1).every((cell) => /不是独立周卦/.test(cell.sourceLabel)));
    assert.equal(row?.monthlyLiuyaoDetail?.direction, "先跌后涨");
    assert.equal(row?.annualLiuyaoDetail?.direction, "先涨后跌");
  }
});

test("行情与缠论可读，周卦缺失仍失败关闭", () => {
  assert.deepEqual(focusDailyQuoteCapability({ symbol: "AAPL", assetType: "STOCK", exchange: "NASDAQ" }), { available: true, market: "US", quoteSymbol: "AAPL", reason: null });
  assert.deepEqual(focusDailyQuoteCapability({ symbol: "AMZN", assetType: "STOCK", exchange: "NASDAQ" }), { available: true, market: "US", quoteSymbol: "AMZN", reason: null });
  assert.equal(focusDailyChanCapability("AAPL").instrument, "AAPL");
  assert.equal(focusDailyChanCapability("AMZN").instrument, "AMZN");

  const freshness = getConvictionWeeklyFreshnessOverview(new Date("2026-08-31T08:00:00+08:00"));
  assert.equal(freshness.affectedAssets.includes("苹果"), false);
  assert.equal(freshness.affectedAssets.includes("亚马逊"), false);

  for (const assetId of ["aapl", "amzn"]) {
    const rows = buildMemberKeyDateRadar("2026-08-31").filter((row) => row.assetId === assetId);
    assert.ok(rows.some((row) => row.level === "MONTH"));
    const weekly = rows.find((row) => row.level === "WEEK");
    assert.match(weekly?.primaryView ?? "", /月卦当周推演方向/);
    assert.doesNotMatch(weekly?.primaryView ?? "", /周卦正式方向/);
  }
});
