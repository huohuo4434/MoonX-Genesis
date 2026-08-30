import {
  qimenLessonExtractionReportSchema,
  qimenLessonDecisionAt,
  qimenLessonTranscriptSha256,
  rotateQimenLessonCandidates,
} from "@/lib/research/qimen-shadow-lesson-ingestion-core";

export function qimenReportNeedsBackfill(value: unknown, transcriptSha256: string): boolean {
  if (value === null || value === undefined) return true;
  const parsed = qimenLessonExtractionReportSchema.safeParse(value);
  if (!parsed.success) return true;
  if (parsed.data.transcriptSha256 !== transcriptSha256) return true;
  return ["MODEL_UNAVAILABLE", "MODEL_FAILED", "INVALID_MODEL_OUTPUT"].includes(parsed.data.modelStatus);
}

export function qimenReportOutcomeSha256(value: unknown): string | null {
  const parsed = qimenLessonExtractionReportSchema.safeParse(value);
  if (!parsed.success) return null;
  return qimenLessonTranscriptSha256(JSON.stringify({
    schemaVersion: parsed.data.schemaVersion,
    transcriptSha256: parsed.data.transcriptSha256,
    modelStatus: parsed.data.modelStatus,
    accepted: parsed.data.accepted,
    rejected: parsed.data.rejected,
    policy: parsed.data.policy,
  }));
}

export function qimenReportAttemptSummary(value: unknown): {
  outcomeSha256: string;
  modelStatus: string;
  generatedAt: string;
} | null {
  const parsed = qimenLessonExtractionReportSchema.safeParse(value);
  const outcomeSha256 = qimenReportOutcomeSha256(value);
  if (!parsed.success || !outcomeSha256) return null;
  return { outcomeSha256, modelStatus: parsed.data.modelStatus, generatedAt: parsed.data.generatedAt };
}

function nextAttemptMeta(current: unknown, report: unknown, attemptedAt: string) {
  const existing = current && typeof current === "object" && !Array.isArray(current)
    ? current as { count?: unknown }
    : {};
  const summary = qimenReportAttemptSummary(report);
  return {
    count: Math.max(0, Number(existing.count) || 0) + 1,
    lastAttemptAt: attemptedAt,
    lastOutcomeSha256: summary?.outcomeSha256 ?? null,
    lastModelStatus: summary?.modelStatus ?? "INVALID_REPORT",
  };
}

function isReportForTranscript(value: unknown, transcriptSha256: string): boolean {
  const parsed = qimenLessonExtractionReportSchema.safeParse(value);
  return parsed.success && parsed.data.transcriptSha256 === transcriptSha256;
}

function isPersistableBackfillReport(value: unknown): boolean {
  const parsed = qimenLessonExtractionReportSchema.safeParse(value);
  return parsed.success && (
    parsed.data.modelStatus === "EXTRACTED"
    || (parsed.data.modelStatus === "NOT_APPLICABLE" && parsed.data.accepted.length === 0)
  );
}

function stableReportRank(value: unknown): number {
  const parsed = qimenLessonExtractionReportSchema.safeParse(value);
  if (!parsed.success) return 0;
  if (parsed.data.modelStatus === "EXTRACTED") return 2;
  if (parsed.data.modelStatus === "NOT_APPLICABLE" && parsed.data.accepted.length === 0) return 1;
  return 0;
}

export function preferStableQimenReport(current: unknown, incoming: unknown): unknown {
  const currentParsed = qimenLessonExtractionReportSchema.safeParse(current);
  const incomingParsed = qimenLessonExtractionReportSchema.safeParse(incoming);
  if (!incomingParsed.success) return current;
  if (!currentParsed.success || currentParsed.data.transcriptSha256 !== incomingParsed.data.transcriptSha256) return incoming;
  return stableReportRank(current) >= stableReportRank(incoming) ? current : incoming;
}

export function selectValidExtractedQimenRows<T>(input: {
  rows: readonly T[];
  reportOf: (row: T) => unknown;
  limit: number;
  serverNow?: Date;
  maxReportAgeMs?: number;
}): T[] {
  const take = Math.max(0, Math.min(100, Math.trunc(input.limit)));
  const nowMs = input.serverNow?.getTime();
  const maxAgeMs = Math.max(60_000, Math.trunc(input.maxReportAgeMs ?? 7 * 24 * 60 * 60_000));
  const eligible = input.rows.map((row) => {
    const parsed = qimenLessonExtractionReportSchema.safeParse(input.reportOf(row));
    if (!parsed.success || parsed.data.modelStatus !== "EXTRACTED" || parsed.data.accepted.length === 0) return null;
    const generatedAtMs = Date.parse(parsed.data.generatedAt);
    const decisions = parsed.data.accepted
      .map((draft) => qimenLessonDecisionAt(parsed.data.generatedAt, draft.applicableFrom).getTime())
      .filter((decisionAt) => nowMs === undefined || decisionAt > nowMs);
    if (!decisions.length) return null;
    const decisionAtMs = Math.min(...decisions);
    if (nowMs !== undefined && (
      !Number.isFinite(nowMs)
      || generatedAtMs > nowMs
      || nowMs - generatedAtMs > maxAgeMs
      || decisionAtMs <= nowMs
    )) return null;
    return { row, decisionAtMs };
  }).filter((item): item is { row: T; decisionAtMs: number } => item !== null)
    .sort((left, right) => left.decisionAtMs - right.decisionAtMs)
    .map((item) => item.row);
  if (!input.serverNow) return eligible.slice(0, take);
  // All rows here are still forward-looking. Rotate only inside equal-deadline
  // buckets so fairness can never push a later sample ahead of an imminent one.
  const byDecision = new Map<number, T[]>();
  for (const row of eligible) {
    const parsed = qimenLessonExtractionReportSchema.parse(input.reportOf(row));
    const decisionAtMs = Math.min(...parsed.accepted
      .map((draft) => qimenLessonDecisionAt(parsed.generatedAt, draft.applicableFrom).getTime())
      .filter((decisionAt) => decisionAt > input.serverNow!.getTime()));
    byDecision.set(decisionAtMs, [...(byDecision.get(decisionAtMs) ?? []), row]);
  }
  const ordered: T[] = [];
  for (const decisionAtMs of [...byDecision.keys()].sort((left, right) => left - right)) {
    ordered.push(...rotateQimenLessonCandidates({
      candidates: byDecision.get(decisionAtMs) ?? [],
      serverNow: input.serverNow,
      batchSize: Math.max(1, take),
    }));
  }
  return ordered.slice(0, take);
}

export function selectQimenOnlyBackfillRows<T extends {
  status: string;
  rawTranscript: string;
  qimenShadowExtraction: unknown | null;
  updatedAt: string;
}>(
  rows: readonly T[],
  allowedStatuses: readonly string[],
  limit: number,
  serverNow = new Date(),
): T[] {
  const take = Math.max(0, Math.min(10, Math.trunc(limit)));
  const eligible = [...rows]
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
    .filter((row) => allowedStatuses.includes(row.status))
    .filter((row) => row.rawTranscript.trim().length > 0)
    .filter((row) => qimenReportNeedsBackfill(
      row.qimenShadowExtraction,
      qimenLessonTranscriptSha256(row.rawTranscript),
    ));
  // This backfill is called by the daily process-lessons cron, not by the
  // five-minute shadow scanner. A daily bucket advances the circular window
  // once per real production run and avoids offsets that alias every 288
  // five-minute buckets.
  return rotateQimenLessonCandidates({
    candidates: eligible,
    serverNow,
    bucketMs: 24 * 60 * 60_000,
    batchSize: Math.max(1, take),
  }).slice(0, take);
}

export function applyTeacherQimenOnlyBackfill<T extends {
  status: string;
  rawTranscript: string;
  qimenShadowExtraction: unknown | null;
  updatedAt: string;
}>(input: {
  current: T;
  allowedStatuses: readonly string[];
  expectedTranscriptSha256: string;
  report: unknown;
  updatedAt: string;
}): T | null {
  if (!input.allowedStatuses.includes(input.current.status)) return null;
  const currentTranscriptSha256 = qimenLessonTranscriptSha256(input.current.rawTranscript);
  if (currentTranscriptSha256 !== input.expectedTranscriptSha256) return null;
  if (!isReportForTranscript(input.report, input.expectedTranscriptSha256)) return null;
  if (!isPersistableBackfillReport(input.report)) return null;
  if (!qimenReportNeedsBackfill(input.current.qimenShadowExtraction, currentTranscriptSha256)) return null;
  return {
    ...input.current,
    qimenShadowExtraction: input.report,
    updatedAt: input.updatedAt,
  };
}

export function applyMasterQimenOnlyBackfill<T extends {
  status: string;
  lessonOutputJson: unknown;
  updatedAt: string;
}>(input: {
  current: T;
  lessonStatus: string;
  allowedStatuses: readonly string[];
  rawTranscript: string;
  expectedTranscriptSha256: string;
  report: unknown;
  updatedAt: string;
}): T | null {
  if (!input.allowedStatuses.includes(input.lessonStatus)) return null;
  const currentTranscriptSha256 = qimenLessonTranscriptSha256(input.rawTranscript);
  if (currentTranscriptSha256 !== input.expectedTranscriptSha256) return null;
  if (!isReportForTranscript(input.report, input.expectedTranscriptSha256)) return null;
  if (!isPersistableBackfillReport(input.report)) return null;
  const output = input.current.lessonOutputJson && typeof input.current.lessonOutputJson === "object" && !Array.isArray(input.current.lessonOutputJson)
    ? input.current.lessonOutputJson as Record<string, unknown>
    : {};
  if (!qimenReportNeedsBackfill(output.qimenShadow, currentTranscriptSha256)) return null;
  const previousSummary = qimenReportAttemptSummary(output.qimenShadow);
  const outcomeChanged = qimenReportOutcomeSha256(output.qimenShadow) !== qimenReportOutcomeSha256(input.report);
  const history = Array.isArray(output.qimenShadowOutcomeHistory)
    ? output.qimenShadowOutcomeHistory.filter((item) => item && typeof item === "object").slice(-7)
    : [];
  const nextHistory = outcomeChanged && previousSummary
    ? [...history.filter((item) => (item as { outcomeSha256?: unknown }).outcomeSha256 !== previousSummary.outcomeSha256), previousSummary].slice(-8)
    : history;
  return {
    ...input.current,
    lessonOutputJson: {
      ...output,
      qimenShadowAttemptMeta: nextAttemptMeta(output.qimenShadowAttemptMeta, input.report, input.updatedAt),
      qimenShadowOutcomeHistory: nextHistory,
      qimenShadow: outcomeChanged ? input.report : output.qimenShadow,
    },
    updatedAt: input.updatedAt,
  };
}
