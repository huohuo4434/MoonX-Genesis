import assert from "node:assert/strict";
import test from "node:test";
import { calculateVibeScore, makeDimension, stanceFromScore } from "../lib/data/vibe/scorer.ts";
import { VIBE_EVIDENCE_SEED } from "../lib/data/vibe/seed.ts";
import { VIBE_HORIZON_BASE_WEIGHTS, effectiveVibeWeight } from "../lib/data/vibe/weights.ts";

test("Vibe evidence keeps one normalized five-dimension score", () => {
  const dimensions = [
    makeDimension({ key: "financialQuality", score: 80, available: true, summary: "strong" }),
    makeDimension({ key: "valuation", score: -20, available: true, summary: "expensive" }),
    makeDimension({ key: "capitalPositioning", score: 30, available: true, summary: "positive" }),
    makeDimension({ key: "industryStrength", score: 60, available: true, summary: "strong" }),
    makeDimension({ key: "events", score: 20, available: true, summary: "positive" }),
  ];
  const score = calculateVibeScore({ dimensions, freshness: 100 });
  assert.equal(score.completeness, 100);
  assert.equal(score.rawScore, 38);
  assert.equal(score.effectiveScore, 38);
  assert.equal(score.stance, "偏多");
});

test("missing Vibe dimensions reduce completeness instead of becoming bearish", () => {
  const dimensions = [
    makeDimension({ key: "financialQuality", score: 60, available: true, summary: "strong" }),
    makeDimension({ key: "valuation", score: 0, available: false, summary: "missing" }),
    makeDimension({ key: "capitalPositioning", score: 0, available: false, summary: "missing" }),
    makeDimension({ key: "industryStrength", score: 40, available: true, summary: "strong" }),
    makeDimension({ key: "events", score: 0, available: false, summary: "missing" }),
  ];
  const score = calculateVibeScore({ dimensions, freshness: 100 });
  assert.equal(score.completeness, 45);
  assert.equal(score.rawScore, 53);
  assert.equal(score.effectiveScore, 24);
  assert.equal(score.stance, "偏多");
});

test("Vibe weights are capped by horizon and reduced by completeness/freshness", () => {
  assert.deepEqual(VIBE_HORIZON_BASE_WEIGHTS, { daily: 10, weekly: 20, monthly: 25 });
  assert.equal(effectiveVibeWeight({ completeness: 100, freshness: 100 }, "monthly"), 25);
  assert.equal(effectiveVibeWeight({ completeness: 80, freshness: 75 }, "monthly"), 15);
  assert.equal(effectiveVibeWeight({ completeness: 100, freshness: 100 }, "daily"), 10);
});

test("seeded evidence covers the six configured focus assets", () => {
  const ids = new Set(VIBE_EVIDENCE_SEED.map((item) => item.assetId));
  assert.deepEqual(
    [...ids].sort(),
    ["cxmt", "googl", "kingsoft-office", "msft", "mu", "tencent"].sort()
  );
  assert.ok(VIBE_EVIDENCE_SEED.every((item) => item.dimensions.length === 5));
  assert.ok(VIBE_EVIDENCE_SEED.every((item) => item.sourceMode === "SEEDED"));
});

test("stance thresholds remain stable", () => {
  assert.equal(stanceFromScore(55), "强烈偏多");
  assert.equal(stanceFromScore(18), "偏多");
  assert.equal(stanceFromScore(0), "中性");
  assert.equal(stanceFromScore(-18), "偏空");
  assert.equal(stanceFromScore(-55), "强烈偏空");
});
