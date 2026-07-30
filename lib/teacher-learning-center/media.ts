import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { extname, resolve } from "path";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  TLC_ALLOWED_EXTS,
  TLC_MAX_BYTES,
  TLC_MIME_BY_EXT,
} from "@/lib/teacher-learning-center/types";

const BUCKET = "moonx-teacher-learning";
const LOCAL_DIR = resolve(process.cwd(), "data", "teacher-learning-media");

export function isAllowedTlcMedia(fileName: string, mime?: string | null): boolean {
  const ext = extname(fileName).toLowerCase();
  if ((TLC_ALLOWED_EXTS as readonly string[]).includes(ext)) return true;
  if (mime && Object.values(TLC_MIME_BY_EXT).includes(mime)) return true;
  return false;
}

export function assertUploadLimits(fileSize: number) {
  if (fileSize <= 0) throw new Error("空文件");
  if (fileSize > TLC_MAX_BYTES) throw new Error("单文件不能超过 500MB");
}

export async function uploadTlcMedia(input: {
  lessonId: string;
  fileName: string;
  mime: string | null;
  bytes: Buffer;
}): Promise<{ path: string; size: number }> {
  assertUploadLimits(input.bytes.length);
  const safeName = input.fileName.replace(/[^\w.\-()\u4e00-\u9fff]+/g, "_");
  const path = `${input.lessonId}/${Date.now()}_${safeName}`;

  const admin = getAdminClient();
  if (admin) {
    try {
      await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: TLC_MAX_BYTES });
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

export async function downloadTlcMedia(mediaPath: string): Promise<Buffer | null> {
  if (mediaPath.startsWith("local://")) {
    const p = mediaPath.replace(/^local:\/\//, "");
    if (!existsSync(p)) return null;
    return readFileSync(p);
  }
  if (mediaPath.startsWith("supabase://")) {
    const rest = mediaPath.replace(/^supabase:\/\//, "");
    const slash = rest.indexOf("/");
    const bucket = rest.slice(0, slash);
    const objectPath = rest.slice(slash + 1);
    const admin = getAdminClient();
    if (!admin) return null;
    const { data, error } = await admin.storage.from(bucket).download(objectPath);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  return null;
}

export async function writeLocalTemp(fileName: string, bytes: Buffer): Promise<string> {
  const dir = resolve(LOCAL_DIR, "_tmp");
  mkdirSync(dir, { recursive: true });
  const p = resolve(dir, fileName);
  writeFileSync(p, bytes);
  return p;
}

export function removeLocalTemp(path: string) {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {
    /* ignore */
  }
}

export function publicPlaybackUrl(audioUrl: string): string | null {
  // Local/supabase paths are served via API proxy
  if (!audioUrl || audioUrl === "pending") return null;
  return `/api/admin/teacher-learning/media?path=${encodeURIComponent(audioUrl)}`;
}
