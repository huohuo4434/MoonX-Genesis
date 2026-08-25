import assert from "node:assert/strict";
import test from "node:test";
import {
  BINGWU_2026_CONFIRMED_ANNUAL_READINGS,
  BINGWU_2026_SUPPLEMENTAL_READINGS,
  LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY,
  LIUYAO_2026_CORE_ANNUAL_GAPS,
  LIUYAO_2026_TONIGHT_PRIORITY,
  LIUYAO_2026_LATER_ANNUAL_GAPS,
  USER_2026_CONFIRMED_ANNUAL_READINGS,
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

test("broad market annuals remain distinct after exact asset annuals are supplied", () => {
  const usMarket = BINGWU_2026_CONFIRMED_ANNUAL_READINGS.find((item) => item.assetId === "us-market");
  const hsi = BINGWU_2026_CONFIRMED_ANNUAL_READINGS.find((item) => item.assetId === "hsi");
  assert.deepEqual(usMarket?.doesNotReplace, ["纳指100", "标普500", "任何单只美股"]);
  assert.deepEqual(hsi?.doesNotReplace, ["恒生科技", "腾讯"]);
  assert.equal(LIUYAO_2026_CORE_ANNUAL_GAPS.length, 0);
  assert.ok(USER_2026_CONFIRMED_ANNUAL_READINGS.some((item) => item.assetId === "nasdaq-100"));
  assert.ok(USER_2026_CONFIRMED_ANNUAL_READINGS.some((item) => item.assetId === "sp500"));
  assert.ok(USER_2026_CONFIRMED_ANNUAL_READINGS.some((item) => item.assetId === "hstech"));
});

test("all 19 new annual charts are traced and only CXMT remains missing", () => {
  assert.equal(USER_2026_CONFIRMED_ANNUAL_READINGS.length, 19);
  assert.ok(USER_2026_CONFIRMED_ANNUAL_READINGS.every((item) => /^[A-F0-9]{64}$/.test(item.sourceDigest ?? "")));
  assert.deepEqual(LIUYAO_2026_LATER_ANNUAL_GAPS.map((item) => item.assetId), ["cxmt"]);
  assert.deepEqual(
    LIUYAO_2026_TONIGHT_PRIORITY.map((item) => item.assetId),
    ["cxmt"],
  );
});
