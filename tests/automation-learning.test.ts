import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildSimilarCaseKey,
  computeLearningAdjustment,
  findSimilarCases,
  inferBiasesFromMiss,
} from "../lib/automation/learning.ts";
import {
  assetAccuracyBreakdown,
  buildDailyCompositeSummary,
  confidenceAccuracyBreakdown,
} from "../lib/automation/daily-summary.ts";
import type { LearningCase } from "../types/automation.ts";
import type { DailyVerificationResult } from "../types/daily-accuracy.ts";

function makeCase(overrides: Partial<LearningCase> = {}): LearningCase {
  return {
    id: "c1",
    assetClass: "CRYPTO",
    assetName: "比特币",
    horizon: "daily",
    forecastDirection: "UP",
    actualDirection: "DOWN",
    verdict: "MISS",
    interpretationBiases: [
      {
        code: "overprecise_daily_timing",
        severity: 2,
        evidence: "逐日触发拆解过细",
      },
    ],
    lessonSummary: "lesson",
    futureCaution: "caution",
    confidenceAdjustment: -3,
    similarCaseKey: buildSimilarCaseKey({
      assetClass: "CRYPTO",
      horizon: "daily",
      direction: "UP",
      marketRegime: "unknown",
      structures: ["overprecise_daily_timing"],
    }),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("automation learning", () => {
  test("fewer than 3 similar cases does not adjust confidence", () => {
    const key = buildSimilarCaseKey({
      assetClass: "CRYPTO",
      horizon: "daily",
      direction: "UP",
      structures: ["overprecise_daily_timing"],
    });
    const similar = findSimilarCases([makeCase({ id: "a" }), makeCase({ id: "b" })], key, 10);
    const adj = computeLearningAdjustment(similar);
    assert.ok(similar.length < 3);
    assert.equal(adj.confidenceDelta, 0);
    assert.ok(adj.notes.some((n) => n.includes("少于3个")));
  });

  test("3-9 similar cases can adjust at most 5 points (before timing extra)", () => {
    const key = buildSimilarCaseKey({
      assetClass: "CRYPTO",
      horizon: "daily",
      direction: "UP",
      structures: ["x"],
    });
    const cases = Array.from({ length: 5 }, (_, i) =>
      makeCase({
        id: `c${i}`,
        verdict: "MISS",
        interpretationBiases: [],
        similarCaseKey: key,
      })
    );
    const adj = computeLearningAdjustment(findSimilarCases(cases, key, 10));
    assert.equal(adj.similarCaseCount, 5);
    assert.ok(Math.abs(adj.confidenceDelta) <= 5);
  });

  test("miss review infers at least one bias type", () => {
    const biases = inferBiasesFromMiss({
      predicted: "UP",
      actual: "DOWN",
      sourceType: "cycle_derivation",
      confidence: 72,
    });
    assert.ok(biases.length >= 1);
    assert.ok(biases.some((b) => b.code === "overprecise_daily_timing" || b.code === "insufficient_evidence"));
  });

  test("empty accuracy shows no fake rate", () => {
    const breakdown = assetAccuracyBreakdown([]);
    assert.ok(breakdown.every((b) => b.hitRate == null));
    const conf = confidenceAccuracyBreakdown([], []);
    assert.ok(conf.every((b) => b.hitRate == null));
  });

  test("composite summary without results is abstain copy", () => {
    const s = buildDailyCompositeSummary({ date: "2026-07-28", results: [], reviews: [] });
    assert.match(s.short, /暂无明确结论/);
  });

  test("HIT/MISS counted separately in asset breakdown", () => {
    const results: DailyVerificationResult[] = [
      {
        forecastId: "1",
        forecastDate: "2026-07-28",
        assetName: "比特币",
        symbol: "BTC",
        previousClose: 100,
        actualClose: 101,
        actualReturnPct: 1,
        actualDirection: "UP",
        verdict: "HIT",
        verdictLabel: "命中",
        verifiedAt: new Date().toISOString(),
        dataSource: "test",
      },
      {
        forecastId: "2",
        forecastDate: "2026-07-28",
        assetName: "比特币",
        symbol: "BTC",
        previousClose: 100,
        actualClose: 99,
        actualReturnPct: -1,
        actualDirection: "DOWN",
        verdict: "MISS",
        verdictLabel: "未命中",
        verifiedAt: new Date().toISOString(),
        dataSource: "test",
      },
    ];
    const btc = assetAccuracyBreakdown(results).find((a) => a.symbol === "BTC")!;
    assert.equal(btc.hit, 1);
    assert.equal(btc.miss, 1);
    assert.equal(btc.hitRate, 0.5);
  });

  test("learning never implies source code mutation — adjustment is data-only", () => {
    const adj = computeLearningAdjustment([
      makeCase({ id: "1", verdict: "MISS", similarCaseKey: "CRYPTO|daily|UP|unknown|a" }),
      makeCase({ id: "2", verdict: "MISS", similarCaseKey: "CRYPTO|daily|UP|unknown|a" }),
      makeCase({ id: "3", verdict: "MISS", similarCaseKey: "CRYPTO|daily|UP|unknown|a" }),
    ]);
    assert.equal(typeof adj.confidenceDelta, "number");
    assert.ok(Array.isArray(adj.notes));
    assert.ok(!("patchFiles" in adj));
  });
});
