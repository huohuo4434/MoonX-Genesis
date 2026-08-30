import { createHash } from "node:crypto";

import type { QimenShadowCandidateInput } from "@/lib/research/qimen-shadow-capture-core";
import {
  qimenShadowReadingGroupKey,
  type PreparedQimenShadowReading,
} from "@/lib/research/qimen-shadow-reading-core";

export type QimenShadowReadingPairPlan =
  | { status: "WAITING"; studyKey: string; reason: "WAITING_FOR_SECOND_SCHOOL" | "METHOD_READING_UNAVAILABLE" }
  | { status: "SKIPPED"; studyKey: string; reason: "AMBIGUOUS_DUPLICATE_SCHOOL" | "MISMATCHED_FORECAST_OR_WINDOW" }
  | { status: "READY"; studyKey: string; candidateId: string; candidate: QimenShadowCandidateInput };

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
