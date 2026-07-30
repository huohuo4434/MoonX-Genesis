/**
 * Unit checks for banned price language + I Ching isolation.
 */
import assert from "node:assert/strict";
import { validatePublishedPriceLevels, BANNED_FUZZY } from "../lib/market-data/price-levels";
import { buildIChingDirectionView, assertNoIChingPrices } from "../lib/forecasts/iching-direction-engine";
import { formalBatchReady } from "../lib/calendar/publish-windows";

assert.equal(BANNED_FUZZY.test("放量突破前高"), true);
assert.equal(BANNED_FUZZY.test("跌破前一交易日低点"), true);
assert.equal(BANNED_FUZZY.test("4小时K线收盘跌破712—720美元支撑区下沿712美元"), false);

const bad = validatePublishedPriceLevels({
  supportLevels: ["支撑位720"],
  resistanceLevels: ["压力位760"],
  confirmation: "放量突破前高",
  invalidation: "跌破昨日低点",
});
assert.ok(bad.length >= 3);

const good = validatePublishedPriceLevels({
  supportLevels: ["第一支撑区：712—720美元（来源：多次触碰波段高低点）"],
  resistanceLevels: ["第一压力区：748—760美元（来源：密集成交/平台区）"],
  confirmation: "4小时K线收盘站上748—760美元压力区上沿760美元，确认突破有效。",
  invalidation: "4小时K线收盘跌破712—720美元支撑区下沿712美元，原「震荡上涨」判断失效。",
  priceSnapshot: {
    previousClose: 730,
    previousHigh: 750,
    previousLow: 710,
    recentSupport: 712,
    recentResistance: 760,
    priceDataSource: "yahoo-finance-1d:BTC-USD",
    priceSnapshotAt: new Date().toISOString(),
    support: {
      levelType: "support",
      levelPrice: 712,
      levelReason: "近期结构低点",
      sourceTimestamp: "2026-07-29",
      display: "第一支撑区：712—720美元",
      displayShort: "712美元",
    },
    resistance: {
      levelType: "resistance",
      levelPrice: 760,
      levelReason: "近期结构高点",
      sourceTimestamp: "2026-07-29",
      display: "第一压力区：748—760美元",
      displayShort: "760美元",
    },
    confirmationMethod: "1小时收盘",
    unitLabel: "美元",
  },
});
assert.deepEqual(good, []);

const iching = buildIChingDirectionView({
  directionLabel: "震荡上涨",
  expectedPath: ["早段确认", "随后抬升"],
  confidence: 55,
});
assert.equal(iching.directionLabel, "震荡上涨");
assert.equal(assertNoIChingPrices("支撑720美元"), "六爻方向模块不得包含具体价格或突破/跌破表述");

assert.equal(formalBatchReady(new Date("2026-07-30T11:59:00+08:00")), false);
assert.equal(formalBatchReady(new Date("2026-07-30T20:00:00+08:00")), true);

console.log("technical-price-structure-rules OK");
