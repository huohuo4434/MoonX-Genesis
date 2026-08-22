import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cycleResearchFcx20260822Records } from "@/lib/data/cycle-research-fcx-20260822";

describe("FCX cycle research 2026-08-22", () => {
  it("keeps the new source forward-locked, anonymous and research-only", () => {
    const record = cycleResearchFcx20260822Records[0];
    assert.equal(record.sourcePublishedAt, "2026-08-22T06:09:35.348Z");
    assert.equal(record.sourcePublishedAtVerified, true);
    assert.equal(record.publicSourceLabel.zhCN, "周期预测师");
    assert.equal(record.consensusEligible, false);
    assert.equal(record.excludeFromLongTermConsensus, true);
    assert.equal(record.excludeFromHomeViews, true);
    assert.equal(record.visibility, "internal");
    assert.ok(record.tags.includes("no-auto-trade"));
  });

  it("records explicit windows without inventing an invalidation", () => {
    const record = cycleResearchFcx20260822Records[0];
    assert.equal(record.turningWindows?.length, 5);
    assert.deepEqual(record.targets, [85]);
    assert.match(record.invalidation?.zhCN ?? "", /未明确/);
    assert.match(record.invalidation?.zhCN ?? "", /不得补造/);
  });

  it("does not expose the private author identity in member-facing text", () => {
    const record = cycleResearchFcx20260822Records[0];
    const publicPayload = JSON.stringify({
      label: record.publicSourceLabel,
      title: record.title,
      summary: record.summary,
      thesis: record.thesis,
      risks: record.risks,
      turningWindows: record.turningWindows,
    }).toLowerCase();
    assert.doesNotMatch(publicPayload, /agentmat/);
    assert.doesNotMatch(publicPayload, /substack\.com/);
  });
});
