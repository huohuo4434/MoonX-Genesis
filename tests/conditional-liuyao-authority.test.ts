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
): LiuyaoCandidate => ({
  ...evidence(source === "TEACHER" ? "teacher" : "user", direction),
  source,
  sourceKind: source === "TEACHER" ? "WOLF_TEACHER" : "USER_TEACHER_METHOD",
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

  test("keeps teacher soft priority when Qimen, Chan or analyst majority is missing", () => {
    const noQimen = resolveConditionalLiuyaoAuthority({ ...base, qimen: null });
    const noChan = resolveConditionalLiuyaoAuthority({ ...base, chan: null });
    const noMajority = resolveConditionalLiuyaoAuthority({
      ...base,
      analystViews: [evidence("a", "先涨后跌"), evidence("b", "下跌"), evidence("c", "下跌")],
    });
    for (const result of [noQimen, noChan, noMajority]) {
      assert.equal(result.selectedSource, "TEACHER");
      assert.equal(result.reason, "TEACHER_RETAINS_SOFT_PRIORITY");
      assert.equal(result.confidenceAdjustment, -10);
    }
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
    assert.equal(result.selectedSource, "TEACHER");
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
    assert.equal(result.selectedSource, "TEACHER");
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
      assert.equal(result.selectedSource, "TEACHER");
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

  test("policy makes teacher priority slight and requires three independent analysts", () => {
    assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.defaultTeacherWeightPct, 55);
    assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.defaultUserWeightPct, 45);
    assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.minimumIndependentAnalysts, 3);
  });
});
