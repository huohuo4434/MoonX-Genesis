import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQimenShadowObservationFromTechnical,
  classifyQimenShadowCandidateTiming,
  mapClosedHourlyCandlesForEvaluation,
  resolveQimenShadowAutomationInstrument,
} from "@/lib/research/qimen-shadow-automation-core";
import type { PreparedQimenShadowCandidate } from "@/lib/research/qimen-shadow-capture-core";
import type { ChanStage } from "@/types/chan-execution";

const candidate: PreparedQimenShadowCandidate = {
  candidateId: "qimen-btc-auto-1",
  studyKey: "btc-week-20260830-study-1",
  symbol: "BTC",
  horizon: "SWING",
  officialDirection: "LONG",
  formalForecastKind: "WEEKLY",
  formalForecastId: "week-btc-v2",
  formalForecastVersion: "V2",
  forecastPublishedAt: "2026-08-29T00:00:00.000Z",
  forecastLockedAt: "2026-08-29T00:01:00.000Z",
  forecastValidFrom: "2026-08-28T16:00:00.000Z",
  forecastValidUntil: "2026-09-04T15:59:59.999Z",
  decisionAt: "2026-08-30T02:00:00.000Z",
  evaluationDueAt: "2026-08-30T04:00:00.000Z",
  candleIntervalMinutes: 60,
  methodReadings: [
    { schoolId: "DIRECTIONAL_PALACE", direction: "UP", confidence: 55, readiness: "RESEARCH_ONLY", sourceId: "s1", chartId: "c1", recordedAt: "2026-08-30T01:00:00.000Z", evidenceSha256: "a".repeat(64) },
    { schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 65, readiness: "FORWARD_READY", sourceId: "s2", chartId: "c2", recordedAt: "2026-08-30T01:10:00.000Z", evidenceSha256: "b".repeat(64) },
  ],
};

function stage(overrides: Partial<ChanStage> = {}): ChanStage {
  return {
    code: "SECOND_BUY_CONFIRMED",
    labelZh: "二买已确认",
    labelEn: "Second buy confirmed",
    status: "ACTIVE",
    direction: "BULL",
    confirmation: 100,
    invalidation: 95,
    action: "BUY_CANDIDATE",
    waitingFor: "已确认",
    ...overrides,
  };
}

test("automation V1 supports only the explicitly continuous crypto allowlist", () => {
  assert.equal(resolveQimenShadowAutomationInstrument("BTCUSDT")?.providerSymbol, "BTCUSDT");
  assert.equal(resolveQimenShadowAutomationInstrument("sol-usdt")?.symbol, "SOL");
  assert.equal(resolveQimenShadowAutomationInstrument("HYPE_USDT_PERP")?.symbol, "HYPE");
  assert.equal(resolveQimenShadowAutomationInstrument("TSLA"), null);
  assert.equal(resolveQimenShadowAutomationInstrument("XAG"), null);
});

test("candidate timing is accepted only inside the pre-decision 2 to 30 minute window", () => {
  const decision = Date.parse(candidate.decisionAt);
  assert.equal(classifyQimenShadowCandidateTiming(candidate.decisionAt, decision - 31 * 60_000), "TOO_EARLY");
  assert.equal(classifyQimenShadowCandidateTiming(candidate.decisionAt, decision - 30 * 60_000), "READY");
  assert.equal(classifyQimenShadowCandidateTiming(candidate.decisionAt, decision - 2 * 60_000), "READY");
  assert.equal(classifyQimenShadowCandidateTiming(candidate.decisionAt, decision - 119_999), "TOO_LATE");
});

test("technical structure may arm a research observation only when active and aligned with locked direction", () => {
  const observation = buildQimenShadowObservationFromTechnical({
    candidate,
    stage: stage(),
    technicalRecordedAt: "2026-08-30T01:45:00.000Z",
  });
  assert.equal(observation.expectedFormalForecastVersion, "V2");
  assert.equal(observation.entryPrice, 100);
  assert.equal(observation.stopPrice, 95);
  assert.deepEqual([observation.target1, observation.target2, observation.target3], [105, 110, 115]);
  assert.equal(observation.baseTriggered, true);
  assert.throws(() => buildQimenShadowObservationFromTechnical({ candidate, stage: stage({ status: "AWAITING_CONFIRMATION" }), technicalRecordedAt: "2026-08-30T01:45:00.000Z" }), /尚未形成/);
  assert.throws(() => buildQimenShadowObservationFromTechnical({ candidate, stage: stage({ direction: "BEAR" }), technicalRecordedAt: "2026-08-30T01:45:00.000Z" }), /尚未形成/);
  assert.throws(() => buildQimenShadowObservationFromTechnical({ candidate, stage: stage({ invalidation: 101 }), technicalRecordedAt: "2026-08-30T01:45:00.000Z" }), /几何关系/);
});

test("short geometry remains short and cannot be reversed by the technical layer", () => {
  const observation = buildQimenShadowObservationFromTechnical({
    candidate: { ...candidate, officialDirection: "SHORT" },
    stage: stage({ code: "THIRD_SELL_CONFIRMED", direction: "BEAR", action: "SELL_CANDIDATE", confirmation: 100, invalidation: 105 }),
    technicalRecordedAt: "2026-08-30T01:45:00.000Z",
  });
  assert.deepEqual([observation.stopPrice, observation.target1, observation.target2, observation.target3], [105, 95, 90, 85]);
});

test("evaluation maps only the fixed decision window and leaves completeness enforcement to the locked evaluator", () => {
  const candles = mapClosedHourlyCandlesForEvaluation({
    decisionAt: candidate.decisionAt,
    evaluationDueAt: candidate.evaluationDueAt,
    candles: [
      { timestamp: Date.parse("2026-08-30T01:00:00.000Z"), open: 90, high: 91, low: 89, close: 90, volume: null },
      { timestamp: Date.parse("2026-08-30T03:00:00.000Z"), open: 101, high: 103, low: 100, close: 102, volume: null },
      { timestamp: Date.parse("2026-08-30T02:00:00.000Z"), open: 100, high: 102, low: 99, close: 101, volume: null },
      { timestamp: Date.parse("2026-08-30T04:00:00.000Z"), open: 102, high: 104, low: 101, close: 103, volume: null },
    ],
  });
  assert.deepEqual(candles.map((item) => item.openTime), ["2026-08-30T02:00:00.000Z", "2026-08-30T03:00:00.000Z"]);
  assert.ok(candles.every((item) => item.closed && Date.parse(item.closeTime) - Date.parse(item.openTime) === 3_600_000));
});
