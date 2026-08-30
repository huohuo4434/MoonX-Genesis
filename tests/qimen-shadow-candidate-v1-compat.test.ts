import assert from "node:assert/strict";
import test from "node:test";

import {
  qimenShadowContentHash,
  verifyQimenShadowCandidateRow,
} from "@/lib/research/qimen-shadow-store";

const methodReadings = [
  {
    schoolId: "DIRECTIONAL_PALACE" as const,
    direction: "UP" as const,
    confidence: 58,
    readiness: "RESEARCH_ONLY" as const,
    sourceId: "legacy-palace",
    chartId: "legacy-chart-palace",
    recordedAt: "2026-08-30T12:00:00.000Z",
    evidenceSha256: "b".repeat(64),
  },
  {
    schoolId: "OBJECT_YONGSHEN" as const,
    direction: "UP" as const,
    confidence: 66,
    readiness: "FORWARD_READY" as const,
    sourceId: "legacy-object",
    chartId: "legacy-chart-object",
    recordedAt: "2026-08-30T12:00:00.000Z",
    evidenceSha256: "a".repeat(64),
  },
];

const legacySnapshot = {
  candidateId: "qimen-auto-legacy-v1",
  symbol: "BTC",
  horizon: "SWING" as const,
  officialDirection: "LONG" as const,
  formalForecastKind: "WEEKLY" as const,
  formalForecastId: "btc-week-legacy-v1",
  formalForecastVersion: "V1",
  forecastPublishedAt: "2026-08-29T10:00:00.000Z",
  forecastLockedAt: "2026-08-29T10:01:00.000Z",
  forecastValidFrom: "2026-08-30T00:00:00.000Z",
  forecastValidUntil: "2026-09-05T23:59:59.999Z",
  decisionAt: "2026-08-30T14:00:00.000Z",
  evaluationDueAt: "2026-08-30T18:00:00.000Z",
  candleIntervalMinutes: 60 as const,
  methodReadings,
};

test("历史v1候选迁移只回填列也仍可校验与后续锁定，不改旧快照哈希", () => {
  const schemaVersion = "moox.qimen-shadow-candidate.v1";
  const verified = verifyQimenShadowCandidateRow({
    id: legacySnapshot.candidateId,
    studyKey: "btc-week-legacy-study",
    schemaVersion,
    symbol: legacySnapshot.symbol,
    horizon: legacySnapshot.horizon,
    formalForecastKind: legacySnapshot.formalForecastKind,
    formalForecastId: legacySnapshot.formalForecastId,
    formalForecastVersion: legacySnapshot.formalForecastVersion,
    decisionAt: new Date(legacySnapshot.decisionAt),
    evaluationDueAt: new Date(legacySnapshot.evaluationDueAt),
    candleIntervalMinutes: 60,
    methodSnapshot: legacySnapshot as never,
    contentSha256: qimenShadowContentHash({ schemaVersion, candidate: legacySnapshot }),
    createdAt: new Date("2026-08-30T12:30:00.000Z"),
  });
  assert.equal(verified.studyKey, "btc-week-legacy-study");
  assert.equal(verified.candidateId, legacySnapshot.candidateId);
  assert.equal("studyKey" in legacySnapshot, false);
});

test("新版v2候选缺失studyKey必须失败关闭", () => {
  const schemaVersion = "moox.qimen-shadow-candidate.v2";
  assert.throws(() => verifyQimenShadowCandidateRow({
    id: legacySnapshot.candidateId,
    studyKey: null,
    schemaVersion,
    symbol: legacySnapshot.symbol,
    horizon: legacySnapshot.horizon,
    formalForecastKind: legacySnapshot.formalForecastKind,
    formalForecastId: legacySnapshot.formalForecastId,
    formalForecastVersion: legacySnapshot.formalForecastVersion,
    decisionAt: new Date(legacySnapshot.decisionAt),
    evaluationDueAt: new Date(legacySnapshot.evaluationDueAt),
    candleIntervalMinutes: 60,
    methodSnapshot: legacySnapshot as never,
    contentSha256: qimenShadowContentHash({ schemaVersion, candidate: legacySnapshot }),
    createdAt: new Date("2026-08-30T12:30:00.000Z"),
  }), /结构无效/);
});
