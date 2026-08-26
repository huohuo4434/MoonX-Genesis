import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CONDITIONAL_LIUYAO_AUTHORITY_POLICY,
  arbitrationDirection,
  resolveConditionalLiuyaoAuthority,
  type ArbitrationEvidence,
  type LiuyaoCandidate,
} from "../lib/forecasts/conditional-liuyao-authority.ts";

const evidence = (sourceId: string, direction: string): ArbitrationEvidence => ({
  sourceId,
  assetKey: "BTC",
  horizonKey: "DAILY_PATH",
  targetWindowKey: "2026-08-24",
  direction,
  eligible: true,
  forwardLocked: true,
});

const candidate = (
  source: "TEACHER" | "USER",
  direction: string,
  sourceKind: LiuyaoCandidate["sourceKind"] = source === "TEACHER" ? "WOLF_TEACHER" : "USER_TEACHER_METHOD",
): LiuyaoCandidate => ({
  ...evidence(source === "TEACHER" ? "teacher" : "user", direction),
  source,
  sourceKind,
});

const base = {
  stage: "PRE_PUBLICATION" as const,
  teacher: candidate("TEACHER", "下跌"),
  user: candidate("USER", "先涨后跌"),
  qimen: evidence("qimen", "先涨后跌"),
  chan: evidence("chan", "先涨后跌"),
  analystViews: [
    evidence("analyst-a", "先涨后跌"),
    evidence("analyst-b", "先涨后跌"),
    evidence("analyst-c", "下跌"),
  ],
};

describe("conditional Liuyao source authority", () => {
  test("distinguishes a rise-then-fall path from a plain bearish call", () => {
    assert.equal(arbitrationDirection("冲高回落"), "UP_THEN_DOWN");
    assert.equal(arbitrationDirection("下跌"), "DOWN");
  });

  test("selects the user Liuyao only when all three independent layers align", () => {
    const result = resolveConditionalLiuyaoAuthority(base);
    assert.equal(result.selectedSource, "USER");
    assert.equal(result.selectedDirection, "先涨后跌");
    assert.equal(result.reason, "USER_SELECTED_BY_STRICT_CROSS_METHOD_CONSENSUS");
    assert.equal(result.strictConsensusPassed, true);
    assert.equal(result.showBoth, true);
    assert.equal(result.externalLayersSetDirectionDirectly, false);
  });

  test("keeps Wolf and user equal and requires human review when tie-break evidence is incomplete", () => {
    const noQimen = resolveConditionalLiuyaoAuthority({ ...base, qimen: null });
    const noChan = resolveConditionalLiuyaoAuthority({ ...base, chan: null });
    const noMajority = resolveConditionalLiuyaoAuthority({
      ...base,
      analystViews: [evidence("a", "先涨后跌"), evidence("b", "下跌"), evidence("c", "下跌")],
    });
    for (const result of [noQimen, noChan, noMajority]) {
      assert.equal(result.selectedSource, null);
      assert.equal(result.selectedDirection, null);
      assert.equal(result.reason, "WOLF_USER_EQUAL_CONFLICT_REQUIRES_HUMAN_REVIEW");
      assert.equal(result.confidenceAdjustment, -12);
    }
  });

  test("gives Bingwu the unique first priority even when all tie-break layers support the user", () => {
    const result = resolveConditionalLiuyaoAuthority({
      ...base,
      teacher: candidate("TEACHER", "下跌", "BINGWU_TEACHER"),
    });
    assert.equal(result.selectedSource, "TEACHER");
    assert.equal(result.selectedDirection, "下跌");
    assert.equal(result.reason, "BINGWU_TEACHER_HAS_UNIQUE_PRIORITY");
    assert.equal(result.showBoth, true);
    assert.equal(result.confidenceAdjustment, -5);
  });

  test("can select Wolf only when all three independent tie-break layers support Wolf", () => {
    const result = resolveConditionalLiuyaoAuthority({
      ...base,
      qimen: evidence("qimen", "下跌"),
      chan: evidence("chan", "下跌"),
      analystViews: [
        evidence("analyst-a", "下跌"),
        evidence("analyst-b", "下跌"),
        evidence("analyst-c", "先涨后跌"),
      ],
    });
    assert.equal(result.selectedSource, "TEACHER");
    assert.equal(result.selectedDirection, "下跌");
    assert.equal(result.reason, "WOLF_SELECTED_BY_STRICT_CROSS_METHOD_CONSENSUS");
    assert.equal(result.strictConsensusPassed, true);
  });

  test("deduplicates analyst identities before calculating strict majority", () => {
    const result = resolveConditionalLiuyaoAuthority({
      ...base,
      analystViews: [
        evidence("same", "先涨后跌"),
        evidence("same", "先涨后跌"),
        evidence("other", "下跌"),
      ],
    });
    assert.equal(result.analystEligibleCount, 2);
    assert.equal(result.selectedSource, null);
  });

  test("excludes one analyst's conflicting same-window posts instead of using the last post", () => {
    const result = resolveConditionalLiuyaoAuthority({
      ...base,
      analystViews: [
        evidence("same", "先涨后跌"),
        evidence("same", "下跌"),
        evidence("other-a", "先涨后跌"),
        evidence("other-b", "先涨后跌"),
      ],
    });
    assert.equal(result.analystEligibleCount, 2);
    assert.equal(result.selectedSource, null);
  });

  test("rejects cross-asset, cross-window and unrecognized evidence", () => {
    const wrongWindow = resolveConditionalLiuyaoAuthority({
      ...base,
      qimen: { ...evidence("qimen", "先涨后跌"), targetWindowKey: "2026-08-25" },
    });
    const unknownChan = resolveConditionalLiuyaoAuthority({
      ...base,
      chan: evidence("chan", "暂无结构"),
    });
    const wrongAssetAnalysts = resolveConditionalLiuyaoAuthority({
      ...base,
      analystViews: [
        { ...evidence("a", "先涨后跌"), assetKey: "ETH" },
        { ...evidence("b", "先涨后跌"), assetKey: "ETH" },
        { ...evidence("c", "先涨后跌"), assetKey: "ETH" },
      ],
    });
    for (const result of [wrongWindow, unknownChan, wrongAssetAnalysts]) {
      assert.equal(result.selectedSource, null);
      assert.equal(result.strictConsensusPassed, false);
    }
  });

  test("never rewrites a locked teacher publication", () => {
    const result = resolveConditionalLiuyaoAuthority({
      ...base,
      stage: "LOCKED",
      lockedSource: "TEACHER",
    });
    assert.equal(result.selectedSource, "TEACHER");
    assert.equal(result.reason, "LOCKED_RECORD_IMMUTABLE");
    assert.equal(result.requiresNewVersion, true);
    assert.equal(result.strictConsensusPassed, false);
  });

  test("policy makes Bingwu uniquely first and Wolf equal to the user", () => {
    assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.uniquePrioritySourceKind, "BINGWU_TEACHER");
    assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.bingwuTeacherHasUniquePriority, true);
    assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.defaultWolfWeightPct, 50);
    assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.defaultUserWeightPct, 50);
    assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.minimumIndependentAnalysts, 3);
  });
});
