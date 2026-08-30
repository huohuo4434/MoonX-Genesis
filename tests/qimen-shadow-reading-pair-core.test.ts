import assert from "node:assert/strict";
import test from "node:test";

import type { PreparedQimenShadowReading } from "@/lib/research/qimen-shadow-reading-core";
import { planQimenShadowReadingPair } from "@/lib/research/qimen-shadow-reading-pair-core";

function reading(
  schoolId: "OBJECT_YONGSHEN" | "DIRECTIONAL_PALACE",
  overrides: Partial<PreparedQimenShadowReading> = {},
): PreparedQimenShadowReading {
  return {
    readingId: `reading-${schoolId.toLowerCase()}`,
    studyKey: "btc-week-20260830-study-1",
    formalForecastKind: "WEEKLY",
    formalForecastId: "week-btc-v2",
    formalForecastVersion: "V2",
    symbol: "BTC",
    horizon: "SWING",
    decisionAt: "2026-08-30T14:00:00.000Z",
    evaluationDueAt: "2026-08-30T18:00:00.000Z",
    reading: {
      schoolId,
      direction: "UP",
      confidence: schoolId === "OBJECT_YONGSHEN" ? 66 : 58,
      readiness: schoolId === "OBJECT_YONGSHEN" ? "FORWARD_READY" : "RESEARCH_ONLY",
      sourceId: `source-${schoolId.toLowerCase()}`,
      chartId: `chart-${schoolId.toLowerCase()}`,
      recordedAt: "2026-08-30T12:00:00.000Z",
      evidenceSha256: schoolId === "OBJECT_YONGSHEN" ? "a".repeat(64) : "b".repeat(64),
    },
    ...overrides,
  };
}

test("exact two-school pair creates one deterministic candidate independent of input order", () => {
  const object = reading("OBJECT_YONGSHEN");
  const palace = reading("DIRECTIONAL_PALACE");
  const first = planQimenShadowReadingPair([object, palace]);
  const second = planQimenShadowReadingPair([palace, object]);
  assert.equal(first.status, "READY");
  assert.equal(second.status, "READY");
  if (first.status !== "READY" || second.status !== "READY") return;
  assert.equal(first.candidateId, second.candidateId);
  assert.deepEqual(first.candidate.methodReadings.map((item) => item.schoolId), ["DIRECTIONAL_PALACE", "OBJECT_YONGSHEN"]);
  assert.equal(first.candidate.formalForecastId, "week-btc-v2");
  assert.equal(first.candidate.expectedFormalForecastVersion, "V2");
});

test("school disagreement remains a research candidate instead of fabricating consensus", () => {
  const plan = planQimenShadowReadingPair([
    reading("OBJECT_YONGSHEN"),
    reading("DIRECTIONAL_PALACE", { reading: { ...reading("DIRECTIONAL_PALACE").reading, direction: "DOWN" } }),
  ]);
  assert.equal(plan.status, "READY");
  if (plan.status !== "READY") return;
  assert.deepEqual(new Set(plan.candidate.methodReadings.map((item) => item.direction)), new Set(["UP", "DOWN"]));
});

test("missing, unavailable, duplicate and mismatched readings fail closed", () => {
  assert.deepEqual(planQimenShadowReadingPair([reading("OBJECT_YONGSHEN")]), {
    studyKey: "btc-week-20260830-study-1",
    status: "WAITING",
    reason: "WAITING_FOR_SECOND_SCHOOL",
  });
  assert.equal(planQimenShadowReadingPair([
    reading("OBJECT_YONGSHEN"),
    reading("DIRECTIONAL_PALACE", { reading: { ...reading("DIRECTIONAL_PALACE").reading, readiness: "UNAVAILABLE" } }),
  ]).status, "WAITING");
  assert.deepEqual(planQimenShadowReadingPair([
    reading("OBJECT_YONGSHEN"),
    reading("OBJECT_YONGSHEN", { readingId: "object-duplicate" }),
  ]), {
    studyKey: "btc-week-20260830-study-1",
    status: "SKIPPED",
    reason: "AMBIGUOUS_DUPLICATE_SCHOOL",
  });
  assert.deepEqual(planQimenShadowReadingPair([
    reading("OBJECT_YONGSHEN"),
    reading("DIRECTIONAL_PALACE", { formalForecastVersion: "V3" }),
  ]), {
    studyKey: "btc-week-20260830-study-1",
    status: "SKIPPED",
    reason: "MISMATCHED_FORECAST_OR_WINDOW",
  });
});
