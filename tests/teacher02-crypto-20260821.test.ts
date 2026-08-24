import test from "node:test";
import assert from "node:assert/strict";
import { listBtcPeriodForecasts20260801 } from "@/lib/data/conviction/btc-forecasts-20260801";
import { listEthPeriodForecasts } from "@/lib/data/conviction/eth-forecasts";
import {
  TEACHER02_CRYPTO_DAILY_PATH_20260824,
  TEACHER02_CRYPTO_SOURCE_20260821,
} from "@/lib/data/teacher02-crypto-20260821";
import {
  buildWeeklyMarketSlots,
  listAllPublishedWeeklyAnalyses,
  toWeeklyMemberView,
} from "@/lib/data/weekly-analysis";
import { generateDailyFromWeekly } from "@/lib/forecasts/weekly-to-daily";
import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";

test("complete teacher crypto weekly chart becomes the newest BTC and ETH source", () => {
  const btc = listBtcPeriodForecasts20260801()
    .filter((item) => item.forecastType === "WEEK_4" && item.periodStart === "2026-08-24")
    .sort((a, b) => b.version - a.version)[0];
  const eth = listEthPeriodForecasts()
    .filter((item) => item.forecastType === "WEEK_4" && item.periodStart === "2026-08-24")
    .sort((a, b) => b.version - a.version)[0];

  assert.equal(btc?.id, "BTC-W4-20260824-V3");
  assert.equal(eth?.id, "ETH-W4-20260824-V2");
  for (const item of [btc, eth]) {
    assert.equal(item?.direction, "探底回升");
    assert.equal(item?.ichingEvidence.primaryHexagram, "水火既济");
    assert.equal(item?.ichingEvidence.changingHexagram, "水天需");
    assert.equal(item?.dailyPath?.length, 7);
    assert.match(item?.expectedPath ?? "", /24日至25日.*下探.*26日02:24 UTC后修复.*29日至30日震荡回升/);
  }
  assert.match(eth?.risks.join("；") ?? "", /8月30日06:00 UTC后月卦重新承压/);
});

test("member weekly view uses the new version without exposing internal provenance", () => {
  const published = buildWeeklyMarketSlots(new Date("2026-08-23T15:10:00+08:00"))
    .filter((slot) => slot.kind === "published")
    .map((slot) => slot.analysis);
  const btc = published.find((item) => item.assetId === "bitcoin");
  const eth = published.find((item) => item.assetId === "eth");

  assert.equal(btc?.id, "WEEKLY-BTC-20260824-V6");
  assert.equal(eth?.id, "WEEKLY-ETH-20260824-V3");
  assert.equal(btc?.overallDirection, "探底回升");
  assert.equal(eth?.overallDirection, "探底回升");
  assert.match(btc?.weeklyPath ?? "", /24日至25日先下探.*26日02:24 UTC后修复/);
  assert.match(eth?.weeklyPath ?? "", /30日06:00 UTC后.*山地剥/);
  assert.equal(btc?.version, 6);
  assert.match(btc?.memberRevisionNotice?.previousSummaryZh ?? "", /24日前后.*短期高点/);
  assert.match(btc?.memberRevisionNotice?.currentSummaryZh ?? "", /24日至25日.*下探.*26日后修复/);
  assert.match(btc?.memberRevisionNotice?.reasonZh ?? "", /目标周开始前.*旧观点保留/);

  const fullBtc = listAllPublishedWeeklyAnalyses().find((item) => item.id === "WEEKLY-BTC-20260824-V6");
  assert.ok(fullBtc);
  const memberJson = JSON.stringify(toWeeklyMemberView(fullBtc));
  assert.doesNotMatch(memberJson, /网站相关|六爻狼叔|T02-CRYPTO/);
  assert.doesNotMatch(memberJson, /sourceIds|revisions/);
});

test("automatic daily generation honors explicit teacher day path instead of fabricating a daily hexagram", () => {
  const weekly: WeeklyForecastSourceRecord = {
    id: "TEST-TEACHER-CRYPTO-WEEK",
    marketCode: "BTC",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    primaryHexagram: "水火既济",
    changedHexagram: "水天需",
    movingLines: [],
    specialPatterns: ["TEACHER_EXPLICIT_DAILY_PATH"],
    weeklyDirection: "探底回升",
    weeklyPath: "先下探，后修复，周末蓄势回升。",
    interpretation: "老师完整周卦30逐日运行轨迹。",
    riskSummary: "高波动；不直接触发实盘。",
    dailyPath: TEACHER02_CRYPTO_DAILY_PATH_20260824.map((day) => ({ ...day })),
    sourceType: "LIUYAO_WEEKLY",
    version: 1,
    status: "LOCKED",
    publishedAt: "2026-08-23T15:06:00+08:00",
    lockedAt: "2026-08-23T15:06:00+08:00",
    createdAt: "2026-08-23T15:06:00+08:00",
    updatedAt: "2026-08-23T15:06:00+08:00",
  };

  const monday = generateDailyFromWeekly({ weekly, forecastDate: "2026-08-24" });
  const wednesday = generateDailyFromWeekly({ weekly, forecastDate: "2026-08-26" });
  const saturday = generateDailyFromWeekly({ weekly, forecastDate: "2026-08-29" });

  assert.equal(monday.direction, "震荡下跌");
  assert.match(monday.expectedPath, /冲高受阻后快速下探/);
  assert.equal(wednesday.direction, "探底回升");
  assert.match(wednesday.expectedPath, /02:24 UTC后/);
  assert.equal(saturday.direction, "震荡上涨");
  assert.match(saturday.expectedPath, /水天需/);
  assert.match(saturday.risks.join("；"), /周末低流动性/);
});
