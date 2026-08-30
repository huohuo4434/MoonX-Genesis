import "server-only";

import { extractQimenLessonReadings } from "@/lib/research/qimen-shadow-lesson-extract";
import { extractTeacherKnowledge } from "@/lib/teacher-knowledge/extract";
import {
  getLesson,
  listTeacherKnowledgeQimenBackfillCandidates,
  listLessons,
  saveDraftExtraction,
  saveTeacherKnowledgeQimenBackfill,
} from "@/lib/teacher-knowledge/store";

function boundedModelTimeout(deadlineMs?: number): number {
  if (!deadlineMs) return 20_000;
  return Math.max(1, Math.min(20_000, deadlineMs - Date.now() - 1_500));
}

export async function analyzeTeacherKnowledgeLesson(
  lessonId: string,
  changedBy: string | null = null,
  options: { deadlineMs?: number } = {},
) {
  const lesson = await getLesson(lessonId);
  if (!lesson) throw new Error("课程不存在");
  const [extracted, qimenShadowExtraction] = await Promise.all([
    extractTeacherKnowledge(lesson.rawTranscript, { timeoutMs: boundedModelTimeout(options.deadlineMs) }),
    extractQimenLessonReadings({ transcript: lesson.rawTranscript, timeoutMs: boundedModelTimeout(options.deadlineMs) }),
  ]);
  await saveDraftExtraction(lesson.id, {
    summary: extracted.summary,
    cleanedTranscript: extracted.cleanedTranscript,
    rules: extracted.rules,
    cases: extracted.cases,
    concepts: extracted.concepts,
    quotes: extracted.quotes,
    methods: extracted.methods,
    qimenShadowExtraction,
    changedBy,
  });
  return { extracted, qimenShadowExtraction };
}

export async function processPendingTeacherKnowledgeLessons(limit = 5, options: { deadlineMs?: number } = {}) {
  const take = Math.max(1, Math.min(10, Math.trunc(limit)));
  const pending = (await listLessons()).filter((lesson) => lesson.status === "DRAFT").slice(0, take);
  const results: Array<{ id: string; status: "REVIEWING" | "FAILED"; message: string }> = [];
  for (const lesson of pending) {
    if (options.deadlineMs && Date.now() >= options.deadlineMs - 2_000) {
      results.push({ id: lesson.id, status: "FAILED", message: "RUN_BUDGET_EXHAUSTED_BEFORE_START" });
      continue;
    }
    try {
      const result = await analyzeTeacherKnowledgeLesson(lesson.id, "AUTOMATION:process-lessons", options);
      results.push({
        id: lesson.id,
        status: "REVIEWING",
        message: `AI整理完成；奇门合格读数 ${result.qimenShadowExtraction.accepted.length} 条`,
      });
    } catch (error) {
      results.push({ id: lesson.id, status: "FAILED", message: error instanceof Error ? error.message : "AI整理失败" });
    }
  }
  return results;
}

export async function backfillTeacherKnowledgeQimenLessons(limit = 1, options: { deadlineMs?: number } = {}) {
  const candidates = await listTeacherKnowledgeQimenBackfillCandidates(limit);
  const results: Array<{ id: string; status: "QIMEN_BACKFILLED" | "UNCHANGED" | "FAILED"; message: string }> = [];
  for (const lesson of candidates) {
    if (options.deadlineMs && Date.now() >= options.deadlineMs - 2_000) {
      results.push({ id: lesson.id, status: "FAILED", message: "RUN_BUDGET_EXHAUSTED_BEFORE_QIMEN_BACKFILL" });
      continue;
    }
    try {
      const report = await extractQimenLessonReadings({
        transcript: lesson.rawTranscript,
        timeoutMs: boundedModelTimeout(options.deadlineMs),
      });
      const saved = await saveTeacherKnowledgeQimenBackfill({
        lessonId: lesson.id,
        expectedTranscriptSha256: lesson.transcriptSha256,
        report,
      });
      results.push({
        id: lesson.id,
        status: saved ? "QIMEN_BACKFILLED" : "UNCHANGED",
        message: saved ? `只补奇门证据；合格读数 ${report.accepted.length} 条；原状态 ${lesson.status} 保持不变` : "课程已变化或已有奇门报告，未覆盖",
      });
    } catch (error) {
      results.push({ id: lesson.id, status: "FAILED", message: error instanceof Error ? error.message : "奇门补抽失败" });
    }
  }
  return results;
}
