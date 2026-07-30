import "server-only";

import { downloadLessonMedia, isAllowedLessonMedia, uploadLessonMedia } from "@/lib/master-intelligence/storage";
import { transcribeMediaBuffer } from "@/lib/master-intelligence/transcribe";
import { organizeTeacherVoiceText } from "@/lib/teacher-voice-learning/organize";
import {
  createTeacherNote,
  getTeacherNote,
  updateTeacherNote,
} from "@/lib/teacher-voice-learning/store";
import { VOICE_LEARNING_EXTS } from "@/lib/teacher-voice-learning/types";
import { extname } from "path";

const MIME_BY_EXT: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
};

export function isVoiceLearningFile(fileName: string, mime?: string | null): boolean {
  const ext = extname(fileName).toLowerCase();
  if ((VOICE_LEARNING_EXTS as readonly string[]).includes(ext)) return true;
  return isAllowedLessonMedia(fileName, mime) && [".mp3", ".m4a", ".wav", ".mp4"].includes(ext);
}

function mediaFileNameFromPath(sourceAudio: string, noteId: string): { fileName: string; mime: string } {
  const bare = sourceAudio.split("/").pop() || `${noteId}.mp3`;
  const cleaned = bare.replace(/^\d+_/, "");
  const ext = extname(cleaned).toLowerCase() || ".mp3";
  const allowed = (VOICE_LEARNING_EXTS as readonly string[]).includes(ext) ? ext : ".mp3";
  return {
    fileName: `${noteId}${allowed}`,
    mime: MIME_BY_EXT[allowed] || "audio/mpeg",
  };
}

export async function createNoteFromUpload(input: {
  fileName: string;
  mime: string | null;
  bytes: Buffer;
}): Promise<{ id: string }> {
  if (!isVoiceLearningFile(input.fileName, input.mime)) {
    throw new Error("仅支持 mp3、m4a、wav、mp4");
  }
  const note = await createTeacherNote({ sourceAudio: "pending" });
  const uploaded = await uploadLessonMedia({
    lessonId: note.id,
    fileName: input.fileName,
    mime: input.mime,
    bytes: input.bytes,
  });
  await updateTeacherNote(note.id, {
    sourceAudio: uploaded.path,
    status: "UPLOADED",
    progress: 10,
  });
  return { id: note.id };
}

/** Run Whisper ASR → AI organize; updates progress for polling UI. */
export async function processTeacherNote(id: string): Promise<{
  status: string;
  progress: number;
  message: string;
  rawTextLength?: number;
}> {
  const note = await getTeacherNote(id);
  if (!note) return { status: "FAILED", progress: 0, message: "未找到记录" };

  try {
    let raw = note.rawText.trim();
    if (!raw) {
      await updateTeacherNote(id, { status: "TRANSCRIBING", progress: 25, errorMessage: null });
      const buf = await downloadLessonMedia(note.sourceAudio);
      if (!buf) {
        await updateTeacherNote(id, {
          status: "FAILED",
          progress: 25,
          errorMessage: "无法读取音频，请重新上传",
        });
        return { status: "FAILED", progress: 25, message: "media missing" };
      }

      const { fileName, mime } = mediaFileNameFromPath(note.sourceAudio, id);
      let text: string | null = null;
      try {
        text = await transcribeMediaBuffer({
          buffer: buf,
          fileName,
          mime,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Whisper 调用失败";
        await updateTeacherNote(id, {
          status: "FAILED",
          progress: 40,
          errorMessage: msg,
        });
        return { status: "FAILED", progress: 40, message: msg };
      }

      if (!text) {
        await updateTeacherNote(id, {
          status: "FAILED",
          progress: 40,
          errorMessage: "Whisper 未配置或返回空文本：请设置 OPENAI_API_KEY",
        });
        return { status: "FAILED", progress: 40, message: "whisper unavailable" };
      }

      raw = text;
      await updateTeacherNote(id, {
        rawText: raw,
        status: "TRANSCRIBED",
        progress: 55,
      });
    } else if (note.status === "UPLOADED" || note.status === "TRANSCRIBING") {
      await updateTeacherNote(id, { status: "TRANSCRIBED", progress: 55 });
    }

    await updateTeacherNote(id, { status: "LEARNING", progress: 70 });
    const organized = await organizeTeacherVoiceText(raw);
    await updateTeacherNote(id, {
      summary: organized.summary,
      rules: organized.rules,
      cases: organized.cases,
      knowledge: organized.knowledge,
      keywords: organized.keywords,
      status: "READY",
      progress: 100,
      errorMessage: null,
    });
    return {
      status: "READY",
      progress: 100,
      message: "学习完成",
      rawTextLength: raw.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "处理失败";
    await updateTeacherNote(id, { status: "FAILED", errorMessage: msg, progress: note.progress || 0 });
    return { status: "FAILED", progress: note.progress || 0, message: msg };
  }
}
