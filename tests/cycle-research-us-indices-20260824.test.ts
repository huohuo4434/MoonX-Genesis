import assert from "node:assert/strict";
import test from "node:test";
import { cycleResearchUsIndices20260824Records } from "../lib/data/cycle-research-us-indices-20260824";
import { listResearchRecords } from "../lib/data/research-records";

test("Aug 24 US-index cycle records stay anonymized and research-only", () => {
  assert.equal(cycleResearchUsIndices20260824Records.length, 2);
  for (const record of cycleResearchUsIndices20260824Records) {
    assert.equal(record.publicSourceLabel.zhCN, "周期预测师");
    assert.equal(record.accessLevel, "member");
    assert.equal(record.visibility, "internal");
    assert.equal(record.consensusEligible, false);
    assert.equal(record.excludeFromHomeViews, true);
    assert.equal(record.excludeFromLongTermConsensus, true);
    assert.ok(record.tags.includes("no-auto-trade"));
    const memberFacing = JSON.stringify({
      title: record.title,
      summary: record.summary,
      thesis: record.thesis,
      risks: record.risks,
      invalidation: record.invalidation,
      horizon: record.horizon,
      turningWindows: record.turningWindows,
    });
    assert.doesNotMatch(memberFacing, /AgentMat/i);
    assert.doesNotMatch(memberFacing, /substack/i);
  }
});

test("QQQ chart dates are explicit but chart-axis prices are not promoted to targets", () => {
  const record = cycleResearchUsIndices20260824Records.find((item) => item.sourceSymbol === "QQQ");
  assert.ok(record);
  assert.deepEqual(record.turningWindows?.map((item) => item.date), ["2026-08-25", "2026-08-27", "2026-08-31"]);
  assert.equal(record.targets, undefined);
  assert.equal(record.supports, undefined);
  assert.equal(record.resistances, undefined);
  assert.match(record.invalidation?.zhCN ?? "", /原文未明确/);
});

test("SPY GEX record aligns with locked fade risk without changing formal direction", () => {
  const record = cycleResearchUsIndices20260824Records.find((item) => item.sourceSymbol === "SPY");
  assert.ok(record);
  assert.equal(record.direction, "neutral");
  assert.equal(record.forecastEnd, "2026-08-28");
  assert.match(record.horizon.zhCN, /美股交易周/);
  assert.equal(record.turningWindows?.[0]?.date, "2026-08-26");
  assert.match(record.turningWindows?.[0]?.note?.zhCN ?? "", /原文未明确时区/);
  assert.match(record.summary.zhCN, /冲高后兑现/);
  assert.match(record.thesis[1].zhCN, /-8\.079亿美元/);
  assert.match(record.risks?.[0]?.zhCN ?? "", /不提高方向权重/);
});

test("both records are wired into the research loader exactly once", async () => {
  const ids = (await listResearchRecords()).map((record) => record.id);
  for (const expected of ["CYCLE-RESEARCH-NDX-20260824", "CYCLE-RESEARCH-SPX-GEX-20260824"]) {
    assert.equal(ids.filter((id) => id === expected).length, 1);
  }
});
