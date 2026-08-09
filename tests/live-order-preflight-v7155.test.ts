import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyLiveOrderFailure,
  normalizeLiveOrderSizeUp,
  normalizeLiveTriggerPrice,
  type LiveContractRules,
} from "../lib/trading-signals/live-order-preflight-core";

const btcContract: LiveContractRules = {
  symbol: "BTCUSDT",
  available: true,
  sizeMultiplier: 0.0001,
  volumePlace: 4,
  priceMultiplier: 0.1,
  pricePrecision: 1,
};

test("local preflight blocks do not count as real order write failures", () => {
  assert.deepEqual(classifyLiveOrderFailure("PREFLIGHT"), {
    attempted: false,
    error: false,
    status: "BLOCKED",
    rejectionCode: "ORDER_PREFLIGHT_BLOCK",
  });
});

test("only remote exchange write failures count as order errors", () => {
  assert.deepEqual(classifyLiveOrderFailure("REMOTE_WRITE"), {
    attempted: true,
    error: true,
    status: "ERROR",
    rejectionCode: "ORDER_ERROR",
  });
});

test("minimum quantity is rounded upward to exchange quantity multiplier", () => {
  assert.equal(normalizeLiveOrderSizeUp(0.000101, btcContract), "0.0002");
  assert.equal(normalizeLiveOrderSizeUp(0.0001, btcContract), "0.0001");
});

test("preset stop and target prices obey exchange price multiplier", () => {
  assert.equal(normalizeLiveTriggerPrice(63422.456, btcContract, "floor"), 63422.4);
  assert.equal(normalizeLiveTriggerPrice(64001.011, btcContract, "ceil"), 64001.1);
  assert.equal(normalizeLiveTriggerPrice(64001.04, btcContract, "nearest"), 64001);
});
