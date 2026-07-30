import "server-only";

import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { basename, extname } from "path";
import { removeLocalTemp, writeLocalTemp } from "@/lib/teacher-learning-center/media";

/**
 * Try ffmpeg to convert any media → wav (16k mono) for Whisper fallback.
 * User-invisible. Returns null if ffmpeg unavailable or conversion fails.
 */
export async function convertToWavIfNeeded(input: {
  buffer: Buffer;
  fileName: string;
}): Promise<{ buffer: Buffer; fileName: string; converted: boolean } | null> {
  const ext = extname(input.fileName).toLowerCase();
  if (ext === ".wav") {
    return { buffer: input.buffer, fileName: input.fileName, converted: false };
  }

  const inPath = await writeLocalTemp(`in_${Date.now()}${ext || ".bin"}`, input.buffer);
  const outPath = inPath.replace(extname(inPath), "") + ".wav";

  try {
    const ok = await runFfmpeg(inPath, outPath);
    if (!ok || !existsSync(outPath)) return null;
    const wav = readFileSync(outPath);
    return { buffer: wav, fileName: basename(outPath), converted: true };
  } catch {
    return null;
  } finally {
    removeLocalTemp(inPath);
    removeLocalTemp(outPath);
  }
}

function runFfmpeg(inputPath: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(
      "ffmpeg",
      ["-y", "-i", inputPath, "-ac", "1", "-ar", "16000", "-f", "wav", outputPath],
      { windowsHide: true }
    );
    let settled = false;
    const done = (v: boolean) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    proc.on("error", () => done(false));
    proc.on("close", (code) => done(code === 0));
    setTimeout(() => {
      try {
        proc.kill();
      } catch {
        /* ignore */
      }
      done(false);
    }, 120_000);
  });
}
