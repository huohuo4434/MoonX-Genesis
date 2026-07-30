import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { downloadTlcMedia } from "@/lib/teacher-learning-center/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "缺少 path" }, { status: 400 });
  const buf = await downloadTlcMedia(path);
  if (!buf) return NextResponse.json({ error: "文件不存在" }, { status: 404 });

  const lower = path.toLowerCase();
  let contentType = "application/octet-stream";
  if (lower.endsWith(".m4a")) contentType = "audio/mp4";
  else if (lower.endsWith(".mp3")) contentType = "audio/mpeg";
  else if (lower.endsWith(".wav")) contentType = "audio/wav";
  else if (lower.endsWith(".mp4")) contentType = "video/mp4";
  else if (lower.endsWith(".webm")) contentType = "audio/webm";
  else if (lower.endsWith(".ogg")) contentType = "audio/ogg";
  else if (lower.endsWith(".aac")) contentType = "audio/aac";
  else if (lower.endsWith(".flac")) contentType = "audio/flac";

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
