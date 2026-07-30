import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickLocalized } from "../lib/i18n/config.ts";
import { getCycleAlignmentForAsset, getCycleAlignmentForRecord } from "../lib/data/cycle-alignments.ts";
import { getLiuYaoFactorAnalysis } from "../lib/data/liu-yao-factors.ts";
import { listResearchRecords } from "../lib/data/research-records.ts";

describe("BTC Liu Yao records (2026-07-27)", () => {
  it("includes short and mid cycle records exactly once", async () => {
    const records = await listResearchRecords();
    const ids = records.map((r) => r.id);
    assert.equal(ids.filter((id) => id === "MX-BTC-20260727-0806-LIUYAO-001").length, 1);
    assert.equal(ids.filter((id) => id === "MX-BTC-20260727-0907-LIUYAO-001").length, 1);
  });

  it("does not overwrite ORACLE-0009 annual BTC research", async () => {
    const records = await listResearchRecords();
    const annual = records.find((r) => r.id === "ORACLE-0009");
    assert.ok(annual);
    assert.equal(annual!.consensusEligible, true);
    assert.ok(pickLocalized(annual!.title, "zh-CN").includes("7月至9月"));
  });

  it("marks new records as pending human review and excluded from home", async () => {
    const records = await listResearchRecords();
    for (const id of ["MX-BTC-20260727-0806-LIUYAO-001", "MX-BTC-20260727-0907-LIUYAO-001"]) {
      const record = records.find((r) => r.id === id);
      assert.ok(record);
      assert.equal(record!.humanReviewStatus, "pending-review");
      assert.equal(record!.consensusEligible, false);
      assert.equal(record!.excludeFromHomeViews, true);
      assert.equal(record!.status, "pending");
    }
  });

  it("links factor analysis to both records", () => {
    const shortFactor = getLiuYaoFactorAnalysis("MX-BTC-20260727-0806-LIUYAO-001");
    const midFactor = getLiuYaoFactorAnalysis("MX-BTC-20260727-0907-LIUYAO-001");
    assert.ok(shortFactor);
    assert.ok(midFactor);
    assert.equal(shortFactor!.trendScore, 60);
    assert.equal(shortFactor!.volatilityScore, 75);
    assert.equal(midFactor!.trendScore, 64);
    assert.equal(midFactor!.volatilityScore, 82);
  });

  it("provides BTC cycle alignment score of 78 with three linked records", () => {
    const alignment = getCycleAlignmentForAsset("bitcoin");
    assert.ok(alignment);
    assert.equal(alignment!.alignmentScore, 78);
    assert.equal(alignment!.records.length, 3);
    assert.ok(alignment!.records.some((r) => r.recordId === "ORACLE-0009"));
    assert.ok(getCycleAlignmentForRecord("MX-BTC-20260727-0806-LIUYAO-001"));
  });

  it("uses correct six-spirit wording (no 朱雀发动)", async () => {
    const records = await listResearchRecords();
    const btcNew = records.filter((r) => r.id.startsWith("MX-BTC-20260727"));
    for (const record of btcNew) {
      const json = JSON.stringify(record);
      assert.ok(!json.includes("朱雀发动"));
      assert.ok(!json.includes("唯一动爻是朱雀"));
      assert.ok(!json.includes("用神固定排序"));
    }
  });
});
