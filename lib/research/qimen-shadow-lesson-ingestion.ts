import "server-only";

import { isLessonExtractionPackCurrent, listLessonExtractionPacks } from "@/lib/master-intelligence/store";
import { prisma } from "@/lib/prisma";
import type { QimenFormalForecastSnapshot } from "@/lib/research/qimen-shadow-capture-core";
import {
  planQimenLessonReading,
  qimenLessonDecisionAt,
  qimenLessonExistingReadingSignature,
  qimenLessonExtractionReportSchema,
  rotateQimenLessonCandidates,
  selectNovelQimenLessonCandidates,
  type AcceptedQimenLessonDraft,
} from "@/lib/research/qimen-shadow-lesson-ingestion-core";
import { registerQimenShadowReading } from "@/lib/research/qimen-shadow-store";
import { isTeacherKnowledgeQimenPackCurrent, listTeacherKnowledgeQimenPacks } from "@/lib/teacher-knowledge/store";

const LESSON_SOURCE_SCAN_LIMIT = 100;
const DRAFT_LIMIT = 12;
const EXISTING_SIGNATURE_QUERY_BATCH = 24;
const MAX_EXISTING_SIGNATURE_SCAN = 240;
const MAX_REPORT_AGE_MS = 7 * 24 * 60 * 60_000;

export type QimenShadowLessonIngestionResult = {
  id: string;
  status: "CREATED" | "UNCHANGED" | "SKIPPED" | "FAILED";
  reason?: string;
};

function safeReason(error: unknown): string {
  return (error instanceof Error ? error.message : "UNKNOWN_ERROR").replace(/[\r\n\t]+/g, " ").slice(0, 240);
}

function hongKongDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instant);
}

function decisionAndDue(
  reportGeneratedAt: string,
  horizon: AcceptedQimenLessonDraft["horizon"],
  applicableFrom: string,
): { decisionDate: string; dueDate: string } {
  const decision = qimenLessonDecisionAt(reportGeneratedAt, applicableFrom);
  const hours = horizon === "INTRADAY" ? 8 : horizon === "SWING" ? 24 : 72;
  const due = new Date(decision.getTime() + hours * 3_600_000);
  return { decisionDate: hongKongDate(decision), dueDate: hongKongDate(due) };
}

async function sourceSnapshotCurrent(pack: {
  sourceKind: "MASTER" | "TEACHER";
  sourceId: string;
  sourceVersion: string;
  transcriptSha256: string;
  reportSha256: string;
}, reportGeneratedAt: string): Promise<boolean> {
  const snapshot = {
    lessonId: pack.sourceId,
    sourceVersion: pack.sourceVersion,
    transcriptSha256: pack.transcriptSha256,
    reportSha256: pack.reportSha256,
    reportGeneratedAt,
  };
  return pack.sourceKind === "MASTER"
    ? isLessonExtractionPackCurrent(snapshot)
    : isTeacherKnowledgeQimenPackCurrent(snapshot);
}

async function resolveFormalForecast(input: {
  draft: AcceptedQimenLessonDraft;
  reportGeneratedAt: string;
}): Promise<QimenFormalForecastSnapshot> {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  const generatedAt = new Date(input.reportGeneratedAt);
  const { decisionDate, dueDate } = decisionAndDue(input.reportGeneratedAt, input.draft.horizon, input.draft.applicableFrom);
  if (input.draft.horizon === "INTRADAY") {
    const rows = await db.generatedDailyForecast.findMany({
      where: {
        marketCode: input.draft.marketCode,
        forecastDate: decisionDate,
        status: "LOCKED",
        publishedAt: { lte: generatedAt },
        lockedAt: { lte: generatedAt },
      },
      orderBy: { version: "desc" },
      take: 2,
    });
    const row = rows[0];
    if (!row) throw new Error("找不到提取时已经发布并锁定的正式日预测。");
    return {
      kind: "DAILY", id: row.id, marketCode: row.marketCode, periodStart: row.forecastDate,
      periodEnd: row.forecastDate, direction: row.direction, version: row.version,
      status: row.status, publishedAt: row.publishedAt, lockedAt: row.lockedAt,
    };
  }
  const periods = await db.weeklyForecastSource.groupBy({
    by: ["periodStart", "periodEnd"],
    where: {
      marketCode: input.draft.marketCode,
      periodStart: { lte: decisionDate },
      periodEnd: { gte: dueDate },
      status: "LOCKED",
      publishedAt: { lte: generatedAt },
      lockedAt: { lte: generatedAt },
    },
    orderBy: [{ periodStart: "desc" }, { periodEnd: "desc" }],
    take: 2,
  });
  if (!periods.length) throw new Error("找不到覆盖标准观察窗口且在提取时已锁定的正式周预测。");
  if (periods.length !== 1) throw new Error("存在多个重叠正式周期，自动绑定失败关闭。");
  const period = periods[0]!;
  const row = await db.weeklyForecastSource.findFirst({
    where: {
      marketCode: input.draft.marketCode,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      status: "LOCKED",
      publishedAt: { lte: generatedAt },
      lockedAt: { lte: generatedAt },
    },
    orderBy: { version: "desc" },
  });
  if (!row) throw new Error("正式周预测版本在绑定前发生变化，自动绑定失败关闭。");
  return {
    kind: "WEEKLY", id: row.id, marketCode: row.marketCode, periodStart: row.periodStart,
    periodEnd: row.periodEnd, direction: row.weeklyDirection, version: row.version,
    status: row.status, publishedAt: row.publishedAt, lockedAt: row.lockedAt,
  };
}

export async function runQimenShadowLessonIngestion(options: {
  serverNow: Date;
  deadlineMs: number;
}): Promise<QimenShadowLessonIngestionResult[]> {
  if (!Number.isFinite(options.serverNow.getTime()) || !Number.isFinite(options.deadlineMs)) throw new Error("课程采集时间边界无效。");
  const [masterLessons, teacherLessons] = await Promise.all([
    listLessonExtractionPacks(LESSON_SOURCE_SCAN_LIMIT, { serverNow: options.serverNow }),
    listTeacherKnowledgeQimenPacks(LESSON_SOURCE_SCAN_LIMIT, { serverNow: options.serverNow }),
  ]);
  const lessons = [
    ...masterLessons.map((pack) => ({
      lessonId: `master-intelligence:${pack.lesson.id}`,
      sourceKind: "MASTER" as const,
      sourceId: pack.lesson.id,
      sourceVersion: pack.sourceVersion,
      transcriptSha256: pack.transcriptSha256,
      reportSha256: pack.reportSha256,
      updatedAt: pack.lesson.updatedAt,
      output: pack.lessonOutputJson && typeof pack.lessonOutputJson === "object" && "qimenShadow" in pack.lessonOutputJson
        ? (pack.lessonOutputJson as { qimenShadow?: unknown }).qimenShadow
        : null,
    })),
    ...teacherLessons.map((pack) => ({
      lessonId: `teacher-knowledge:${pack.lesson.id}`,
      sourceKind: "TEACHER" as const,
      sourceId: pack.lesson.id,
      sourceVersion: pack.sourceVersion,
      transcriptSha256: pack.transcriptSha256,
      reportSha256: pack.reportSha256,
      updatedAt: pack.lesson.updatedAt,
      output: pack.qimenShadowExtraction,
    })),
  ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const results: QimenShadowLessonIngestionResult[] = [];
  const eligiblePacks: Array<{ pack: typeof lessons[number]; report: ReturnType<typeof qimenLessonExtractionReportSchema.parse> }> = [];
  for (const pack of lessons) {
    const parsed = qimenLessonExtractionReportSchema.safeParse(pack.output);
    if (!parsed.success || parsed.data.modelStatus !== "EXTRACTED" || parsed.data.accepted.length === 0) continue;
    const generatedAt = new Date(parsed.data.generatedAt);
    if (generatedAt.getTime() > options.serverNow.getTime()) {
      results.push({ id: pack.lessonId, status: "SKIPPED", reason: "EXTRACTION_TIME_IN_FUTURE" });
      continue;
    }
    if (options.serverNow.getTime() - generatedAt.getTime() > MAX_REPORT_AGE_MS) continue;
    if (!parsed.data.accepted.some((draft) => qimenLessonDecisionAt(parsed.data.generatedAt, draft.applicableFrom).getTime() > options.serverNow.getTime())) {
      results.push({ id: pack.lessonId, status: "SKIPPED", reason: "DECISION_TIME_REACHED" });
      continue;
    }
    eligiblePacks.push({ pack, report: parsed.data });
  }
  const allCandidates = eligiblePacks.flatMap(({ pack, report }) => report.accepted.map((draft) => ({
    pack,
    report,
    draft,
    decisionAtMs: qimenLessonDecisionAt(report.generatedAt, draft.applicableFrom).getTime(),
    signature: qimenLessonExistingReadingSignature({
      sourceId: `lesson:${pack.lessonId}`,
      schoolId: draft.schoolId,
      horizon: draft.horizon,
      evidenceSha256: draft.evidenceSha256,
    }),
  })));
  const byDecision = new Map<number, typeof allCandidates>();
  for (const candidate of allCandidates) {
    byDecision.set(candidate.decisionAtMs, [...(byDecision.get(candidate.decisionAtMs) ?? []), candidate]);
  }
  const orderedCandidates = [...byDecision.keys()].sort((left, right) => left - right).flatMap((decisionAtMs) =>
    rotateQimenLessonCandidates({
      candidates: byDecision.get(decisionAtMs) ?? [],
      serverNow: options.serverNow,
      batchSize: DRAFT_LIMIT,
    })
  ).slice(0, MAX_EXISTING_SIGNATURE_SCAN);
  const existingSignatures = new Set<string>();
  const signatureCheckedCandidates: typeof orderedCandidates = [];
  for (let offset = 0; offset < orderedCandidates.length; offset += EXISTING_SIGNATURE_QUERY_BATCH) {
    if (Date.now() >= options.deadlineMs) break;
    const batch = orderedCandidates.slice(offset, offset + EXISTING_SIGNATURE_QUERY_BATCH);
    if (prisma && batch.length) {
      const filters = [...new Map(batch.map((candidate) => [candidate.signature, {
        sourceId: `lesson:${candidate.pack.lessonId}`,
        schoolId: candidate.draft.schoolId,
        horizon: candidate.draft.horizon,
        evidenceSha256: candidate.draft.evidenceSha256,
      }])).values()];
      const rows = await prisma.qimenShadowReading.groupBy({
        by: ["sourceId", "schoolId", "horizon", "evidenceSha256"],
        where: { OR: filters },
        orderBy: [{ sourceId: "asc" }, { schoolId: "asc" }, { horizon: "asc" }, { evidenceSha256: "asc" }],
        take: filters.length,
      });
      for (const row of rows) existingSignatures.add(qimenLessonExistingReadingSignature({
        sourceId: row.sourceId,
        schoolId: row.schoolId as AcceptedQimenLessonDraft["schoolId"],
        horizon: row.horizon as AcceptedQimenLessonDraft["horizon"],
        evidenceSha256: row.evidenceSha256,
      }));
    }
    signatureCheckedCandidates.push(...batch);
    if (selectNovelQimenLessonCandidates({ candidates: signatureCheckedCandidates, existingSignatures, limit: DRAFT_LIMIT }).length >= DRAFT_LIMIT) break;
  }
  const candidates = selectNovelQimenLessonCandidates({
    candidates: signatureCheckedCandidates,
    existingSignatures,
    limit: DRAFT_LIMIT,
  });
  let draftsSeen = 0;
  for (const { pack, report, draft } of candidates) {
    const resultId = `${pack.lessonId}:${draft.schoolId}:${draft.marketCode}:${draft.horizon}`;
    const existingSignature = qimenLessonExistingReadingSignature({ sourceId: `lesson:${pack.lessonId}`, schoolId: draft.schoolId, horizon: draft.horizon, evidenceSha256: draft.evidenceSha256 });
    if (existingSignatures.has(existingSignature)) {
      results.push({ id: resultId, status: "UNCHANGED" });
      continue;
    }
    if (Date.now() >= options.deadlineMs || draftsSeen >= DRAFT_LIMIT) break;
    draftsSeen += 1;
    try {
      const sourceCurrent = await sourceSnapshotCurrent(pack, report.generatedAt);
      if (!sourceCurrent) {
        results.push({ id: resultId, status: "SKIPPED", reason: "SOURCE_VERSION_CHANGED" });
        continue;
      }
      const formal = await resolveFormalForecast({ draft, reportGeneratedAt: report.generatedAt });
      const plan = planQimenLessonReading({
        lessonId: pack.lessonId,
        sourceVersion: pack.sourceVersion,
        sourceTranscriptSha256: pack.transcriptSha256,
        sourceReportSha256: pack.reportSha256,
        reportGeneratedAt: report.generatedAt,
        draft,
        formal,
      });
      if (!await sourceSnapshotCurrent(pack, report.generatedAt)) {
        results.push({ id: resultId, status: "SKIPPED", reason: "SOURCE_VERSION_CHANGED_BEFORE_REGISTER" });
        continue;
      }
      // serverNow is a scan snapshot only. The store must use its live clock so
      // a slow query can never backdate a write across decisionAt.
      const registered = await registerQimenShadowReading(
        plan.reading,
        "AUTOMATION:qimen-lesson-ingestion",
      );
      existingSignatures.add(existingSignature);
      results.push({ id: resultId, status: registered.created ? "CREATED" : "UNCHANGED" });
    } catch (error) {
      const reason = safeReason(error);
      const skipped = /找不到|超出|不一致|失败关闭|正式预测|决策时间|当前不可用|前瞻时间/.test(reason);
      results.push({ id: resultId, status: skipped ? "SKIPPED" : "FAILED", reason });
    }
  }
  if (draftsSeen >= DRAFT_LIMIT) results.push({ id: "LESSON_INGESTION", status: "SKIPPED", reason: "DRAFT_LIMIT_REACHED" });
  return results;
}
