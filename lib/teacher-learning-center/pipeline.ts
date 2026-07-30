import "server-only";

import { extname } from "path";
import { runTeacherAiLearning } from "@/lib/teacher-learning-center/ai-learn";
import {
  assertUploadLimits,
  downloadTlcMedia,
  isAllowedTlcMedia,
  uploadTlcMedia,
} from "@/lib/teacher-learning-center/media";
import { createLesson, getLesson, updateLesson } from "@/lib/teacher-learning-center/store";
import { transcribeTeacherMedia } from "@/lib/teacher-learning-center/transcribe";
import {
  TLC_MAX_DURATION_SEC,
  defaultProgress,
  estimateDurationSec,
  type ProgressStep,
  type TeacherLessonRecord,
} from "@/lib/teacher-learning-center/types";

function setStep(
  progress: ProgressStep[],
  id: ProgressStep["id"],
  patch: Partial<ProgressStep>
): ProgressStep[] {
  return progress.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export async function uploadTeacherLesson(input: {
  fileName: string;
  mime: string | null;
  bytes: Buffer;
  title?: string;
}): Promise<TeacherLessonRecord> {
  if (!isAllowedTlcMedia(input.fileName, input.mime)) {
    throw new Error("不支持的格式。优先 m4a，并支持 mp3/wav/aac/flac/ogg/mp4/mov/webm/mkv");
  }
  assertUploadLimits(input.bytes.length);
  const ext = extname(input.fileName).toLowerCase();
  const durationSec = estimateDurationSec(input.bytes.length, ext);
  if (durationSec > TLC_MAX_DURATION_SEC) {
    throw new Error("预计时长超过 4 小时，请拆分后上传");
  }

  const draft = await createLesson({
    title: input.title || input.fileName.replace(/\.[^.]+$/, ""),
    fileName: input.fileName,
    fileSize: input.bytes.length,
    durationSec,
    mime: input.mime,
    audioUrl: "pending",
  });

  const uploaded = await uploadTlcMedia({
    lessonId: draft.id,
    fileName: input.fileName,
    mime: input.mime,
    bytes: input.bytes,
  });

  const lesson = await updateLesson(draft.id, {
    audioUrl: uploaded.path,
    status: "UPLOADED",
    progress: defaultProgress(),
  });
  if (!lesson) throw new Error("创建课程失败");
  return lesson;
}

/** Full learning pipeline: read → Whisper → raw text → AI → rules/cases → ready (not yet KB). */
export async function startTeacherLearning(lessonId: string): Promise<TeacherLessonRecord> {
  const lesson = await getLesson(lessonId);
  if (!lesson) throw new Error("课程不存在");

  let progress = defaultProgress();
  const fail = async (msg: string) => {
    const updated = await updateLesson(lessonId, {
      status: "FAILED",
      errorMessage: msg,
      progress: progress.map((s) =>
        s.status === "running" ? { ...s, status: "error" } : s
      ),
    });
    if (!updated) throw new Error(msg);
    return updated;
  };

  try {
    // Step 1 — read audio
    progress = setStep(progress, "read", { status: "running", percent: 20 });
    await updateLesson(lessonId, { status: "READING", progress, errorMessage: null });
    const buf = await downloadTlcMedia(lesson.audioUrl);
    if (!buf) return fail("无法读取音频文件");
    progress = setStep(progress, "read", { status: "done", percent: 100 });
    await updateLesson(lessonId, { progress });

    // Step 2–3 — Whisper → raw text (immutable once written this run)
    progress = setStep(progress, "whisper", { status: "running", percent: 5 });
    await updateLesson(lessonId, { status: "TRANSCRIBING", progress });

    const asr = await transcribeTeacherMedia({
      buffer: buf,
      fileName: lesson.fileName,
      mime: lesson.mime,
      onProgress: async (percent) => {
        progress = setStep(progress, "whisper", { status: "running", percent });
        await updateLesson(lessonId, { progress });
      },
    });

    // Preserve 100% raw text — never send through AI rewrite
    const rawText = asr.text;
    progress = setStep(progress, "whisper", { status: "done", percent: 100 });
    await updateLesson(lessonId, {
      rawText,
      segments: asr.segments,
      wavUrl: asr.usedWavFallback ? lesson.wavUrl : lesson.wavUrl,
      status: "TRANSCRIBED",
      progress,
      learningSeconds: lesson.durationSec || 0,
    });

    // Step 4–6 — AI learning → rules → cases
    progress = setStep(progress, "ai", { status: "running", percent: 15 });
    await updateLesson(lessonId, { status: "AI_LEARNING", progress });

    const ai = await runTeacherAiLearning(rawText);
    progress = setStep(progress, "ai", { status: "running", percent: 70 });
    await updateLesson(lessonId, {
      status: "RULES_READY",
      courseSummary: ai.courseSummary,
      coreViews: ai.coreViews,
      classicQuotes: ai.classicQuotes,
      draftRules: ai.rules,
      progress,
    });

    progress = setStep(progress, "ai", { status: "done", percent: 100 });
    await updateLesson(lessonId, {
      status: "CASES_READY",
      draftCases: ai.cases,
      draftConcepts: ai.concepts,
      draftQuotes: ai.quotes,
      draftMnemonics: ai.mnemonics,
      draftExceptions: ai.exceptions,
      draftPredictions: ai.predictions,
      progress,
    });

    // Step 7 — ready for「加入知识库」(store stays pending until publish)
    progress = setStep(progress, "store", { status: "pending", percent: 0 });
    const ready = await updateLesson(lessonId, {
      status: "READY",
      progress,
      errorMessage: null,
    });
    if (!ready) throw new Error("学习完成但保存失败");
    return ready;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "学习失败";
    return fail(msg);
  }
}

export async function relearnTeacherLesson(lessonId: string): Promise<TeacherLessonRecord> {
  // Re-run Whisper + AI; keep previous rawText only if Whisper fails mid-way (fail path)
  await updateLesson(lessonId, {
    status: "UPLOADED",
    errorMessage: null,
    progress: defaultProgress(),
    // clear AI drafts; rawText will be overwritten by new Whisper (still 100% ASR output)
    courseSummary: "",
    coreViews: "",
    classicQuotes: [],
    draftRules: [],
    draftCases: [],
    draftConcepts: [],
    draftQuotes: [],
    draftMnemonics: [],
    draftExceptions: [],
    draftPredictions: [],
  });
  return startTeacherLearning(lessonId);
}

export async function reAiOrganizeOnly(lessonId: string): Promise<TeacherLessonRecord> {
  const lesson = await getLesson(lessonId);
  if (!lesson) throw new Error("课程不存在");
  if (!lesson.rawText.trim()) throw new Error("无原始文字，请先重新学习");

  let progress = lesson.progress.length ? lesson.progress : defaultProgress();
  progress = setStep(progress, "ai", { status: "running", percent: 20 });
  await updateLesson(lessonId, { status: "AI_LEARNING", progress, errorMessage: null });

  const ai = await runTeacherAiLearning(lesson.rawText);
  progress = setStep(progress, "ai", { status: "done", percent: 100 });
  progress = setStep(progress, "store", { status: "pending", percent: 0 });

  const next = await updateLesson(lessonId, {
    courseSummary: ai.courseSummary,
    coreViews: ai.coreViews,
    classicQuotes: ai.classicQuotes,
    draftRules: ai.rules,
    draftCases: ai.cases,
    draftConcepts: ai.concepts,
    draftQuotes: ai.quotes,
    draftMnemonics: ai.mnemonics,
    draftExceptions: ai.exceptions,
    draftPredictions: ai.predictions,
    status: "READY",
    progress,
  });
  if (!next) throw new Error("重新整理失败");
  return next;
}
