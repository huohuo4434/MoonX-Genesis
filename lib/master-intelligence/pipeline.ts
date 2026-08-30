import "server-only";

import { randomUUID } from "node:crypto";
import { detectRuleConflicts } from "@/lib/master-intelligence/conflict";
import { extractKnowledge } from "@/lib/master-intelligence/extract";
import { extractQimenLessonReadings } from "@/lib/research/qimen-shadow-lesson-extract";
import {
  addConflicts,
  getLesson,
  listLessonQimenBackfillCandidates,
  listLessons,
  newId,
  replaceCandidatesForLesson,
  setCleanTranscript,
  setRawTranscript,
  saveLessonQimenBackfill,
  updateLesson,
  upsertExtraction,
  upsertGraphEdge,
  upsertGraphNode,
  upsertPublishedCase,
  type CandidateRecord,
} from "@/lib/master-intelligence/store";
import { downloadLessonMedia } from "@/lib/master-intelligence/storage";
import { buildCleanTranscript } from "@/lib/master-intelligence/transcript";
import { transcribeMediaBuffer } from "@/lib/master-intelligence/transcribe";
import { detectVoiceSignals } from "@/lib/master-intelligence/voice";
import type { ExtractionBundle, KnowledgeKind, LessonStatus } from "@/lib/master-intelligence/types";
import { KNOWLEDGE_WEIGHT_STARS } from "@/lib/master-intelligence/types";
import {
  acquireQimenLessonProcessingLease,
  releaseQimenLessonProcessingLease,
} from "@/lib/research/qimen-lesson-automation-lease";
import {
  isLessonAutomationRetryDue,
  registerLessonAutomationFailure,
} from "@/lib/research/lesson-processing-retry-core";

function kindWeight(kind: KnowledgeKind): number {
  if (kind === "CASE") return KNOWLEDGE_WEIGHT_STARS.TEACHER_CASE;
  return KNOWLEDGE_WEIGHT_STARS.TEACHER;
}

function bundleToCandidates(bundle: ExtractionBundle): Array<{
  kind: KnowledgeKind;
  title: string;
  body: string;
  payload: unknown;
  weightStars: number;
}> {
  const map: Array<[KnowledgeKind, typeof bundle.rules]> = [
    ["RULE", bundle.rules],
    ["CASE", bundle.cases],
    ["CONCEPT", bundle.concepts],
    ["FORMULA", bundle.formulas],
    ["EXCEPTION", bundle.exceptions],
    ["PREDICTION", bundle.predictions],
    ["QUOTE", bundle.quotes],
  ];
  const out: Array<{
    kind: KnowledgeKind;
    title: string;
    body: string;
    payload: unknown;
    weightStars: number;
  }> = [];
  for (const [kind, items] of map) {
    for (const item of items) {
      out.push({
        kind,
        title: item.title,
        body: item.body,
        payload: item,
        weightStars: kindWeight(kind),
      });
    }
  }
  return out;
}

async function applyGraphFromBundle(lessonId: string, bundle: ExtractionBundle) {
  const chain = [
    ...bundle.rules.map((r) => r.motif || r.title),
    ...bundle.concepts.map((c) => c.title),
    ...bundle.predictions.map((p) => p.title),
  ]
    .map((s) => s.replace(/^规则：|^概念：|^预测：/, "").trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const label of chain) {
    const key = label.slice(0, 40);
    await upsertGraphNode({
      id: newId("kn"),
      key,
      label: key,
      kind: "CONCEPT",
      weightStars: 5,
      sourceLessonId: lessonId,
    });
  }
  for (let i = 0; i < chain.length - 1; i++) {
    await upsertGraphEdge({
      id: newId("ke"),
      fromKey: chain[i]!.slice(0, 40),
      toKey: chain[i + 1]!.slice(0, 40),
      relation: "IMPLIES",
      weightStars: 5,
      sourceLessonId: lessonId,
    });
  }
}

function boundedModelTimeout(deadlineMs?: number): number {
  if (!deadlineMs) return 20_000;
  return Math.max(1, Math.min(20_000, deadlineMs - Date.now() - 1_500));
}

async function processLessonOnce(lessonId: string, options: { deadlineMs?: number } = {}): Promise<{
  status: LessonStatus;
  message: string;
}> {
  const pack = await getLesson(lessonId);
  if (!pack) return { status: "FAILED", message: "Lesson not found" };
  const { lesson, transcript } = pack;

  try {
    if (lesson.status === "UPLOADED" || lesson.status === "TRANSCRIBING" || lesson.status === "FAILED") {
      let raw = transcript?.rawText?.trim() || "";
      await updateLesson(lessonId, { status: "TRANSCRIBING", errorMessage: null });
      if (!raw && lesson.mediaPath) {
        const buf = await downloadLessonMedia(lesson.mediaPath, {
          timeoutMs: boundedModelTimeout(options.deadlineMs),
        });
        if (buf) {
          const text = await transcribeMediaBuffer({
            buffer: buf,
            fileName: lesson.mediaFileName || "lesson.mp3",
            mime: lesson.mediaMime,
            timeoutMs: boundedModelTimeout(options.deadlineMs),
          });
          if (text) {
            await setRawTranscript(lessonId, text);
            raw = text;
          }
        }
      }
      if (!raw) {
        const retry = registerLessonAutomationFailure(lesson);
        await updateLesson(lessonId, {
          status: retry.exhausted ? "FAILED" : "UPLOADED",
          errorMessage: "等待转录：请配置 OPENAI_API_KEY 或粘贴 Raw Transcript",
          automationAttemptCount: retry.attemptCount,
          automationNextRetryAt: retry.nextRetryAt,
          automationLastError: "WAITING_FOR_TRANSCRIPT",
        });
        return {
          status: retry.exhausted ? "FAILED" : "UPLOADED",
          message: retry.exhausted ? "自动重试已达上限，等待管理员手动重试" : "Waiting for transcript",
        };
      }
      const clean = buildCleanTranscript(raw);
      await setCleanTranscript(lessonId, clean);
      await updateLesson(lessonId, {
        status: "TRANSCRIBED",
      });
      return { status: "TRANSCRIBED", message: "Transcribed" };
    }

    if (lesson.status === "TRANSCRIBED" || lesson.status === "ANALYZING") {
      if (lesson.status !== "ANALYZING") await updateLesson(lessonId, { status: "ANALYZING" });
      const fresh = await getLesson(lessonId);
      const clean = fresh?.transcript?.cleanText || "";
      const raw = fresh?.transcript?.rawText || "";
      const [bundle, qimenShadow] = await Promise.all([
        extractKnowledge(clean, { timeoutMs: boundedModelTimeout(options.deadlineMs) }),
        extractQimenLessonReadings({ transcript: raw, timeoutMs: boundedModelTimeout(options.deadlineMs) }),
      ]);
      const voice = detectVoiceSignals(clean);
      await upsertExtraction(lessonId, {
        status: "DRAFT",
        summary: bundle.summary,
        rulesJson: bundle.rules,
        casesJson: bundle.cases,
        conceptsJson: bundle.concepts,
        formulasJson: bundle.formulas,
        exceptionsJson: bundle.exceptions,
        predictionsJson: bundle.predictions,
        quotesJson: bundle.quotes,
        lessonOutputJson: {
          summary: bundle.summary,
          newRules: bundle.rules.length,
          newCases: bundle.cases.length,
          newConcepts: bundle.concepts.length,
          newExceptions: bundle.exceptions.length,
          newPredictions: bundle.predictions.length,
          voice,
          qimenShadow,
        },
      });
      const cands = bundleToCandidates(bundle);
      const created = await replaceCandidatesForLesson(lessonId, cands);

      const conflicts = detectRuleConflicts(
        created
          .filter((c) => c.kind === "RULE" || c.kind === "PREDICTION")
          .map((c) => ({ id: c.id, text: `${c.title}\n${c.body}`, lessonId }))
      );
      if (conflicts.length) {
        await addConflicts(
          conflicts.map((c) => ({
            id: newId("conf"),
            ruleCodeOrMotif: c.motif,
            leftCandidateId: c.left.id,
            rightCandidateId: c.right.id,
            leftText: c.left.text.slice(0, 500),
            rightText: c.right.text.slice(0, 500),
            hypothesizedCause: c.hypothesizedCause,
            status: "OPEN" as const,
            resolvedNote: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        );
      }

      await applyGraphFromBundle(lessonId, bundle);
      await updateLesson(lessonId, {
        status: "REVIEWING",
        automationAttemptCount: 0,
        automationNextRetryAt: null,
        automationLastError: null,
      });
      return { status: "REVIEWING", message: "Extraction ready for review" };
    }

    if (lesson.status === "REVIEWING") {
      return { status: lesson.status, message: "Awaiting admin review" };
    }

    if (lesson.status === "PUBLISHED") {
      return { status: "PUBLISHED", message: "Already published" };
    }

    return { status: lesson.status, message: "No-op" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "process failed";
    const retry = registerLessonAutomationFailure(lesson);
    await updateLesson(lessonId, {
      status: "FAILED",
      errorMessage: msg,
      automationAttemptCount: retry.attemptCount,
      automationNextRetryAt: retry.nextRetryAt,
      automationLastError: msg.slice(0, 500),
    });
    return {
      status: "FAILED",
      message: retry.exhausted ? `${msg}; 自动重试已达上限，等待管理员手动重试` : msg,
    };
  }
}

export async function processLessonToReview(
  lessonId: string,
  options: { deadlineMs?: number; maxSteps?: number } = {},
): Promise<{ status: LessonStatus; message: string }> {
  const owner = randomUUID();
  const acquired = await acquireQimenLessonProcessingLease({ lessonId, owner, ttlMs: 70_000 });
  const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  if (isProd && !acquired) {
    const current = await getLesson(lessonId);
    return {
      status: current?.lesson.status ?? "FAILED",
      message: "同一课程正在由另一任务处理；本轮安全跳过",
    };
  }
  const maxSteps = Math.max(1, Math.min(4, Math.trunc(options.maxSteps ?? 3)));
  let last: { status: LessonStatus; message: string } = { status: "UPLOADED", message: "Queued" };
  try {
    for (let step = 0; step < maxSteps; step += 1) {
      if (options.deadlineMs && Date.now() >= options.deadlineMs - 2_000) {
        return { status: last.status, message: `${last.message}; queued for compensation run` };
      }
      const next = await processLessonOnce(lessonId, options);
      last = next;
      if (["REVIEWING", "PUBLISHED", "FAILED"].includes(next.status)) return next;
      if (!["TRANSCRIBED", "ANALYZING"].includes(next.status)) return next;
    }
    return last;
  } finally {
    if (acquired) await releaseQimenLessonProcessingLease(lessonId, owner).catch(() => undefined);
  }
}

export async function processPendingLessons(limit = 5, options: { deadlineMs?: number } = {}): Promise<Array<{ id: string; status: LessonStatus; message: string }>> {
  const lessons = await listLessons();
  // A newly-created upload has not necessarily finished binding its private
  // media object. The upload request handles it immediately; compensation only
  // takes over after this short recovery window (and the per-lesson lease).
  const pickupBefore = new Date(Date.now() - 120_000).toISOString();
  const pending = lessons
    .filter((l) => l.status === "UPLOADED" || l.status === "TRANSCRIBING" || l.status === "TRANSCRIBED" || l.status === "ANALYZING" || l.status === "FAILED")
    .filter((l) => l.updatedAt <= pickupBefore)
    .filter((l) => isLessonAutomationRetryDue(l))
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
    .slice(0, limit);
  const out: Array<{ id: string; status: LessonStatus; message: string }> = [];
  for (const l of pending) {
    if (options.deadlineMs && Date.now() >= options.deadlineMs - 2_000) {
      out.push({ id: l.id, status: l.status, message: "RUN_BUDGET_EXHAUSTED_BEFORE_START" });
      continue;
    }
    out.push({ id: l.id, ...(await processLessonToReview(l.id, { ...options, maxSteps: 3 })) });
  }
  return out;
}

export async function backfillMasterIntelligenceQimenLessons(limit = 1, options: { deadlineMs?: number } = {}) {
  const candidates = await listLessonQimenBackfillCandidates(limit);
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
      const saved = await saveLessonQimenBackfill({
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

export async function approveCandidateToPublished(candidate: CandidateRecord): Promise<string> {
  const { updateCandidate, upsertPublishedRule, newId: nid } = await import(
    "@/lib/master-intelligence/store"
  );
  if (candidate.kind === "RULE") {
    const code = `Rule${String(Date.now()).slice(-4)}`;
    const ruleId = nid("rule");
    await upsertPublishedRule({
      id: ruleId,
      ruleCode: code,
      title: candidate.title,
      category: "TEACHER",
      ruleText: candidate.body,
      teacherOriginalText: candidate.body,
      status: "PUBLISHED",
      lessonId: candidate.lessonId,
      candidateId: candidate.id,
      priority: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await updateCandidate(candidate.id, {
      reviewStatus: "PUBLISHED",
      publishedRef: code,
    });
    return code;
  }
  if (candidate.kind === "CASE") {
    const caseId = nid("case");
    const payload = (candidate.payload ?? {}) as { assetId?: string; motif?: string };
    await upsertPublishedCase({
      id: caseId,
      caseTitle: candidate.title,
      assetId: payload.assetId || "unknown",
      question: candidate.title,
      forecastStartAt: new Date().toISOString().slice(0, 10),
      forecastEndAt: new Date().toISOString().slice(0, 10),
      teacherConclusion: candidate.body,
      actualResult: null,
      hitStatus: "PENDING",
      lessonId: candidate.lessonId,
      candidateId: candidate.id,
      researchId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await updateCandidate(candidate.id, {
      reviewStatus: "PUBLISHED",
      publishedRef: caseId,
    });
    return caseId;
  }
  await updateCandidate(candidate.id, { reviewStatus: "APPROVED" });
  return candidate.id;
}

export async function markLessonPublished(lessonId: string): Promise<void> {
  await updateLesson(lessonId, { status: "PUBLISHED" });
}
