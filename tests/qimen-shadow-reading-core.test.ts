import assert from "node:assert/strict";
import test from "node:test";

import {
  qimenShadowAdminRequestSchema,
  type QimenFormalForecastSnapshot,
  type QimenShadowReadingInput,
} from "@/lib/research/qimen-shadow-capture-core";
import {
  prepareQimenShadowReading,
  qimenShadowReadingGroupKey,
} from "@/lib/research/qimen-shadow-reading-core";

function input(overrides: Partial<QimenShadowReadingInput> = {}): QimenShadowReadingInput {
  return {
    readingId: "reading-object-btc-20260830",
    studyKey: "btc-week-20260830-study-1",
    formalForecastKind: "WEEKLY",
    formalForecastId: "week-btc-v2",
    expectedFormalForecastVersion: "V2",
    horizon: "SWING",
    decisionAt: "2026-08-30T14:00:00.000Z",
    evaluationDueAt: "2026-08-30T18:00:00.000Z",
    reading: {
      schoolId: "OBJECT_YONGSHEN",
      direction: "UP",
      confidence: 66,
      readiness: "FORWARD_READY",
      sourceId: "lesson-wu-0830",
      chartId: "chart-wu-0830-1",
      recordedAt: "2026-08-30T12:00:00.000Z",
      evidenceSha256: "a".repeat(64),
    },
    ...overrides,
  };
}

function formal(overrides: Partial<QimenFormalForecastSnapshot> = {}): QimenFormalForecastSnapshot {
  return {
    kind: "WEEKLY",
    id: "week-btc-v2",
    marketCode: "BTC",
    periodStart: "2026-08-30",
    periodEnd: "2026-09-05",
    direction: "震荡上涨",
    version: 2,
    status: "LOCKED",
    publishedAt: new Date("2026-08-29T20:00:00.000Z"),
    lockedAt: new Date("2026-08-29T20:01:00.000Z"),
    ...overrides,
  };
}

test("structured reading binds one immutable school record to one locked forecast version and fixed window", () => {
  const prepared = prepareQimenShadowReading(input(), formal());
  assert.equal(prepared.formalForecastVersion, "V2");
  assert.equal(prepared.symbol, "BTC");
  assert.equal(prepared.reading.schoolId, "OBJECT_YONGSHEN");
  assert.match(qimenShadowReadingGroupKey(prepared), /btc-week-20260830-study-1\|WEEKLY\|week-btc-v2\|V2\|SWING/);
  assert.equal(qimenShadowAdminRequestSchema.safeParse({ action: "REGISTER_READING", reading: input() }).success, true);
});

test("reading fails closed for unlocked forecast, future lock, post-decision evidence and invalid window", () => {
  assert.throws(() => prepareQimenShadowReading(input(), formal({ status: "PUBLISHED" })), /发布并锁定/);
  assert.throws(() => prepareQimenShadowReading(input(), formal({ lockedAt: new Date("2026-08-30T15:00:00.000Z") })), /决策时不存在/);
  assert.throws(() => prepareQimenShadowReading(input({ reading: { ...input().reading, recordedAt: "2026-08-30T14:01:00.000Z" } }), formal()), /决策前形成/);
  assert.throws(() => prepareQimenShadowReading(input({ decisionAt: "2026-08-30T14:30:00.000Z" }), formal()), /整点1小时窗口/);
  assert.throws(() => prepareQimenShadowReading(input({ evaluationDueAt: "2026-09-06T18:00:00.000Z" }), formal()), /正式预测有效期/);
  assert.throws(() => prepareQimenShadowReading(input(), formal({ version: 3 })), /版本已变化/);
});

test("directional-palace inbox stays research-only and malformed actions are rejected", () => {
  const promoted = input({
    readingId: "reading-palace-btc-20260830",
    reading: { ...input().reading, schoolId: "DIRECTIONAL_PALACE", readiness: "FORWARD_READY" },
  });
  assert.equal(qimenShadowAdminRequestSchema.safeParse({ action: "REGISTER_READING", reading: promoted }).success, false);
  assert.equal(qimenShadowAdminRequestSchema.safeParse({ action: "REGISTER_READING", reading: { ...input(), officialDirection: "LONG" } }).success, false);
});
