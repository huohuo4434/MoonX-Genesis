import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { createLesson } from "@/lib/master-intelligence/store";
import { isAllowedLessonMedia, uploadLessonMedia } from "@/lib/master-intelligence/storage";
import { processLessonToReview } from "@/lib/master-intelligence/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const requestStartedMs = Date.now();
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "未命名课程");
  const teacher = String(form.get("teacher") || "老师");
  const course = form.get("course") ? String(form.get("course")) : null;
  const lessonNumberRaw = form.get("lessonNumber");
  const lessonNumber =
    lessonNumberRaw != null && String(lessonNumberRaw).trim()
      ? Number(lessonNumberRaw)
      : null;
  const source = String(form.get("source") || "MASTER") === "INTERNAL" ? "INTERNAL" : "MASTER";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }
  if (!isAllowedLessonMedia(file.name, file.type)) {
    return NextResponse.json(
      { error: "不支持的文件类型。推荐 MP3；也支持 M4A/WAV/AAC/FLAC/MP4/MOV/WEBM/MKV" },
      { status: 400 }
    );
  }

  const lesson = await createLesson({
    title,
    teacher,
    course,
    lessonNumber: Number.isFinite(lessonNumber) ? lessonNumber : null,
    source,
    createdBy: admin.email ?? null,
  });

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadLessonMedia({
    lessonId: lesson.id,
    fileName: file.name,
    mime: file.type || null,
    bytes,
  });

  const { updateLesson } = await import("@/lib/master-intelligence/store");
  await updateLesson(lesson.id, {
    mediaPath: uploaded.path,
    mediaMime: file.type || null,
    mediaSize: uploaded.size,
    mediaFileName: file.name,
  });

  // Advance immediately as far as the bounded request permits. Unfinished work
  // remains durable and is picked up by the two-hour compensation cron.
  const processed = await processLessonToReview(lesson.id, {
    deadlineMs: requestStartedMs + 55_000,
    maxSteps: 3,
  });

  return NextResponse.json(
    { lessonId: lesson.id, status: processed.status, message: processed.message },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
