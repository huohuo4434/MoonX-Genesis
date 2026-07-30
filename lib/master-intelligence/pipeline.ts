import "server-only";

import { detectRuleConflicts } from "@/lib/master-intelligence/conflict";
import { extractKnowledge } from "@/lib/master-intelligence/extract";
import {
  addConflicts,
  getLesson,
  listLessons,
  newId,
  replaceCandidatesForLesson,
  setCleanTranscript,
  setRawTranscript,
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

export async function processLessonOnce(lessonId: string): Promise<{
  status: LessonStatus;
  message: string;
}> {
  const pack = await getLesson(lessonId);
  if (!pack) return { status: "FAILED", message: "Lesson not found" };
  const { lesson, transcript } = pack;

  try {
    if (lesson.status === "UPLOADED" || lesson.status === "FAILED") {
      await updateLesson(lessonId, { status: "TRANSCRIBING", errorMessage: null });
      let raw = transcript?.rawText?.trim() || "";
      if (!raw && lesson.mediaPath) {
        const buf = await downloadLessonMedia(lesson.mediaPath);
        if (buf) {
          const text = await transcribeMediaBuffer({
            buffer: buf,
            fileName: lesson.mediaFileName || "lesson.mp3",
            mime: lesson.mediaMime,
          });
          if (text) {
            await setRawTranscript(lessonId, text);
            raw = text;
          }
        }
      }
      if (!raw) {
        await updateLesson(lessonId, {
          status: "UPLOADED",
          errorMessage: "等待转录：请配置 OPENAI_API_KEY 或粘贴 Raw Transcript",
        });
        return { status: "UPLOADED", message: "Waiting for transcript" };
      }
      const clean = buildCleanTranscript(raw);
      await setCleanTranscript(lessonId, clean);
      await updateLesson(lessonId, { status: "TRANSCRIBED" });
      return { status: "TRANSCRIBED", message: "Transcribed" };
    }

    if (lesson.status === "TRANSCRIBED") {
      await updateLesson(lessonId, { status: "ANALYZING" });
      const fresh = await getLesson(lessonId);
      const clean = fresh?.transcript?.cleanText || "";
      const bundle = await extractKnowledge(clean);
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
      await updateLesson(lessonId, { status: "REVIEWING" });
      return { status: "REVIEWING", message: "Extraction ready for review" };
    }

    if (lesson.status === "REVIEWING" || lesson.status === "ANALYZING") {
      return { status: lesson.status, message: "Awaiting admin review" };
    }

    if (lesson.status === "PUBLISHED") {
      return { status: "PUBLISHED", message: "Already published" };
    }

    return { status: lesson.status, message: "No-op" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "process failed";
    await updateLesson(lessonId, { status: "FAILED", errorMessage: msg });
    return { status: "FAILED", message: msg };
  }
}

export async function processPendingLessons(limit = 5): Promise<Array<{ id: string; status: LessonStatus; message: string }>> {
  const lessons = await listLessons();
  const pending = lessons
    .filter((l) => l.status === "UPLOADED" || l.status === "TRANSCRIBED" || l.status === "ANALYZING")
    .slice(0, limit);
  const out: Array<{ id: string; status: LessonStatus; message: string }> = [];
  for (const l of pending) {
    out.push({ id: l.id, ...(await processLessonOnce(l.id)) });
  }
  return out;
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
