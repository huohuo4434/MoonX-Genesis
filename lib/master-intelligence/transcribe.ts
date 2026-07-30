import "server-only";

/**
 * Transcription provider — OpenAI Whisper when OPENAI_API_KEY set.
 * Without key, returns null so pipeline can wait for admin raw paste.
 */
export async function transcribeMediaBuffer(input: {
  buffer: ArrayBuffer;
  fileName: string;
  mime?: string | null;
}): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const form = new FormData();
  const blob = new Blob([input.buffer], { type: input.mime || "audio/mpeg" });
  form.append("file", blob, input.fileName || "lesson.mp3");
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "whisper-1");
  form.append("language", "zh");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Transcription failed: ${res.status} ${err.slice(0, 200)}`);
  }
  const json = (await res.json()) as { text?: string };
  return json.text?.trim() || null;
}
