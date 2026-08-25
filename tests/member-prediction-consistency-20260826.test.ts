import assert from "node:assert/strict";
import test from "node:test";
import { getBtcEthCycleBundle } from "../lib/data/crypto-cycle-comparison-20260801";
import { listLatestStaticFocusForecastsByType, listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as monthly } from "../lib/data/member-september-rotation-report-20260826";
import { findTeacherPriorityLiuyaoSource } from "../lib/data/teacher-priority-liuyao-20260821";
import { getAnnualForecastRoadmap2026 } from "../lib/research/annual-forecast-roadmap-2026";
import { MONTHLY_MARKET_OUTLOOKS_202609, MONTHLY_MARKET_OUTLOOKS_202609_ARCHIVED_REVISIONS } from "../lib/data/monthly-market-outlook-202609";
import { generateCoreMarketFromWeeklyPure } from "../lib/forecasts/daily-pipeline";

function byType(assetId: "btc" | "eth", type: string) {
  return listLatestStaticFocusForecastsByType(assetId).find((row) => row.forecastType === type);
}

test("all member BTC/ETH surfaces select the same latest September revisions", () => {
  const btc = byType("btc", "MONTH_1");
  const eth = byType("eth", "MONTH_1");
  assert.equal(btc?.id, "BTC-SEP-20260823-V3");
  assert.equal(eth?.id, "ETH-YOU-20260823-V2");
  assert.equal(btc?.direction, "先涨后跌");
  assert.equal(eth?.direction, "先涨后跌");

  const bundle = getBtcEthCycleBundle();
  assert.equal(bundle.btc.find((row) => row.forecastType === "MONTH_1")?.id, btc?.id);
  assert.equal(bundle.eth.find((row) => row.forecastType === "MONTH_1")?.id, eth?.id);
  assert.ok(bundle.alignments.some((row) =>
    row.id === "BTC-ETH-ALIGN-202609-V2" &&
    row.btcDirection === "先涨后跌" &&
    row.ethDirection === "先涨后跌"
  ));
  assert.ok(!bundle.alignments.some((row) => row.id === "BTC-ETH-ALIGN-3M"), "superseded three-month comparison must not pose as current");
});

test("September report preserves independent ETH evidence and the latest teacher BTC stage", () => {
  const btc = monthly.assets.find((asset) => asset.symbol === "BTC");
  const eth = monthly.assets.find((asset) => asset.symbol === "ETH");
  assert.equal(btc?.directionZh, "先涨后跌");
  assert.equal(eth?.directionZh, "先涨后跌");
  assert.match(monthly.conclusionZh, /不把ETH定义为整月看涨/);
  assert.match(eth?.conclusionZh ?? "", /中下旬.*偏弱/);

  const teacher = findTeacherPriorityLiuyaoSource("BTC", "2026-09-07");
  assert.equal(teacher?.id, "TL-BINGWU-BTC-TARGET-20260824-V2");
  assert.equal(teacher?.weeklyDirection, "震荡上涨");
  assert.match(btc?.conclusionZh ?? "", /9月10日前趋势仍可向上/);
});

test("gold annual context no longer mislabels September as the teacher's annual high", () => {
  const gold = getAnnualForecastRoadmap2026("gold");
  assert.ok(gold);
  assert.deepEqual(gold?.highMonthCandidates, []);
  assert.match(gold?.annualSummary ?? "", /年度高位放在上半年/);
  assert.equal(gold?.months.find((item) => item.month === "2026-09")?.direction, "先涨后跌");
  assert.equal(gold?.months.find((item) => item.month === "2026-10")?.direction, "先跌后涨");
});

test("historical forecasts remain in the full registry while current selectors expose one version per type", () => {
  const fullEth = listStaticFocusForecasts("eth");
  const currentEth = listLatestStaticFocusForecastsByType("eth");
  assert.equal(new Set(currentEth.map((row) => row.forecastType)).size, currentEth.length);
  assert.ok(fullEth.some((row) => row.id === "ETH-M3-20260801-V1"));
  assert.equal(currentEth.find((row) => row.forecastType === "WEEK_6")?.id, "ETH-W6-20260907-V2");
});

test("daily derivation uses latest teacher BTC and independent ETH weekly records", () => {
  const btc = generateCoreMarketFromWeeklyPure("BTC", "2026-09-07");
  const eth = generateCoreMarketFromWeeklyPure("ETH", "2026-09-07");
  assert.match(btc?.sourceWeeklyForecastId ?? "", /BINGWU-BTC-TARGET/);
  assert.equal(eth?.sourceWeeklyForecastId, "ETH-W6-20260907-V2");
  assert.match(eth?.liuyaoEvidence ?? "", /否|遁|先涨后跌/);
});

test("monthly grid and top report share the same current BTC, ETH and gold paths", () => {
  const btc = MONTHLY_MARKET_OUTLOOKS_202609.find((row) => row.symbol === "BTC");
  const eth = MONTHLY_MARKET_OUTLOOKS_202609.find((row) => row.symbol === "ETH");
  const gold = MONTHLY_MARKET_OUTLOOKS_202609.find((row) => row.symbol === "GOLD");
  assert.equal(btc?.direction, "先涨后跌");
  assert.match(btc?.path ?? "", /9月10日前趋势仍可向上/);
  assert.equal(eth?.direction, "先涨后跌");
  assert.match(eth?.path ?? "", /中旬.*高波动.*下旬.*偏弱/);
  assert.equal(gold?.direction, "先涨后跌");
  assert.match(gold?.path ?? "", /9月7日前.*试高.*9月7日后.*回落/);
  assert.ok(MONTHLY_MARKET_OUTLOOKS_202609_ARCHIVED_REVISIONS.some((row) => row.symbol === "BTC" && row.version === 1));
  assert.ok(MONTHLY_MARKET_OUTLOOKS_202609_ARCHIVED_REVISIONS.some((row) => row.symbol === "GOLD" && row.version === 1));
});
