import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { teacher02Liuyao20260802Records } from "../lib/data/teacher02-liuyao-20260802.ts";
import { listResearchRecords } from "../lib/data/research-records.ts";
import {
  buildTeacherSourceBlend,
  summarizeTeacher02Verification,
  TEACHER_SOURCE_WEIGHT_PROFILES,
} from "../lib/research/teacher-source-weights.ts";
import { computeWeightedResearchVote } from "../lib/research/weighted-research-vote.ts";

describe("teacher02 external Liu-Yao source", () => {
  it("stores exactly five locked forward records without global consensus or standalone trading", () => {
    assert.equal(teacher02Liuyao20260802Records.length, 5);
    for (const record of teacher02Liuyao20260802Records) {
      assert.equal(record.forecastStart, "2026-08-03");
      assert.equal(record.forecastEnd, "2026-08-10");
      assert.equal(record.sourcePublishedAtVerified, true);
      assert.equal(record.verificationEligibility, "formal");
      assert.equal(record.consensusEligible, false);
      assert.equal(record.visibility, "internal");
      assert.ok(record.tags.includes("source:teacher02"));
      assert.ok(record.tags.includes("source-locked"));
      assert.ok(record.tags.includes("no-retroactive-edit"));
      assert.ok(record.tags.includes("no-auto-trade"));
    }
  });

  it("keeps every asset profile at 100 percent and applies asset-specific teacher02 weights", () => {
    for (const profile of TEACHER_SOURCE_WEIGHT_PROFILES) {
      assert.equal(
        profile.teacher01WeightPct + profile.teacher02WeightPct + profile.moonxExtensionWeightPct,
        100
      );
    }
    const gold = TEACHER_SOURCE_WEIGHT_PROFILES.find((item) => item.assetId === "gold");
    const silver = TEACHER_SOURCE_WEIGHT_PROFILES.find((item) => item.assetId === "silver");
    const eth = TEACHER_SOURCE_WEIGHT_PROFILES.find((item) => item.assetId === "ethereum");
    assert.equal(gold?.teacher02WeightPct, 45);
    assert.equal(silver?.teacher02WeightPct, 40);
    assert.equal(eth?.teacher02WeightPct, 25);
  });

  it("uses locked weekly authority and defaults to observation when evidence conflicts", async () => {
    const records = await listResearchRecords();
    const gold = buildTeacherSourceBlend({ assetId: "gold", asOfDate: "2026-08-03", records });
    const silver = buildTeacherSourceBlend({ assetId: "silver", asOfDate: "2026-08-03", records });
    const ndx = buildTeacherSourceBlend({ assetId: "nasdaq-100", asOfDate: "2026-08-03", records });
    const eth = buildTeacherSourceBlend({ assetId: "ethereum", asOfDate: "2026-08-03", records });
    const spx = buildTeacherSourceBlend({ assetId: "sp500", asOfDate: "2026-08-03", records });

    assert.equal(gold?.lean, "UP");
    assert.equal(gold?.alignment, "aligned");
    assert.equal(silver?.lean, "UP");
    assert.equal(ndx?.lean, "UP");
    assert.equal(eth?.lean, "UP");
    assert.equal(spx?.lean, "FLAT");
    assert.equal(spx?.alignment, "conflict");
    assert.equal(spx?.weightedDirection, 0);
    assert.equal(spx?.lean, "FLAT");
    assert.match(spx?.publicSummary ?? "", /默认观望且不输出方向/);
    assert.equal((gold?.teacher01EffectiveWeightPct ?? 0) + (gold?.teacher02EffectiveWeightPct ?? 0) + (gold?.moonxPathWeightPct ?? 0), 100);
    assert.equal(gold?.canTriggerTradeAlone, false);
    assert.equal(gold?.rev322Calibration?.version, "Rev3.2.2");
    assert.equal(eth?.rev322Calibration?.marketKind, "CONTINUOUS_7X24");
    assert.equal(spx?.rev322Calibration?.marketKind, "SECURITIES");

    const noMainSource = buildTeacherSourceBlend({
      assetId: "gold",
      asOfDate: "2026-08-03",
      records: teacher02Liuyao20260802Records,
    });
    // The locked weekly record is resolved independently; the auxiliary record
    // never becomes a standalone trading vote.
    assert.equal(noMainSource?.canTriggerTradeAlone, false);
  });

  it("counts one blended Liu-Yao framework rather than many duplicate votes", async () => {
    const records = await listResearchRecords();
    const blend = buildTeacherSourceBlend({ assetId: "gold", asOfDate: "2026-08-03", records });
    assert.ok(blend);
    const relevant = records.filter(
      (record) =>
        record.assetId === "gold" &&
        (!record.forecastStart || record.forecastStart <= "2026-08-03") &&
        (!record.forecastEnd || record.forecastEnd >= "2026-08-03")
    );
    const vote = computeWeightedResearchVote({ records: relevant, teacherBlend: blend });
    assert.notEqual(vote.lean, "ABSTAIN");
    assert.ok(vote.sourceIds.includes("T02-GOLD-20260803-0810"));
    assert.ok(vote.frameworkCount >= 1);
  });

  it("starts with pending samples and never fabricates a hit rate", async () => {
    const records = await listResearchRecords();
    const summary = summarizeTeacher02Verification(records);
    assert.equal(summary.totalForwardSamples, 7);
    assert.equal(summary.completedSamples, 0);
    assert.equal(summary.pendingSamples, 7);
    assert.equal(summary.directionHitRate, null);
  });
});
