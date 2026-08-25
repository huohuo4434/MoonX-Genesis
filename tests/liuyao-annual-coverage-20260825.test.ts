import assert from "node:assert/strict";
import test from "node:test";
import {
  BINGWU_2026_CONFIRMED_ANNUAL_READINGS,
  BINGWU_2026_SUPPLEMENTAL_READINGS,
  LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY,
  LIUYAO_2026_CORE_ANNUAL_GAPS,
  LIUYAO_2026_TONIGHT_PRIORITY,
} from "../lib/research/liuyao-annual-coverage-2026";

test("only five confirmed teacher market annuals are counted", () => {
  assert.equal(BINGWU_2026_CONFIRMED_ANNUAL_READINGS.length, 5);
  assert.deepEqual(
    BINGWU_2026_CONFIRMED_ANNUAL_READINGS.map((item) => item.assetId),
    ["btc", "gold", "hsi", "a-share-market", "us-market"],
  );
  assert.equal(LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.confirmedTeacherAnnuals, 5);
});

test("event readings remain supplemental and never inflate annual coverage", () => {
  assert.equal(BINGWU_2026_SUPPLEMENTAL_READINGS.length, 2);
  assert.ok(BINGWU_2026_SUPPLEMENTAL_READINGS.every((item) => item.doesNotReplace?.length));
  assert.equal(BINGWU_2026_CONFIRMED_ANNUAL_READINGS.some((item) => item.assetId === "crypto-black-swan"), false);
});

test("broad market annuals cannot close exact asset gaps", () => {
  const usMarket = BINGWU_2026_CONFIRMED_ANNUAL_READINGS.find((item) => item.assetId === "us-market");
  const hsi = BINGWU_2026_CONFIRMED_ANNUAL_READINGS.find((item) => item.assetId === "hsi");
  assert.deepEqual(usMarket?.doesNotReplace, ["纳指100", "标普500", "任何单只美股"]);
  assert.deepEqual(hsi?.doesNotReplace, ["恒生科技", "腾讯"]);
  assert.ok(LIUYAO_2026_CORE_ANNUAL_GAPS.some((item) => item.assetId === "ndx"));
  assert.ok(LIUYAO_2026_CORE_ANNUAL_GAPS.some((item) => item.assetId === "spx"));
  assert.ok(LIUYAO_2026_CORE_ANNUAL_GAPS.some((item) => item.assetId === "hstech"));
});

test("tonight priority stays focused on the five core gaps", () => {
  assert.deepEqual(
    LIUYAO_2026_TONIGHT_PRIORITY.map((item) => item.assetId),
    ["eth", "ndx", "spx", "silver", "wti"],
  );
});
