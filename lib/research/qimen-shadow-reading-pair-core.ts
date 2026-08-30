import { createHash } from "node:crypto";

import type { QimenShadowCandidateInput } from "@/lib/research/qimen-shadow-capture-core";
import {
  qimenShadowReadingGroupKey,
  type PreparedQimenShadowReading,
} from "@/lib/research/qimen-shadow-reading-core";
import { rotateQimenLessonCandidates } from "@/lib/research/qimen-shadow-lesson-ingestion-core";

export type QimenShadowReadingPairPlan =
  | { status: "WAITING"; studyKey: string; reason: "WAITING_FOR_SECOND_SCHOOL" | "METHOD_READING_UNAVAILABLE" }
  | { status: "SKIPPED"; studyKey: string; reason: "AMBIGUOUS_DUPLICATE_SCHOOL" | "MISMATCHED_FORECAST_OR_WINDOW" }
  | { status: "READY"; studyKey: string; candidateId: string; candidate: QimenShadowCandidateInput };

export function selectCompleteQimenStudyKeys(
  readings: readonly PreparedQimenShadowReading[],
  limit: number,
  serverNow?: Date,
  existingCandidateStudyKeys: ReadonlySet<string> = new Set(),
): string[] {
  const grouped = new Map<string, PreparedQimenShadowReading[]>();
  for (const reading of readings) grouped.set(reading.studyKey, [...(grouped.get(reading.studyKey) ?? []), reading]);
  const complete = [...grouped.entries()]
    .filter(([, group]) => {
      const schools = new Set(group.map((item) => item.reading.schoolId));
      return schools.has("OBJECT_YONGSHEN") && schools.has("DIRECTIONAL_PALACE");
    })
    .filter(([studyKey]) => !existingCandidateStudyKeys.has(studyKey))
    .sort((left, right) => {
      const leftDecision = left[1][0]?.decisionAt ?? "";
      const rightDecision = right[1][0]?.decisionAt ?? "";
      return leftDecision.localeCompare(rightDecision) || left[0].localeCompare(right[0]);
    })
    .map(([studyKey]) => studyKey);
  const take = Math.max(0, Math.trunc(limit));
  return (serverNow
    ? rotateQimenLessonCandidates({ candidates: complete, serverNow, batchSize: Math.max(1, take) })
    : complete
  ).slice(0, take);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function deterministicId(value: unknown): string {
  return `qimen-auto-${createHash("sha256").update(canonicalJson(value)).digest("hex").slice(0, 32)}`;
}

export function planQimenShadowReadingPair(
  readings: PreparedQimenShadowReading[],
): QimenShadowReadingPairPlan {
  const studyKey = readings[0]?.studyKey ?? "UNKNOWN";
  if (readings.length < 2) return { studyKey, status: "WAITING", reason: "WAITING_FOR_SECOND_SCHOOL" };
  const schools = new Set(readings.map((item) => item.reading.schoolId));
  if (
    readings.length !== 2
    || schools.size !== 2
    || !schools.has("OBJECT_YONGSHEN")
    || !schools.has("DIRECTIONAL_PALACE")
  ) {
    return { studyKey, status: "SKIPPED", reason: "AMBIGUOUS_DUPLICATE_SCHOOL" };
  }
  if (
    new Set(readings.map((item) => item.studyKey)).size !== 1
    || new Set(readings.map(qimenShadowReadingGroupKey)).size !== 1
  ) {
    return { studyKey, status: "SKIPPED", reason: "MISMATCHED_FORECAST_OR_WINDOW" };
  }
  if (readings.some((item) => item.reading.readiness === "UNAVAILABLE")) {
    return { studyKey, status: "WAITING", reason: "METHOD_READING_UNAVAILABLE" };
  }
  const first = readings[0]!;
  const methodReadings = readings
    .map((item) => item.reading)
    .sort((left, right) => left.schoolId.localeCompare(right.schoolId));
  const candidateId = deterministicId({
    group: qimenShadowReadingGroupKey(first),
    methodReadings,
  });
  return {
    studyKey,
    status: "READY",
    candidateId,
    candidate: {
      candidateId,
      studyKey,
      formalForecastKind: first.formalForecastKind,
      formalForecastId: first.formalForecastId,
      expectedFormalForecastVersion: first.formalForecastVersion,
      horizon: first.horizon,
      decisionAt: first.decisionAt,
      evaluationDueAt: first.evaluationDueAt,
      methodReadings,
    },
  };
}
