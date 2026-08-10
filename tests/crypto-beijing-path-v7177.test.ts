import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyIntradayPattern,
  comparePatterns,
  type IntradayVerificationBar,
} from "../lib/verification/pattern-classifier.ts";

function ethBars(): IntradayVerificationBar[] {
  const values = [
    { open: 1923.0, high: 1924.8, low: 1921.7, close: 1922.5 },
    { open: 1922.5, high: 1923.0, low: 1918.0, close: 1919.2 },
    { open: 1919.2, high: 1920.0, low: 1912.51, close: 1914.5 },
    { open: 1914.5, high: 1924.0, low: 1914.0, close: 1922.0 },
    { open: 1922.0, high: 1938.0, low: 1921.0, close: 1932.0 },
    { open: 1932.0, high: 1934.0, low: 1924.0, close: 1926.0 },
  ];
  return values.map((v, i) => ({
    timestamp: 1_786_000_000 + i * 3600,
    localTime: `2026-08-09 ${String(i * 4).padStart(2,"0")}:00`,
    ...v,
  }));
}

test("ETH 2026-08-09 Beijing-day path is down-then-up, not a miss", () => {
  const actual = classifyIntradayPattern({
    bars: ethBars(),
    previousClose: 1923.0,
    thresholds: {
      neutralPct: 0.2,
      meaningfulMovePct: 0.8,
      reversalPct: 0.7,
      surgePct: 1.2,
      atrPct: 3.0,
    },
  });
  assert.ok(actual);
  assert.equal(actual.pattern, "DOWN_THEN_UP");
  const verdict = comparePatterns({
    predicted: "DOWN_THEN_UP",
    actual: actual.pattern,
    validationMode: "FULL_PATH",
  });
  assert.equal(verdict.verdict, "FULL_HIT");
  assert.equal(verdict.pathScore, 25);
});
