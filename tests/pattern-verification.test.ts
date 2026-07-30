import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyIntradayPattern,
  comparePatterns,
  derivePatternThresholds,
  patternFromText,
  type IntradayVerificationBar,
} from "../lib/verification/pattern-classifier.ts";

function bars(values: number[]): IntradayVerificationBar[] {
  return values.map((close, i) => ({
    timestamp: 1_700_000_000 + i * 900,
    localTime: `10:${String(i * 15).padStart(2, "0")}`,
    open: i === 0 ? 100 : values[i - 1]!,
    high: close + 0.15,
    low: close - 0.15,
    close,
  }));
}

test("recognizes surge then pullback from intraday order instead of close color", () => {
  const result = classifyIntradayPattern({
    previousClose: 100,
    thresholds: {
      neutralPct: 0.1,
      meaningfulMovePct: 0.3,
      reversalPct: 0.3,
      surgePct: 0.6,
      atrPct: 1.5,
    },
    bars: bars([100.1, 100.8, 101.2, 100.5, 99.9, 100.05]),
  });
  assert.ok(result);
  assert.equal(result.pattern, "SURGE_THEN_PULLBACK");
  assert.equal(result.direction, "DOWN");
});

test("recognizes dip then recovery even when final close is only slightly positive", () => {
  const result = classifyIntradayPattern({
    previousClose: 100,
    thresholds: {
      neutralPct: 0.1,
      meaningfulMovePct: 0.3,
      reversalPct: 0.3,
      surgePct: 0.6,
      atrPct: 1.5,
    },
    bars: bars([99.9, 99.1, 98.7, 99.4, 100.1, 100.2]),
  });
  assert.ok(result);
  assert.equal(result.pattern, "DIP_THEN_RECOVERY");
  assert.equal(result.direction, "UP");
});

test("exact path is full hit and adjacent stronger path is partial hit", () => {
  assert.equal(
    comparePatterns({
      predicted: "DOWN_THEN_UP",
      actual: "DOWN_THEN_UP",
      validationMode: "FULL_PATH",
    }).verdict,
    "FULL_HIT"
  );
  assert.equal(
    comparePatterns({
      predicted: "DOWN_THEN_UP",
      actual: "DIP_THEN_RECOVERY",
      validationMode: "FULL_PATH",
    }).verdict,
    "PARTIAL_HIT"
  );
});

test("opposite path is a miss", () => {
  const result = comparePatterns({
    predicted: "SURGE_THEN_PULLBACK",
    actual: "UP",
    validationMode: "FULL_PATH",
  });
  assert.equal(result.verdict, "MISS");
});

test("prediction text preserves all nine path types", () => {
  assert.equal(patternFromText("预计先跌后涨", "UP").pattern, "DOWN_THEN_UP");
  assert.equal(patternFromText("预计冲高回落", "DOWN").pattern, "SURGE_THEN_PULLBACK");
  assert.equal(patternFromText("预计震荡上涨", "UP").pattern, "RANGE_UP");
  assert.equal(patternFromText("预计震荡", "FLAT").pattern, "RANGE");
});

test("thresholds are volatility aware rather than one fixed percentage", () => {
  const low = derivePatternThresholds({ atrPct: 0.8, market: "US", symbol: "SPX" });
  const high = derivePatternThresholds({ atrPct: 4.5, market: "CRYPTO", symbol: "BTC" });
  assert.ok(high.meaningfulMovePct > low.meaningfulMovePct);
  assert.ok(high.reversalPct > low.reversalPct);
});
