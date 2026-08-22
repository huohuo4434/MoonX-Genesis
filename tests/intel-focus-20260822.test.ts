import assert from "node:assert/strict";
import test from "node:test";

import { CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed";
import { focusDailyChanCapability, focusDailyQuoteCapability } from "../lib/data/conviction/focus-daily-generation-core";
import { STATIC_FOCUS_ASSET_IDS, STATIC_MEMBER_AUTOMATION_FOCUS } from "../lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { INTEL_PERIOD_FORECASTS, INTEL_PERIOD_ORDER } from "../lib/data/conviction/intel-liuyao-20260822";
import { getAssetPresentation } from "../lib/presentation/asset-catalog";
import { WATCHLIST_TEASERS } from "../lib/data/conviction/watchlist-teasers";
import { getDayGanzhi } from "../lib/calendar/ganzhi";
import { buildFocusQimenParallelReading } from "../lib/forecasts/focus-qimen-parallel";
import { buildFocusDetailedReport } from "../lib/data/conviction/focus-dossier-core";

test("INTC is published in the focus registry without implicit live-trading authority", () => {
  const asset = CONVICTION_ASSET_SEED.find((item) => item.id === "intel");
  assert.ok(asset);
  assert.equal(asset.slug, "intel");
  assert.equal(asset.symbol, "INTC");
  assert.equal(asset.exchange, "NASDAQ");
  assert.equal(asset.isPublished, true);
  assert.doesNotMatch(`${asset.thesisZh.join(" ")} ${asset.catalystsZh.join(" ")} ${asset.risksZh.join(" ")}`, /磨底|转强|先升|主升|游魂|归魂|官鬼/);
  assert.ok(STATIC_FOCUS_ASSET_IDS.includes("intel"));
  assert.equal(STATIC_MEMBER_AUTOMATION_FOCUS.intel.canonicalSymbol, null);
  assert.equal(getAssetPresentation("INTC")?.assetId, "intel");
  const teaser = WATCHLIST_TEASERS.find((item) => item.slug === "intel");
  assert.ok(teaser);
  assert.equal(teaser.detailHref, "/featured-stocks/intel");
  assert.doesNotMatch(`${teaser.headlineZh} ${teaser.hookZh}`, /8月22|9月30|先涨后跌|震荡上涨/);
});

test("INTC retains exactly the three supplied locked horizons and their original chart identity", () => {
  assert.deepEqual(INTEL_PERIOD_ORDER, ["MONTH_1", "MONTH_3", "YEAR_1"]);
  assert.deepEqual(listStaticFocusForecasts("intel").map((item) => item.id), [
    "INTC-0822-0831-20260822-V1",
    "INTC-0822-0930-20260822-V1",
    "INTC-0822-YEAREND-20260822-V1",
  ]);
  assert.deepEqual(INTEL_PERIOD_FORECASTS.map((item) => [item.periodStart, item.periodEnd]), [
    ["2026-08-22", "2026-08-31"],
    ["2026-08-22", "2026-09-30"],
    ["2026-08-22", "2026-12-31"],
  ]);
  assert.deepEqual(INTEL_PERIOD_FORECASTS.map((item) => item.ichingEvidence.primaryHexagram), [
    "水天需（游魂）",
    "地风升",
    "火山旅（六合、静卦）",
  ]);
  assert.deepEqual(INTEL_PERIOD_FORECASTS.map((item) => item.ichingEvidence.changingHexagram), [
    "水风井",
    "山风蛊（归魂）",
    null,
  ]);
  assert.ok(INTEL_PERIOD_FORECASTS.every((item) => item.version === 1 && item.status === "published" && item.validationStatus === "UNVERIFIED"));
});

test("INTC evidence is explicitly user-supplied and contains no fabricated daily chart, target, or price level", () => {
  for (const forecast of INTEL_PERIOD_FORECASTS) {
    assert.match(forecast.ichingEvidence.notes, /来源为用户本人排盘，不是老师原卦/);
    assert.equal(forecast.dailyPath, undefined);
    assert.deepEqual(forecast.supportLevels, []);
    assert.deepEqual(forecast.resistanceLevels, []);
    assert.equal(forecast.targetScenarioTests, undefined);
    assert.doesNotMatch(`${forecast.summary} ${forecast.expectedPath}`, /\+?\d+%|目标价|支撑位|压力位/);
  }
});

test("INTC can receive public quote and Chan enrichment without changing its locked Liu Yao direction", () => {
  assert.deepEqual(focusDailyQuoteCapability({ symbol: "INTC", assetType: "STOCK", exchange: "NASDAQ" }), {
    available: true,
    market: "US",
    quoteSymbol: "INTC",
    reason: null,
  });
  assert.deepEqual(focusDailyChanCapability("INTC"), {
    catalogSupported: true,
    instrument: "INTC",
    analyzedTimeframes: ["1H"],
    reason: null,
  });
});

test("INTC daily calendar agrees with the supplied chart and Qimen fails closed without a teacher use-god", () => {
  assert.equal(getDayGanzhi("2026-08-22").ganzhiLabel, "戊辰");
  assert.equal(getDayGanzhi("2026-08-23").ganzhiLabel, "己巳");
  const qimen = buildFocusQimenParallelReading({ assetId: "intel", symbol: "INTC", forecastDate: "2026-08-24", liuyaoDirection: "震荡上涨" });
  assert.equal(qimen.available, false);
  assert.equal(qimen.direction, "资料不足");
  assert.equal(qimen.relationLabel, "奇门证据不足");
  assert.equal(qimen.verificationEligible, false);
  assert.equal(qimen.castAt, "");
});

test("INTC member dossier distinguishes the locked source period from its seven-day derived window", () => {
  const dossier = buildFocusDetailedReport({
    assetId: "intel",
    forecasts: INTEL_PERIOD_FORECASTS,
    asOfDate: "2026-08-22",
    nowMs: Date.parse("2026-08-22T12:00:00+08:00"),
  });
  assert.equal(dossier.dailyAuthority?.sourcePeriodStart, "2026-08-22");
  assert.equal(dossier.dailyAuthority?.sourcePeriodEnd, "2026-08-31");
  assert.equal(dossier.dailyAuthority?.displayPeriodStart, "2026-08-22");
  assert.equal(dossier.dailyAuthority?.displayPeriodEnd, "2026-08-28");
  assert.match(dossier.statusLabel, /不是独立日卦/);
  assert.equal(dossier.dailyPath.length, 7);
  assert.ok(dossier.qimenParallel.dailyRows.every((row) => row.qimen.available === false));
  assert.deepEqual(dossier.qimenParallel.horizonRows.map((row) => row.periodLabel), [
    "2026-08-22至2026-08-31",
    "2026-08-22至2026-09-30",
    "2026-08-22至2026-12-31",
  ]);
  assert.ok(dossier.qimenParallel.horizonRows.every((row) => row.methodLabel === "奇门证据不足" && row.verificationEligible === false));
});
