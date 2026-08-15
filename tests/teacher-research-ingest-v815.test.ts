import assert from "node:assert/strict";
import test from "node:test";

import { listFocusResearchSupplements } from "../lib/data/conviction/focus-research-supplements";
import { teacherArchiveIngestStatus20260815, teacherResearch20260815 } from "../lib/data/teacher-research-20260815";
import { computeWeightedResearchVote, isResearchRecordEligibleForDirectionVote } from "../lib/research/weighted-research-vote";

test("the supplied archive is represented without treating untranscribed audio as evidence", () => {
  assert.deepEqual(teacherArchiveIngestStatus20260815, {
    textSourcesParsed: 29,
    chartImagesReviewed: 9,
    audioPendingTranscription: 3,
    policy: "UNTRANSCRIBED_AUDIO_CANNOT_INFLUENCE_RESEARCH",
  });
});

test("every newly ingested source stays provisional and cannot alter consensus or trading", () => {
  assert.ok(teacherResearch20260815.length >= 11);
  for (const row of teacherResearch20260815) {
    assert.equal(row.visibility, "internal");
    assert.equal(row.verificationEligibility, "provisional");
    assert.equal(row.consensusEligible, false);
    assert.equal(row.excludeFromLongTermConsensus, true);
    assert.equal(row.sourceStatus, "summary_only");
    assert.equal(isResearchRecordEligibleForDirectionVote(row), false);
    assert.ok(row.tags.includes("no-direction-score"));
    assert.ok(row.internalSourceRef);
    assert.ok(row.ingestedAt);
  }
});

test("the production vote returns ABSTAIN and no source ids for the entire supplied archive", () => {
  const vote = computeWeightedResearchVote({ records: teacherResearch20260815 });
  assert.equal(vote.lean, "ABSTAIN");
  assert.equal(vote.weightedDirection, 0);
  assert.equal(vote.frameworkCount, 0);
  assert.deepEqual(vote.sourceIds, []);
  assert.equal(vote.primaryRecord, null);
});

test("missing Liuyao charts produce auxiliary risk windows rather than formal weighted votes", () => {
  const wolf = teacherResearch20260815.filter((row) => row.tags.includes("source-chart-missing"));
  assert.equal(wolf.length, 6);
  assert.ok(wolf.every((row) => row.framework === "oracle-six-yao" && row.consensusEligible === false));

  const btc = wolf.find((row) => row.symbol === "BTC");
  assert.equal(btc?.direction, "neutral");
  assert.deepEqual(btc?.turningWindows?.map((item) => item.start ?? item.date), ["2026-08-19", "2026-08-23"]);
});

test("late Chan observations preserve stages but never backfill the historical forecast", () => {
  const lateChan = teacherResearch20260815.filter((row) => row.framework === "chan");
  assert.ok(lateChan.some((row) => row.symbol === "SNDK" && row.summary.zhCN.includes("30分钟三买")));
  assert.ok(lateChan.some((row) => row.symbol === "MU" && row.summary.zhCN.includes("冲高")));
  assert.ok(lateChan.every((row) => row.tags.includes("late-ingested") && row.consensusEligible === false));
});

test("member focus supplements expose Yi synthesis while preserving formal weekly authority", () => {
  const btc = listFocusResearchSupplements("bitcoin");
  const eth = listFocusResearchSupplements("eth");
  assert.equal(btc[0]?.status, "FORWARD_AUXILIARY");
  assert.equal(eth[0]?.status, "FORWARD_AUXILIARY");
  assert.match(btc[0]?.summary ?? "", /易老师综合解读/);
  assert.match(btc[0]?.gapNote ?? "", /不能升级为完整六爻证据或动态权重样本/);
  assert.ok([...btc, ...eth].every((row) => row.executionAuthority === "RESEARCH_ONLY" && row.includedInHistoricalHitRate === false));
});
