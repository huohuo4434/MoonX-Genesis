import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyWeeklyPath,
  resolveWeeklyVerificationMarket,
  scoreWeeklyVerification,
} from "../lib/verification/weekly-verification-core";

test("weekly verifier uses the correct market session for every published asset family", () => {
  assert.equal(resolveWeeklyVerificationMarket("BTC"), "CRYPTO");
  assert.equal(resolveWeeklyVerificationMarket("ETH"), "CRYPTO");
  assert.equal(resolveWeeklyVerificationMarket("000001.SS"), "CN");
  assert.equal(resolveWeeklyVerificationMarket("SHCOMP"), "CN");
  assert.equal(resolveWeeklyVerificationMarket("HSTECH"), "HK");
  assert.equal(resolveWeeklyVerificationMarket("WTI"), "US_FUTURES");
  assert.equal(resolveWeeklyVerificationMarket("GOLD"), "US_FUTURES");
  assert.equal(resolveWeeklyVerificationMarket("SILVER"), "US_FUTURES");
  assert.equal(resolveWeeklyVerificationMarket("GLD"), "US");
  assert.equal(resolveWeeklyVerificationMarket("SPX"), "US");
  assert.equal(resolveWeeklyVerificationMarket("NDX"), "US");
});

test("weekly path classification and scoring preserve full partial and miss outcomes", () => {
  assert.equal(classifyWeeklyPath([]), "UNVERIFIABLE");
  assert.equal(classifyWeeklyPath([
    { open: 100, high: 102, low: 95, close: 97 },
    { open: 97, high: 105, low: 96, close: 104 },
  ]), "先跌后涨");
  assert.deepEqual(scoreWeeklyVerification("先跌后涨", "先跌后涨"), { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 });
  assert.deepEqual(scoreWeeklyVerification("震荡上涨", "先跌后涨"), { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 });
  assert.deepEqual(scoreWeeklyVerification("震荡上涨", "上涨"), { result: "PARTIAL_HIT", directionScore: 50, pathScore: 25, totalScore: 75 });
  assert.deepEqual(scoreWeeklyVerification("震荡下跌", "先涨后跌"), { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 });
  assert.deepEqual(scoreWeeklyVerification("上涨", "先跌后涨"), { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 });
  assert.deepEqual(scoreWeeklyVerification("先涨后跌", "上涨"), { result: "MISS", directionScore: 0, pathScore: 0, totalScore: 0 });
});
