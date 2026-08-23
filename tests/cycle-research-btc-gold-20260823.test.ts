import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cycleResearchBtcGold20260823Records } from "@/lib/data/cycle-research-btc-gold-20260823";
import { listResearchRecords } from "@/lib/data/research-records";

describe("BTC and gold cycle research 2026-08-23", () => {
  it("stores two new forward records as anonymous, member-only research", () => {
    assert.deepEqual(cycleResearchBtcGold20260823Records.map((record) => record.id), [
      "CYCLE-RESEARCH-BTC-20260823",
      "CYCLE-RESEARCH-GOLD-20260823",
    ]);
    for (const record of cycleResearchBtcGold20260823Records) {
      assert.equal(record.sourcePublishedAt, "2026-08-23");
      assert.equal(record.publicSourceLabel.zhCN, "周期预测师");
      assert.equal(record.accessLevel, "member");
      assert.equal(record.consensusEligible, false);
      assert.equal(record.excludeFromLongTermConsensus, true);
      assert.equal(record.excludeFromHomeViews, true);
      assert.equal(record.visibility, "internal");
      assert.ok(record.tags.includes("no-auto-trade"));
    }
  });

  it("registers both records in the central research store exactly once", async () => {
    const records = await listResearchRecords();
    for (const expected of cycleResearchBtcGold20260823Records) {
      assert.equal(records.filter((record) => record.id === expected.id).length, 1);
    }
  });

  it("preserves explicit BTC windows and the two-peak September path", () => {
    const btc = cycleResearchBtcGold20260823Records[0];
    assert.equal(btc.turningWindows?.length, 7);
    assert.match(btc.turningWindows?.find((window) => window.id === "btc-high-1-20260909")?.note?.zhCN ?? "", /86,000至89,000/);
    assert.match(btc.turningWindows?.find((window) => window.id === "btc-high-2-20260923")?.note?.zhCN ?? "", /87,000至91,000/);
    assert.match(btc.summary.zhCN, /基本同向/);
    assert.match(btc.summary.zhCN, /不改变MOOX正式方向/);
  });

  it("keeps the gold disagreement visible and labels base versus tail scenarios without invented weights", () => {
    const gold = cycleResearchBtcGold20260823Records[1];
    assert.equal(gold.turningWindows?.length, 10);
    assert.match(gold.summary.zhCN, /并不完全一致/);
    assert.match(gold.risks?.[0]?.zhCN ?? "", /老师周卦\/月卦为准/);
    const majorLow = gold.turningWindows?.find((window) => window.id === "gold-major-low-20261027")?.note?.zhCN ?? "";
    assert.match(majorLow, /基础3,950至4,120/);
    assert.match(majorLow, /偏空3,800至3,950/);
    assert.match(majorLow, /尾部3,650至3,800/);
    assert.equal(gold.priceScenarios, undefined);
  });

  it("does not invent invalidation or expose the paid source in member-facing fields", () => {
    for (const record of cycleResearchBtcGold20260823Records) {
      assert.match(record.invalidation?.zhCN ?? "", /没有给出独立失效价/);
      assert.match(record.invalidation?.zhCN ?? "", /不得补造/);
      const memberPayload = JSON.stringify({
        label: record.publicSourceLabel,
        title: record.title,
        summary: record.summary,
        thesis: record.thesis,
        risks: record.risks,
        turningWindows: record.turningWindows,
      }).toLowerCase();
      assert.doesNotMatch(memberPayload, /agentmat/);
      assert.doesNotMatch(memberPayload, /substack\.com/);
      assert.doesNotMatch(memberPayload, /https?:\/\//);
    }
  });
});
