// MOOX_EXTERNAL_ANALYST_V1_1
import assert from "node:assert/strict";
import test from "node:test";
import { parseExternalAnalystPost } from "../lib/trading-signals/external-analyst-parser";
import { applyExternalAnalystOverlay } from "../lib/trading-signals/external-analyst-overlay";
import type { ExternalAnalystOverlay } from "../types/external-analyst";

const peterText = "只要后续两天BTC不跌破63412，回调结束后会突破66900-67300压力区间，突破后上方压力位在70380附近。";

test("BTCTW0 parser extracts BTC levels and a bullish conditional map", () => {
  const parsed = parseExternalAnalystPost({
    source: "BTCTW0",
    username: "BTCTW0",
    postId: "1",
    postUrl: "https://x.com/BTCTW0/status/1",
    postedAt: "2026-08-06T00:00:00.000Z",
    text: peterText,
  });
  assert.deepEqual(parsed.symbols, ["BTCUSDT"]);
  assert.equal(parsed.horizon, "SWING");
  assert.ok(parsed.keyLevels.includes(63412));
  assert.ok(parsed.keyLevels.includes(66900));
  assert.ok(parsed.keyLevels.includes(67300));
  assert.ok(parsed.keyLevels.includes(70380));
});



test("plain ticker aliases work without a dollar sign", () => {
  const btc = parseExternalAnalystPost({
    source: "BTCTW0",
    username: "BTCTW0",
    postId: "plain-btc",
    postUrl: "https://x.com/BTCTW0/status/plain-btc",
    postedAt: "2026-08-06T00:00:00.000Z",
    text: "BTC守住63412后看反弹。",
  });
  const eth = parseExternalAnalystPost({
    source: "HALILUYA",
    username: "haliluya8911",
    postId: "plain-eth",
    postUrl: "https://x.com/haliluya8911/status/plain-eth",
    postedAt: "2026-08-06T00:00:00.000Z",
    text: "ETH超卖后重新站稳1860，观察短线反弹。",
  });
  assert.deepEqual(btc.symbols, ["BTCUSDT"]);
  assert.deepEqual(eth.symbols, ["ETHUSDT"]);
});

test("external analyst overlay cannot reverse the Liuyao primary direction", () => {
  const overlay: ExternalAnalystOverlay = {
    symbol: "BTCUSDT",
    strategyType: "SWING",
    direction: "SHORT",
    confidence: 70,
    supportLevels: [62000],
    resistanceLevels: [65000],
    targetLevels: [60000],
    invalidationLevels: [65500],
    timeWindows: [],
    sourceLabels: ["彼得兔BTCTW0·江恩波段"],
    sourceUrls: ["https://x.com/BTCTW0/status/1"],
    summaries: ["sample"],
    newestPostedAt: "2026-08-06T00:00:00.000Z",
  };
  const evaluation = {
    direction: "LONG" as const,
    confidence: 62,
    forecastScore: 70,
    conditions: [],
    currentPrice: 64000,
    entryPrice: 64000,
    stopLoss: 62500,
    target1: 65500,
    target2: 67000,
    ready: true,
    raw: {},
  };
  const result = applyExternalAnalystOverlay({
    evaluation,
    overlay,
    strategyType: "SWING",
    primaryForecastDirection: "LONG",
    externalVerification: { sampleCount: 10, weightedHitRatePct: 70 },
  });
  assert.equal(result.direction, "LONG");
  assert.equal(result.stopLoss, 62500);
  assert.equal(result.target2, 67000);
  assert.ok(result.confidence < evaluation.confidence);
  assert.equal(result.conditions.at(-1)?.met, false);
});

test("aligned external levels may refine stops and targets without creating readiness", () => {
  const overlay: ExternalAnalystOverlay = {
    symbol: "BTCUSDT",
    strategyType: "SWING",
    direction: "LONG",
    confidence: 68,
    supportLevels: [63412],
    resistanceLevels: [66900, 67300],
    targetLevels: [70380],
    invalidationLevels: [],
    timeWindows: ["本周"],
    sourceLabels: ["彼得兔BTCTW0·江恩波段"],
    sourceUrls: ["https://x.com/BTCTW0/status/1"],
    summaries: ["sample"],
    newestPostedAt: "2026-08-06T00:00:00.000Z",
  };
  const evaluation = {
    direction: "LONG" as const,
    confidence: 60,
    forecastScore: 72,
    conditions: [],
    currentPrice: 64000,
    entryPrice: 64000,
    stopLoss: 63000,
    target1: 66000,
    target2: 68000,
    ready: false,
    raw: {},
  };
  const result = applyExternalAnalystOverlay({
    evaluation,
    overlay,
    strategyType: "SWING",
    primaryForecastDirection: "LONG",
  });
  assert.equal(result.direction, "LONG");
  assert.equal(result.ready, false);
  assert.ok(result.conditions.some((row) => row.key === "external_analyst"));
  assert.ok(result.confidence >= evaluation.confidence);
});
