import "server-only";

import { convertToWavIfNeeded } from "@/lib/teacher-learning-center/convert";
import type { TranscriptSegment } from "@/lib/teacher-learning-center/types";
import { TLC_MIME_BY_EXT } from "@/lib/teacher-learning-center/types";
import { extname } from "path";

export type TranscribeResult = {
  text: string;
  segments: TranscriptSegment[];
  usedWavFallback: boolean;
};

/**
 * Whisper ASR — m4a first-class (OpenAI accepts m4a natively).
 * On failure, auto-convert to wav via ffmpeg and retry (user-invisible).
 */
export async function transcribeTeacherMedia(input: {
  buffer: Buffer;
  fileName: string;
  mime?: string | null;
  onProgress?: (percent: number) => Promise<void> | void;
}): Promise<TranscribeResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("未配置 OPENAI_API_KEY，无法调用 Whisper");

  await input.onProgress?.(10);

  try {
    const direct = await callWhisper({
      buffer: input.buffer,
      fileName: preferM4aName(input.fileName),
      mime: input.mime,
      apiKey: key,
    });
    await input.onProgress?.(100);
    return { ...direct, usedWavFallback: false };
  } catch (firstErr) {
    await input.onProgress?.(40);
    const converted = await convertToWavIfNeeded({
      buffer: input.buffer,
      fileName: input.fileName,
    });
    if (!converted) {
      throw firstErr instanceof Error ? firstErr : new Error("Whisper 识别失败");
    }
    await input.onProgress?.(60);
    const retry = await callWhisper({
      buffer: converted.buffer,
      fileName: converted.fileName,
      mime: "audio/wav",
      apiKey: key,
    });
    await input.onProgress?.(100);
    return { ...retry, usedWavFallback: true };
  }
}

function preferM4aName(fileName: string): string {
  const ext = extname(fileName).toLowerCase();
  if (ext === ".m4a") return fileName.endsWith(".m4a") ? fileName : `${fileName}.m4a`;
  return fileName;
}

async function callWhisper(input: {
  buffer: Buffer;
  fileName: string;
  mime?: string | null;
  apiKey: string;
}): Promise<{ text: string; segments: TranscriptSegment[] }> {
  const ext = extname(input.fileName).toLowerCase() || ".mp3";
  const mime = input.mime || TLC_MIME_BY_EXT[ext] || "application/octet-stream";
  const form = new FormData();
  const bytes = new Uint8Array(input.buffer);
  const blob = new Blob([bytes], { type: mime });
  form.append("file", blob, input.fileName || `audio${ext}`);
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "whisper-1");
  form.append("language", "zh");
  form.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Whisper 失败: ${res.status} ${err.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    text?: string;
    segments?: Array<{ start?: number; end?: number; text?: string }>;
  };
  const text = json.text?.trim() || "";
  if (!text) throw new Error("Whisper 返回空文本");
  const segments: TranscriptSegment[] = (json.segments || [])
    .map((s) => ({
      start: Number(s.start ?? 0),
      end: Number(s.end ?? 0),
      text: String(s.text || "").trim(),
    }))
    .filter((s) => s.text);
  return { text, segments };
}
