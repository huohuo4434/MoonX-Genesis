import assert from "node:assert/strict";
import test from "node:test";
import { cycleResearchMarketClose20260825Records } from "../lib/data/cycle-research-market-close-20260825";
import { listResearchRecords } from "../lib/data/research-records";
import { isResearchRecordEligibleForDirectionVote } from "../lib/research/weighted-research-vote";

test("Aug 25 closing observation is anonymized and research-only", () => {
  assert.equal(cycleResearchMarketClose20260825Records.length, 2);
  const record = cycleResearchMarketClose20260825Records.find(
    (item) => item.id === "CYCLE-RESEARCH-US-MARKET-CLOSE-20260825"
  )!;

  assert.equal(record.id, "CYCLE-RESEARCH-US-MARKET-CLOSE-20260825");
  assert.equal(record.publicSourceLabel.zhCN, "周期预测师");
  assert.equal(record.accessLevel, "member");
  assert.equal(record.visibility, "internal");
  assert.equal(record.consensusEligible, false);
  assert.equal(record.excludeFromHomeViews, true);
  assert.equal(record.excludeFromLongTermConsensus, true);
  assert.equal(record.direction, "bearish");
  assert.ok(record.tags.includes("no-auto-trade"));

  const memberFacing = JSON.stringify({
    title: record.title,
    summary: record.summary,
    thesis: record.thesis,
    risks: record.risks,
    invalidation: record.invalidation,
    horizon: record.horizon,
  });
  assert.doesNotMatch(memberFacing, /AgentMat/i);
  assert.doesNotMatch(memberFacing, /substack/i);
});

test("missing asset detail, levels, end date and invalidation are not invented", () => {
  const record = cycleResearchMarketClose20260825Records.find(
    (item) => item.id === "CYCLE-RESEARCH-US-MARKET-CLOSE-20260825"
  )!;

  assert.equal(record.symbol, undefined);
  assert.equal(record.forecastEnd, undefined);
  assert.equal(record.expiresAt, undefined);
  assert.equal(record.targets, undefined);
  assert.equal(record.supports, undefined);
  assert.equal(record.resistances, undefined);
  assert.equal(record.turningWindows, undefined);
  assert.match(record.horizon.zhCN, /结束时间未明确/);
  assert.match(record.thesis[1].zhCN, /正文没有明确具体指数/);
  assert.match(record.thesis[3].zhCN, /不得补造/);
  assert.match(record.invalidation?.zhCN ?? "", /原文未明确失效条件/);
});

test("new SPY downside levels stay explicit, anonymous and isolated from formal direction", () => {
  const record = cycleResearchMarketClose20260825Records.find(
    (item) => item.id === "CYCLE-RESEARCH-SPY-DOWNSIDE-20260825"
  )!;

  assert.equal(record.symbol, "SPX");
  assert.equal(record.sourceSymbol, "SPY");
  assert.equal(record.forecastStart, "2026-08-26");
  assert.equal(record.forecastEnd, "2026-08-27");
  assert.equal(record.direction, "bearish");
  assert.equal(record.consensusEligible, false);
  assert.equal(record.excludeFromHomeViews, true);
  assert.equal(record.excludeFromLongTermConsensus, true);
  assert.equal(record.targets, undefined, "SPY levels must not become SPX index targets");
  assert.equal(record.publicSourceLabel.zhCN, "周期预测师");
  assert.ok(record.tags.includes("levels-are-spy-not-spx"));
  assert.ok(record.tags.includes("research-only"));
  assert.ok(record.tags.includes("no-auto-trade"));
  assert.equal(isResearchRecordEligibleForDirectionVote(record), false);
  assert.deepEqual(record.turningWindows?.[0] && {
    start: record.turningWindows[0].start,
    end: record.turningWindows[0].end,
  }, { start: "2026-08-26", end: "2026-08-27" });

  const memberFacing = JSON.stringify({
    title: record.title,
    summary: record.summary,
    thesis: record.thesis,
    risks: record.risks,
    invalidation: record.invalidation,
    horizon: record.horizon,
  });
  for (const level of ["760", "755", "750"]) assert.match(memberFacing, new RegExp(level));
  assert.match(record.summary.zhCN, /至少可能触及其中两个/);
  assert.doesNotMatch(record.summary.zhCN, /前后/);
  assert.match(record.summary.zhCN, /SPY ETF点位，不是SPX指数点位/);
  assert.doesNotMatch(memberFacing, /AgentMat/i);
  assert.doesNotMatch(memberFacing, /substack/i);
});

test("closing observation is appended once without replacing the earlier index records", async () => {
  const records = await listResearchRecords();
  const ids = records.map((record) => record.id);

  assert.equal(ids.filter((id) => id === "CYCLE-RESEARCH-US-MARKET-CLOSE-20260825").length, 1);
  assert.equal(ids.filter((id) => id === "CYCLE-RESEARCH-NDX-20260824").length, 1);
  assert.equal(ids.filter((id) => id === "CYCLE-RESEARCH-SPX-GEX-20260824").length, 1);
  assert.equal(ids.filter((id) => id === "CYCLE-RESEARCH-SPY-DOWNSIDE-20260825").length, 1);
});
