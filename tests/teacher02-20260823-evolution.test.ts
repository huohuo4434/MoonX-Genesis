import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TEACHER02_FORWARD_WINDOWS_20260823,
  TEACHER02_REVIEW_EVOLUTION_POLICY_20260823,
  TEACHER02_SOURCE_CLOCK_POLICIES_20260823,
  teacher02Liuyao20260823Records,
} from "../lib/data/teacher02-liuyao-20260823.ts";
import { WEEKLY_WOLF_REVISIONS_20260823 } from "../lib/data/published-weekly-wolf-20260823.ts";
import { listResearchRecords } from "../lib/data/research-records.ts";
import { buildWeeklyMarketSlots, listAllWeeklyAnalyses } from "../lib/data/weekly-analysis.ts";
import { buildTeacherSourceBlend, getTeacherSourceWeightProfile } from "../lib/research/teacher-source-weights.ts";
import { policyForTags } from "../lib/research/external-source-policy.ts";

describe("teacher02 2026-08-23 asset-specialist evolution", () => {
  it("locks only the two complete forward forecasts and never invents ETH", () => {
    assert.equal(teacher02Liuyao20260823Records.length, 2);
    assert.deepEqual(teacher02Liuyao20260823Records.map((record) => record.assetId).sort(), ["gold", "silver"]);
    for (const record of teacher02Liuyao20260823Records) {
      assert.equal(record.forecastStart, "2026-08-24");
      assert.equal(record.forecastEnd, "2026-08-28");
      assert.equal(record.sourcePublishedAt, null);
      assert.equal(record.sourcePublishedAtVerified, false);
      assert.equal(record.consensusEligible, false);
      assert.equal(record.visibility, "internal");
      assert.ok(record.tags.includes("source-locked"));
      assert.ok(record.tags.includes("no-retroactive-edit"));
      assert.ok(record.tags.includes("no-auto-trade"));
      assert.ok(record.tags.includes("source-timezone:America/New_York"));
      assert.equal(record.publicSourceLabel.zhCN, "贵金属六爻分析师");
      assert.doesNotMatch(record.publicSourceLabel.zhCN, /狼叔/);
    }

    const gold = teacher02Liuyao20260823Records.find((record) => record.assetId === "gold");
    const silver = teacher02Liuyao20260823Records.find((record) => record.assetId === "silver");
    assert.equal(gold?.hexagramPrimary, undefined);
    assert.match(gold?.thesis.map((item) => item.zhCN).join(" ") ?? "", /风水涣.*山雷颐.*巽为风.*三爻动/);
    assert.match(silver?.thesis.map((item) => item.zhCN).join(" ") ?? "", /天雷无妄.*风山渐.*火雷噬嗑.*五爻动/);
  });

  it("keeps GLD and SLV in New York time and ETH in UTC", () => {
    const gold = TEACHER02_SOURCE_CLOCK_POLICIES_20260823.find((item) => item.assetId === "gold");
    const silver = TEACHER02_SOURCE_CLOCK_POLICIES_20260823.find((item) => item.assetId === "silver");
    const eth = TEACHER02_SOURCE_CLOCK_POLICIES_20260823.find((item) => item.assetId === "ethereum");
    assert.equal(gold?.sourceTimeZone, "America/New_York");
    assert.equal(silver?.sourceTimeZone, "America/New_York");
    assert.equal(eth?.sourceTimeZone, "UTC");
    assert.equal(eth?.hasNewForwardForecast, false);
    assert.equal(TEACHER02_FORWARD_WINDOWS_20260823.length, 6);
    assert.ok(TEACHER02_FORWARD_WINDOWS_20260823.every((item) => /-04:00$/.test(item.startAt) && /-04:00$/.test(item.endAt)));
    assert.equal(TEACHER02_FORWARD_WINDOWS_20260823.find((item) => item.assetId === "gold" && item.phase === "WASHOUT")?.endAt, "2026-08-25T14:22:00-04:00");
    assert.equal(TEACHER02_FORWARD_WINDOWS_20260823.find((item) => item.assetId === "silver" && item.phase === "WASHOUT")?.endAt, "2026-08-25T12:00:00-04:00");
  });

  it("raises future base weights without granting standalone authority", () => {
    assert.equal(getTeacherSourceWeightProfile("gold")?.teacher02WeightPct, 45);
    assert.equal(getTeacherSourceWeightProfile("silver")?.teacher02WeightPct, 40);
    assert.equal(getTeacherSourceWeightProfile("ethereum")?.teacher02WeightPct, 25);
    const policy = policyForTags(["policy:teacher02-liuyao"]);
    assert.equal(policy.maxWeight, 45);
    assert.equal(policy.automaticConsensus, false);
  });

  it("publishes additive gold and silver weekly versions while preserving old rows", () => {
    assert.deepEqual(WEEKLY_WOLF_REVISIONS_20260823.map((record) => [record.assetId, record.version]), [["gold", 3], ["silver", 2]]);
    const all = listAllWeeklyAnalyses();
    assert.ok(all.some((record) => record.id === "WEEKLY-GOLD-20260824-V2"));
    assert.ok(all.some((record) => record.id === "WEEKLY-GOLD-20260824-V3"));
    assert.ok(all.some((record) => record.id === "WEEKLY-SILVER-20260824-V1"));
    assert.ok(all.some((record) => record.id === "WEEKLY-SILVER-20260824-V2"));

    const slots = buildWeeklyMarketSlots(new Date("2026-08-23T04:00:00Z"));
    const gold = slots.find((slot) => slot.kind === "published" && slot.analysis.assetId === "gold");
    const silver = slots.find((slot) => slot.kind === "published" && slot.analysis.assetId === "silver");
    assert.equal(gold?.kind, "published");
    assert.equal(silver?.kind, "published");
    if (gold?.kind === "published") {
      assert.equal(gold.analysis.id, "WEEKLY-GOLD-20260824-V3");
      assert.equal(gold.analysis.overallDirection, "先跌后涨");
    }
    if (silver?.kind === "published") {
      assert.equal(silver.analysis.id, "WEEKLY-SILVER-20260824-V2");
      assert.equal(silver.analysis.overallDirection, "震荡");
    }
  });

  it("aligns the new gold and silver records but leaves ETH unchanged without a current source", async () => {
    const records = await listResearchRecords();
    const gold = buildTeacherSourceBlend({ assetId: "gold", asOfDate: "2026-08-24", records });
    const silver = buildTeacherSourceBlend({ assetId: "silver", asOfDate: "2026-08-24", records });
    const eth = buildTeacherSourceBlend({ assetId: "ethereum", asOfDate: "2026-08-24", records });
    assert.equal(gold?.teacher02RecordId, "T02-GOLD-20260824-0828-V1");
    assert.equal(gold?.alignment, "aligned");
    assert.equal(gold?.teacher02EffectiveWeightPct, 45);
    assert.equal(silver?.teacher02RecordId, "T02-SILVER-20260824-0828-V1");
    assert.equal(silver?.alignment, "aligned");
    assert.equal(silver?.teacher02EffectiveWeightPct, 40);
    assert.equal(eth, null);
  });

  it("separates direction and timing review and keeps formulas source-bounded", () => {
    assert.equal(TEACHER02_REVIEW_EVOLUTION_POLICY_20260823.visibleSourceMethodVersion, "Rev3.2.9-h");
    assert.equal(TEACHER02_REVIEW_EVOLUTION_POLICY_20260823.completeFormulaRecovered, false);
    assert.match(TEACHER02_REVIEW_EVOLUTION_POLICY_20260823.rules.join(" "), /方向.*时间.*分开/);
    assert.match(TEACHER02_REVIEW_EVOLUTION_POLICY_20260823.rules.join(" "), /不覆盖.*失败样本/);
  });
});
