import test from "node:test";
import assert from "node:assert/strict";
import {
  TSLA_LIUYAO_FORECASTS_20260816,
  TSLA_PERIOD_ORDER,
  tslaPeriodLabel20260816,
} from "@/lib/data/conviction/tsla-liuyao-20260816";
import {
  LITE_LIUYAO_FORECASTS_20260816,
  LITE_PERIOD_ORDER,
  litePeriodLabel20260816,
} from "@/lib/data/conviction/lite-liuyao-20260816";

test("TSLA publishes eleven locked member research windows", () => {
  assert.equal(TSLA_LIUYAO_FORECASTS_20260816.length, 11);
  assert.equal(TSLA_PERIOD_ORDER.length, 11);
  assert.equal(new Set(TSLA_LIUYAO_FORECASTS_20260816.map((x) => x.forecastType)).size, 11);
  for (const row of TSLA_LIUYAO_FORECASTS_20260816) {
    assert.equal(row.assetId, "tsla");
    assert.equal(row.status, "published");
    assert.equal(row.validationStatus, "UNVERIFIED");
    assert.equal(row.sourceType, "ICHING_RESEARCH");
    assert.equal(row.supportLevels.length, 0, "TSLA source supplied no exact fixed price levels");
    assert.equal(row.resistanceLevels.length, 0, "TSLA source supplied no exact fixed price levels");
    assert.ok((row.methodViews ?? []).some((v) => v.label.includes("老师01")));
    assert.ok((row.methodViews ?? []).some((v) => v.label.includes("老师02")));
    assert.ok(row.ichingEvidence?.primaryHexagram);
  }
});

test("TSLA exact period labels and hexagrams are locked", () => {
  assert.equal(tslaPeriodLabel20260816("WEEK").zh, "8/17–23");
  assert.equal(tslaPeriodLabel20260816("WEEK_2").zh, "8/24–30");
  assert.equal(tslaPeriodLabel20260816("WEEK_3").zh, "8/31–9/6");
  assert.equal(tslaPeriodLabel20260816("WEEK_4").zh, "9/7–13");
  assert.equal(tslaPeriodLabel20260816("MONTH_1").zh, "9/14–20");
  assert.equal(tslaPeriodLabel20260816("MONTH_3").zh, "9/21–27");
  assert.equal(tslaPeriodLabel20260816("TODAY").zh, "9/28–10/4");
  assert.equal(tslaPeriodLabel20260816("YEAR_1").zh, "8/17–10/4");
  assert.equal(tslaPeriodLabel20260816("YEAR_3").zh, "8/17–12/31");
  assert.equal(tslaPeriodLabel20260816("YEAR_5").zh, "2027年");
  assert.equal(tslaPeriodLabel20260816("YEAR_10").zh, "至2029年8月");
  const h = Object.fromEntries(TSLA_LIUYAO_FORECASTS_20260816.map((x) => [x.forecastType, x.ichingEvidence]));
  assert.deepEqual([h.WEEK?.primaryHexagram, h.WEEK?.changingHexagram], ["水火既济", null]);
  assert.deepEqual([h.WEEK_2?.primaryHexagram, h.WEEK_2?.changingHexagram], ["火山旅（六合）", null]);
  assert.deepEqual([h.WEEK_3?.primaryHexagram, h.WEEK_3?.changingHexagram], ["地山谦", "山风蛊（归魂）"]);
  assert.deepEqual([h.WEEK_4?.primaryHexagram, h.WEEK_4?.changingHexagram], ["泽山咸", "天山遯"]);
  assert.deepEqual([h.MONTH_1?.primaryHexagram, h.MONTH_1?.changingHexagram], ["火雷噬嗑", null]);
  assert.deepEqual([h.MONTH_3?.primaryHexagram, h.MONTH_3?.changingHexagram], ["地泽临", "地天泰（六合）"]);
  assert.deepEqual([h.TODAY?.primaryHexagram, h.TODAY?.changingHexagram], ["火风鼎", null]);
  assert.deepEqual([h.YEAR_1?.primaryHexagram, h.YEAR_1?.changingHexagram], ["雷火丰", "震为雷（六冲）"]);
  assert.deepEqual([h.YEAR_3?.primaryHexagram, h.YEAR_3?.changingHexagram], ["天水讼（游魂）", "山地剥"]);
  assert.deepEqual([h.YEAR_5?.primaryHexagram, h.YEAR_5?.changingHexagram], ["雷地豫（六合）", "雷水解"]);
  assert.deepEqual([h.YEAR_10?.primaryHexagram, h.YEAR_10?.changingHexagram], ["火风鼎", "火山旅（六合）"]);
});

test("TSLA locked path keeps Wanli evidence separate from MOOX direction", () => {
  const near = TSLA_LIUYAO_FORECASTS_20260816.find((x) => x.forecastType === "YEAR_1")!;
  const yearEnd = TSLA_LIUYAO_FORECASTS_20260816.find((x) => x.forecastType === "YEAR_3")!;
  const y2027 = TSLA_LIUYAO_FORECASTS_20260816.find((x) => x.forecastType === "YEAR_5")!;
  assert.equal(near.direction, "先跌后涨");
  assert.match(near.expectedPath, /9月21日至10月4日明显转强/);
  assert.equal(yearEnd.direction, "先涨后跌");
  assert.equal(yearEnd.consensusStars, 5);
  assert.equal(y2027.direction, "震荡上涨");
  assert.match(TSLA_LIUYAO_FORECASTS_20260816.at(-1)?.ichingEvidence?.notes ?? "", /万里老师/);
  assert.match(TSLA_LIUYAO_FORECASTS_20260816.at(-1)?.ichingEvidence?.notes ?? "", /不覆盖MOOX锁定分周方向/);
});

test("LITE publishes five member periods and does not double-count the repeated year-end casting", () => {
  assert.equal(LITE_LIUYAO_FORECASTS_20260816.length, 5);
  assert.deepEqual(LITE_PERIOD_ORDER, ["WEEK", "WEEK_2", "WEEK_3", "MONTH_1", "YEAR_1"]);
  const yearEnd = LITE_LIUYAO_FORECASTS_20260816.find((x) => x.forecastType === "YEAR_1")!;
  assert.equal(yearEnd.ichingEvidence?.primaryHexagram, "地雷复（六合）");
  assert.equal(yearEnd.ichingEvidence?.changingHexagram, "地泽临");
  assert.match(yearEnd.ichingEvidence?.notes ?? "", /雷山小过（游魂）→火地晋（游魂）/);
  assert.match(yearEnd.ichingEvidence?.notes ?? "", /仅作旁证、不重复加权/);
  assert.equal(yearEnd.consensusStars, 4);
});

test("LITE exact period hexagrams and wave execution levels are locked", () => {
  assert.equal(litePeriodLabel20260816("WEEK").zh, "8/17–23");
  assert.equal(litePeriodLabel20260816("WEEK_2").zh, "8/24–30");
  assert.equal(litePeriodLabel20260816("WEEK_3").zh, "8/31–9/6");
  assert.equal(litePeriodLabel20260816("MONTH_1").zh, "8/17–9/30");
  assert.equal(litePeriodLabel20260816("YEAR_1").zh, "8/17–12/31");
  const h = Object.fromEntries(LITE_LIUYAO_FORECASTS_20260816.map((x) => [x.forecastType, x.ichingEvidence]));
  assert.deepEqual([h.WEEK?.primaryHexagram, h.WEEK?.changingHexagram], ["火天大有（归魂）", "火泽睽"]);
  assert.deepEqual([h.WEEK_2?.primaryHexagram, h.WEEK_2?.changingHexagram], ["泽地萃", "风雷益"]);
  assert.deepEqual([h.WEEK_3?.primaryHexagram, h.WEEK_3?.changingHexagram], ["泽雷随（归魂）", "震为雷（六冲）"]);
  assert.deepEqual([h.MONTH_1?.primaryHexagram, h.MONTH_1?.changingHexagram], ["天雷无妄（六冲）", "兑为泽（六冲）"]);
  const yearEnd = LITE_LIUYAO_FORECASTS_20260816.find((x) => x.forecastType === "YEAR_1")!;
  assert.deepEqual(yearEnd.supportLevels, ["817.57"]);
  assert.deepEqual(yearEnd.resistanceLevels, ["1032", "1265", "1680"]);
  assert.match(yearEnd.expectedPath, /817\.57有效跌破/);
  assert.match(yearEnd.expectedPath, /突破1032/);
  assert.ok(LITE_LIUYAO_FORECASTS_20260816.every((row) => row.supportLevels.every((x) => typeof x === "string")));
  assert.ok(LITE_LIUYAO_FORECASTS_20260816.every((row) => row.resistanceLevels.every((x) => typeof x === "string")));
});

test("technical and external evidence remain execution-only", () => {
  for (const row of LITE_LIUYAO_FORECASTS_20260816) {
    assert.match(row.ichingEvidence?.notes ?? "", /点位不参与六爻方向投票/);
  }
  const long = LITE_LIUYAO_FORECASTS_20260816.find((x) => x.forecastType === "YEAR_1")!;
  assert.equal(long.direction, "震荡上涨");
  assert.equal(TSLA_LIUYAO_FORECASTS_20260816.find((x) => x.forecastType === "YEAR_3")?.direction, "先涨后跌");
});
