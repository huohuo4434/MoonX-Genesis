import assert from "node:assert/strict";
import test from "node:test";

import {
  prepareQimenShadowEvaluation,
  prepareQimenShadowCandidate,
  prepareQimenShadowObservation,
  qimenShadowAdminRequestSchema,
  type QimenFormalForecastSnapshot,
  type QimenShadowEvaluationInput,
  type QimenShadowCandidateInput,
  type QimenShadowObservationInput,
} from "@/lib/research/qimen-shadow-capture-core";

function observation(overrides: Partial<QimenShadowObservationInput> = {}): QimenShadowObservationInput {
  return {
    observationId: "qimen-btc-20260830-01",
    formalForecastKind: "WEEKLY",
    formalForecastId: "week-btc-20260829-v2",
    horizon: "SWING",
    decisionAt: "2026-08-30T02:00:00.000Z",
    evaluationDueAt: "2026-08-30T04:00:00.000Z",
    candleIntervalMinutes: 60,
    technicalSourceId: "chan-btc-4h-20260830",
    technicalRecordedAt: "2026-08-30T01:30:00.000Z",
    baseTriggered: true,
    entryPrice: 100,
    stopPrice: 95,
    target1: 105,
    target2: 110,
    target3: 115,
    methodReadings: [
      { schoolId: "DIRECTIONAL_PALACE", direction: "UP", confidence: 57, readiness: "RESEARCH_ONLY", sourceId: "rabbit-0830", chartId: "chart-1", recordedAt: "2026-08-30T01:20:00.000Z", evidenceSha256: "b".repeat(64) },
      { schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 66, readiness: "FORWARD_READY", sourceId: "wu-0830", chartId: "chart-1", recordedAt: "2026-08-30T01:10:00.000Z", evidenceSha256: "a".repeat(64) },
    ],
    ...overrides,
  };
}

function candidate(overrides: Partial<QimenShadowCandidateInput> = {}): QimenShadowCandidateInput {
  return {
    candidateId: "qimen-btc-20260830-auto-01",
    formalForecastKind: "WEEKLY",
    formalForecastId: "week-btc-20260829-v2",
    horizon: "SWING",
    decisionAt: "2026-08-30T02:00:00.000Z",
    evaluationDueAt: "2026-08-30T04:00:00.000Z",
    methodReadings: observation().methodReadings,
    ...overrides,
  };
}

function evaluation(overrides: Partial<QimenShadowEvaluationInput> = {}): QimenShadowEvaluationInput {
  return {
    observationId: "qimen-btc-20260830-01",
    evaluatedAt: "2026-08-30T06:00:00.000Z",
    candles: [
      { openTime: "2026-08-30T03:00:00.000Z", closeTime: "2026-08-30T04:00:00.000Z", open: 104, high: 116, low: 103, close: 115, closed: true },
      { openTime: "2026-08-30T02:00:00.000Z", closeTime: "2026-08-30T03:00:00.000Z", open: 99, high: 106, low: 98, close: 104, closed: true },
    ],
    ...overrides,
  };
}

function formal(overrides: Partial<QimenFormalForecastSnapshot> = {}): QimenFormalForecastSnapshot {
  return {
    kind: "WEEKLY", id: "week-btc-20260829-v2", marketCode: "btc",
    periodStart: "2026-08-29", periodEnd: "2026-09-04", direction: "震荡上涨",
    version: 2, status: "LOCKED", publishedAt: new Date("2026-08-29T00:00:00.000Z"),
    lockedAt: new Date("2026-08-29T00:01:00.000Z"), ...overrides,
  };
}

test("observation derives authority from formal storage and evaluation only replays the locked setup", () => {
  const locked = prepareQimenShadowObservation(observation(), formal());
  assert.equal(locked.setup.symbol, "BTC");
  assert.equal(locked.setup.officialDirection, "LONG");
  assert.equal(locked.setup.formalForecastVersion, "V2");
  assert.equal(locked.setup.technicalSourceId, "chan-btc-4h-20260830");
  const prepared = prepareQimenShadowEvaluation(locked, evaluation());
  assert.equal(prepared.trials.length, 5);
  assert.ok(prepared.trials.every((item) => item.researchOnly && !item.tradingEligible));
  assert.deepEqual(prepared.candles.map((item) => item.openTime), ["2026-08-30T02:00:00.000Z", "2026-08-30T03:00:00.000Z"]);
});

test("API schema separates pre-decision lock from post-decision evaluation", () => {
  assert.equal(qimenShadowAdminRequestSchema.safeParse({ action: "REGISTER_CANDIDATE", candidate: candidate() }).success, true);
  assert.equal(qimenShadowAdminRequestSchema.safeParse({ action: "LOCK_OBSERVATION", observation: observation() }).success, true);
  assert.equal(qimenShadowAdminRequestSchema.safeParse({ action: "EVALUATE", evaluation: evaluation() }).success, true);
  assert.equal(qimenShadowAdminRequestSchema.safeParse({
    action: "LOCK_OBSERVATION", observation: { ...observation(), officialDirection: "SHORT", formalForecastVersion: "V999" },
  }).success, false);
  assert.equal(qimenShadowAdminRequestSchema.safeParse({
    action: "EVALUATE", evaluation: { ...evaluation(), entryPrice: 1 },
  }).success, false);
});

test("future candidate requires both named method structures and derives authority only from locked formal storage", () => {
  const prepared = prepareQimenShadowCandidate(candidate(), formal());
  assert.equal(prepared.symbol, "BTC");
  assert.equal(prepared.officialDirection, "LONG");
  assert.equal(prepared.formalForecastVersion, "V2");
  assert.equal(prepared.candleIntervalMinutes, 60);
  assert.deepEqual(prepared.methodReadings.map((item) => item.schoolId), ["DIRECTIONAL_PALACE", "OBJECT_YONGSHEN"]);
  assert.equal(qimenShadowAdminRequestSchema.safeParse({
    action: "REGISTER_CANDIDATE",
    candidate: candidate({ methodReadings: [observation().methodReadings[0]!] }),
  }).success, false);
  assert.throws(() => prepareQimenShadowCandidate(candidate({ decisionAt: "2026-08-30T02:30:00.000Z" }), formal()), /整点1小时窗口/);
  assert.throws(() => prepareQimenShadowCandidate(candidate({ methodReadings: observation().methodReadings.map((item) => ({ ...item, recordedAt: "2026-08-30T02:01:00.000Z" })) }), formal()), /决策前记录/);
  assert.throws(() => prepareQimenShadowCandidate(candidate(), formal({ status: "PUBLISHED" })), /已经发布并锁定/);
  assert.throws(() => prepareQimenShadowCandidate(
    candidate({ expectedFormalForecastVersion: "V1" }),
    formal({ version: 2 }),
  ), /旧读数绑定到新版本/);
});

test("automatic observation refuses a changed formal version before any write", () => {
  assert.throws(() => prepareQimenShadowObservation(
    observation({ expectedFormalForecastVersion: "V1" }),
    formal({ version: 2 }),
  ), /版本已变化/);
});

test("unlocked, future-locked, mismatched, neutral and late technical evidence fail closed", () => {
  assert.throws(() => prepareQimenShadowObservation(observation(), formal({ status: "PUBLISHED" })), /已经发布并锁定/);
  assert.throws(() => prepareQimenShadowObservation(observation(), formal({ lockedAt: new Date("2026-08-30T03:00:00.000Z") })), /不存在有效/);
  assert.throws(() => prepareQimenShadowObservation(observation(), formal({ id: "different" })), /绑定不匹配/);
  assert.throws(() => prepareQimenShadowObservation(observation(), formal({ direction: "震荡" })), /不能创建方向型/);
  assert.throws(() => prepareQimenShadowObservation(observation({ technicalRecordedAt: "2026-08-30T02:01:00.000Z" }), formal()), /技术结构在决策后补录/);
});

test("evaluation deadline is locked in advance and cannot be cherry-picked early", () => {
  const locked = prepareQimenShadowObservation(observation(), formal());
  assert.throws(() => prepareQimenShadowEvaluation(locked, evaluation({ evaluatedAt: "2026-08-30T03:59:59.000Z" })), /尚未到/);
  assert.throws(() => prepareQimenShadowEvaluation(locked, evaluation({ candles: [{ openTime: "2026-08-29T22:00:00.000Z", closeTime: "2026-08-29T23:00:00.000Z", open: 100, high: 101, low: 99, close: 100, closed: true }] })), /数量与事前锁定窗口不一致/);
  assert.throws(() => prepareQimenShadowEvaluation(locked, evaluation({ candles: [
    { openTime: "2026-08-30T01:00:00.000Z", closeTime: "2026-08-30T02:00:00.000Z", open: 99, high: 106, low: 98, close: 104, closed: true },
    { openTime: "2026-08-30T03:00:00.000Z", closeTime: "2026-08-30T04:00:00.000Z", open: 104, high: 116, low: 103, close: 115, closed: true },
  ] })), /必须从决策时点起连续覆盖/);
});

test("daily validity uses UTC+8 boundaries and bearish path remains short", () => {
  const daily = observation({
    formalForecastKind: "DAILY", formalForecastId: "daily-gold-20260830-v1",
    decisionAt: "2026-08-29T16:30:00.000Z", evaluationDueAt: "2026-08-29T17:00:00.000Z",
    candleIntervalMinutes: 30,
    technicalRecordedAt: "2026-08-29T16:20:00.000Z", entryPrice: 100, stopPrice: 105,
    target1: 95, target2: 90, target3: 85, methodReadings: [],
  });
  const result = prepareQimenShadowObservation(daily, formal({
    kind: "DAILY", id: "daily-gold-20260830-v1", marketCode: "gold",
    periodStart: "2026-08-30", periodEnd: "2026-08-30", direction: "先涨后跌", version: 1,
  }));
  assert.equal(result.setup.officialDirection, "SHORT");
  assert.equal(result.setup.forecastValidFrom, "2026-08-29T16:00:00.000Z");
  assert.equal(result.setup.forecastValidUntil, "2026-08-30T15:59:59.999Z");
});

test("directional-palace evidence cannot self-promote out of research-only status", () => {
  const promoted = observation({
    methodReadings: [{ schoolId: "DIRECTIONAL_PALACE", direction: "UP", confidence: 60, readiness: "FORWARD_READY", sourceId: "rabbit", chartId: "c1", recordedAt: "2026-08-30T01:00:00.000Z", evidenceSha256: "a".repeat(64) }],
  });
  assert.equal(qimenShadowAdminRequestSchema.safeParse({ action: "LOCK_OBSERVATION", observation: promoted }).success, false);
});
