import assert from "node:assert/strict";
import test from "node:test";

import { listFocusResearchSupplements } from "../lib/data/conviction/focus-research-supplements";
import { teacherArchiveIngestStatus20260815, teacherResearch20260815 } from "../lib/data/teacher-research-20260815";
import { listResearchRecords } from "../lib/data/research-records";
import { buildTeacherSourceBlend } from "../lib/research/teacher-source-weights";
import { computeConsensus } from "../lib/research/consensus-engine";
import { computeWeightedResearchVote, isResearchRecordEligibleForDirectionVote } from "../lib/research/weighted-research-vote";

test("the supplied archive is represented without treating untranscribed audio as evidence", () => {
  assert.deepEqual(teacherArchiveIngestStatus20260815, {
    textSourcesParsed: 29,
    chartImagesReviewed: 9,
    audioPendingTranscription: 3,
    policy: "AUDIO_TRANSCRIPT_CAN_ENTER_BOUNDED_FORWARD_RESEARCH",
  });
});

test("forward verbal forecasts enter bounded research while late material stays provisional", () => {
  assert.ok(teacherResearch20260815.length >= 11);
  const verbal = teacherResearch20260815.filter((row) => row.tags.includes("source-mode:audio-transcript"));
  const late = teacherResearch20260815.filter((row) => !row.tags.includes("source-mode:audio-transcript"));
  assert.equal(verbal.length, 6);
  for (const row of verbal) {
    assert.equal(row.visibility, "internal");
    assert.equal(row.verificationEligibility, "forward-audio");
    assert.equal(row.consensusEligible, true);
    assert.equal(row.excludeFromLongTermConsensus, true);
    assert.equal(row.sourceStatus, "summary_only");
    assert.equal(isResearchRecordEligibleForDirectionVote(row), true);
    assert.ok(row.tags.includes("source-locked"));
    assert.ok(!row.tags.includes("no-direction-score"));
    assert.ok(row.internalSourceRef);
    assert.ok(row.ingestedAt);
  }
  for (const row of late) {
    assert.equal(row.verificationEligibility, "provisional");
    assert.equal(row.consensusEligible, false);
    assert.equal(isResearchRecordEligibleForDirectionVote(row), false);
    assert.ok(row.tags.includes("no-direction-score"));
  }
});

test("the production vote uses one bounded verbal Liuyao framework vote and excludes late records", () => {
  const vote = computeWeightedResearchVote({ records: teacherResearch20260815 });
  assert.notEqual(vote.lean, "ABSTAIN");
  assert.equal(vote.frameworkCount, 1);
  assert.ok(vote.sourceIds.length > 0);
  assert.ok(vote.sourceIds.every((id) => id.startsWith("SOURCE-WOLF-")));
  assert.ok(vote.primaryRecord?.tags.includes("source-mode:audio-transcript"));
  const ndx = computeWeightedResearchVote({ records: teacherResearch20260815.filter((row) => row.symbol === "NDX") });
  assert.equal(ndx.lean, "DOWN");
  assert.deepEqual(ndx.sourceIds, ["SOURCE-WOLF-NDX-WEEK-20260815"]);
  const lateLock = { ...teacherResearch20260815.find((row) => row.symbol === "NDX")!, id: "LATE-AUDIO", ingestedAt: "2026-08-18T00:00:00.000Z" };
  assert.equal(isResearchRecordEligibleForDirectionVote(lateLock), false);
});

test("missing Liuyao charts remain labelled verbal but can cast a bounded forward vote", () => {
  const wolf = teacherResearch20260815.filter((row) => row.tags.includes("source-chart-missing"));
  assert.equal(wolf.length, 6);
  assert.ok(wolf.every((row) => row.framework === "oracle-six-yao" && row.consensusEligible === true && row.editorialConfidence <= 54));

  const btc = wolf.find((row) => row.symbol === "BTC");
  assert.equal(btc?.direction, "neutral");
  assert.deepEqual(btc?.turningWindows?.map((item) => item.start ?? item.date), ["2026-08-19", "2026-08-23"]);
});

test("forward audio cannot bypass interpretation confirmation invalidation or verified-lock requirements", () => {
  const base = teacherResearch20260815.find((row) => row.symbol === "NDX")!;
  const evidence = base.verbalForecastEvidence!;
  const invalid = [
    { ...base, verbalForecastEvidence: { ...evidence, interpretation: "太短" } },
    { ...base, verbalForecastEvidence: { ...evidence, confirmation: "" } },
    { ...base, verbalForecastEvidence: { ...evidence, invalidation: "" } },
    { ...base, sourcePublishedAtVerified: false },
    { ...base, forecastStart: "2026-08-18", ingestedAt: "2026-08-18T01:00:00.000Z" },
  ];
  assert.ok(invalid.every((row) => !isResearchRecordEligibleForDirectionVote(row)));
  assert.ok(invalid.every((row) => computeWeightedResearchVote({ records: [row] }).lean === "ABSTAIN"));
  const secondValid = { ...base, id: "VALID-AUDIO-NDX-2" };
  assert.equal(computeConsensus("nasdaq-100", [invalid[1]!, secondValid], new Date("2026-08-19T00:00:00.000Z")).eligibleCount, 1);
});

test("an available teacher blend gives forward verbal interpretation 8 percent without exceeding 100", async () => {
  const records = await listResearchRecords();
  const verbal = teacherResearch20260815.find((row) => row.symbol === "GLD")!;
  const blend = buildTeacherSourceBlend({
    assetId: "gold",
    asOfDate: "2026-08-03",
    records: [...records, {
      ...verbal,
      id: "FORWARD-AUDIO-GOLD-20260803",
      sourcePublishedAt: "2026-08-02T01:00:00.000Z",
      ingestedAt: "2026-08-02T02:00:00.000Z",
      forecastStart: "2026-08-03",
      forecastEnd: "2026-08-10",
    }],
  });
  assert.equal(blend?.verbalInterpretationWeightPct, 8);
  assert.equal(blend?.verbalInterpretationRecordId, "FORWARD-AUDIO-GOLD-20260803");
  assert.equal((blend?.teacher01EffectiveWeightPct ?? 0) + (blend?.teacher02EffectiveWeightPct ?? 0) + (blend?.verbalInterpretationWeightPct ?? 0) + (blend?.moonxPathWeightPct ?? 0), 100);
  assert.ok(blend?.sourceIds.includes("FORWARD-AUDIO-GOLD-20260803"));
  assert.equal(blend?.canTriggerTradeAlone, false);
  const withoutInvalidation = buildTeacherSourceBlend({
    assetId: "gold",
    asOfDate: "2026-08-03",
    records: [...records, {
      ...verbal,
      id: "INVALID-AUDIO-GOLD-20260803",
      sourcePublishedAt: "2026-08-02T01:00:00.000Z",
      ingestedAt: "2026-08-02T02:00:00.000Z",
      forecastStart: "2026-08-03",
      forecastEnd: "2026-08-10",
      verbalForecastEvidence: { ...verbal.verbalForecastEvidence!, invalidation: "" },
    }],
  });
  assert.equal(withoutInvalidation?.verbalInterpretationWeightPct, 0);
  assert.equal(withoutInvalidation?.verbalInterpretationRecordId, null);
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
  assert.match(btc[0]?.gapNote ?? "", /不要求补排盘截图.*较低置信度参与研究权重/);
  assert.ok([...btc, ...eth].every((row) => row.executionAuthority === "RESEARCH_ONLY" && row.includedInHistoricalHitRate === false));
});
