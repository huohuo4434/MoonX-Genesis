import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { LESSON_MEDIA_EXT_ALLOW, LESSON_MEDIA_MIME_ALLOW } from "@/lib/master-intelligence/types";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve, extname } from "path";

const BUCKET = "moonx-lessons";
const LOCAL_DIR = resolve(process.cwd(), "data", "lesson-media");

export function isAllowedLessonMedia(fileName: string, mime?: string | null): boolean {
  const ext = extname(fileName).toLowerCase();
  if ((LESSON_MEDIA_EXT_ALLOW as readonly string[]).includes(ext)) return true;
  if (mime && (LESSON_MEDIA_MIME_ALLOW as readonly string[]).includes(mime)) return true;
  return false;
}

export async function uploadLessonMedia(input: {
  lessonId: string;
  fileName: string;
  mime: string | null;
  bytes: Buffer;
}): Promise<{ path: string; size: number }> {
  const safeName = input.fileName.replace(/[^\w.\-()\u4e00-\u9fff]+/g, "_");
  const path = `${input.lessonId}/${Date.now()}_${safeName}`;

  const admin = getAdminClient();
  if (admin) {
    try {
      await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 500 * 1024 * 1024 });
    } catch {
      /* may exist */
    }
    const { error } = await admin.storage.from(BUCKET).upload(path, input.bytes, {
      upsert: true,
      contentType: input.mime || "application/octet-stream",
    });
    if (!error) return { path: `supabase://${BUCKET}/${path}`, size: input.bytes.length };
  }

  mkdirSync(LOCAL_DIR, { recursive: true });
  const localPath = resolve(LOCAL_DIR, `${input.lessonId}__${safeName}`);
  writeFileSync(localPath, input.bytes);
  return { path: `local://${localPath}`, size: input.bytes.length };
}

export async function downloadLessonMedia(
  mediaPath: string,
  options: { timeoutMs?: number } = {},
): Promise<ArrayBuffer | null> {
  if (mediaPath.startsWith("local://")) {
    const p = mediaPath.replace(/^local:\/\//, "");
    if (!existsSync(p)) return null;
    const buf = readFileSync(p);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  if (mediaPath.startsWith("supabase://")) {
    const rest = mediaPath.replace(/^supabase:\/\//, "");
    const slash = rest.indexOf("/");
    const bucket = rest.slice(0, slash);
    const objectPath = rest.slice(slash + 1);
    const admin = getAdminClient();
    if (!admin) return null;
    const { data: signed, error } = await admin.storage.from(bucket).createSignedUrl(objectPath, 60);
    if (error || !signed?.signedUrl) return null;
    const response = await fetch(signed.signedUrl, {
      signal: AbortSignal.timeout(Math.max(1, Math.min(20_000, Math.trunc(options.timeoutMs ?? 20_000)))),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.arrayBuffer();
  }
  return null;
}
