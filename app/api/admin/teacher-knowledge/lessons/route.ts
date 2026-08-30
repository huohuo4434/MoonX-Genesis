import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, getCurrentUser } from "@/lib/auth/permissions";
import { createLesson, listLessons } from "@/lib/teacher-knowledge/store";
import { analyzeTeacherKnowledgeLesson } from "@/lib/teacher-knowledge/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const lessons = await listLessons();
  return NextResponse.json(
    {
      lessons: lessons.map((l) => ({
        id: l.id,
        lessonCode: l.lessonCode,
        title: l.title,
        teacherName: l.teacherName,
        courseSeries: l.courseSeries,
        status: l.status,
        version: l.version,
        createdAt: l.createdAt,
        // never expose full rawTranscript in list
        rawLength: l.rawTranscript.length,
        automationAttemptCount: l.automationAttemptCount ?? 0,
        automationNextRetryAt: l.automationNextRetryAt ?? null,
        automationLastError: l.automationLastError ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
  );
}

const createSchema = z.object({
  title: z.string().min(1),
  teacherName: z.string().optional(),
  courseSeries: z.string().optional(),
  lessonNumber: z.string().optional(),
  lessonDate: z.string().nullable().optional(),
  originalFileName: z.string().nullable().optional(),
  sourceType: z
    .enum(["AUDIO_TRANSCRIPT", "VIDEO_TRANSCRIPT", "MANUAL_NOTE", "IMAGE_TRANSCRIPT", "OTHER"])
    .optional(),
  assets: z.array(z.string()).optional(),
  timeframes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  rawTranscript: z.string().min(1),
  adminNotes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const requestStartedMs = Date.now();
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const user = await getCurrentUser();
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const lesson = await createLesson({
      ...parsed.data,
      createdBy: user?.email || null,
    });
    let processingStatus: "REVIEWING" | "QUEUED_RETRY" = "REVIEWING";
    let processingMessage = "上传后已完成第一轮方法整理";
    try {
      await analyzeTeacherKnowledgeLesson(
        lesson.id,
        `ADMIN:${user?.email || user?.id || "unknown"}`,
        { deadlineMs: requestStartedMs + 55_000 },
      );
    } catch (error) {
      processingStatus = "QUEUED_RETRY";
      processingMessage = `即时处理未完成，已保留原文并进入两小时补偿队列：${error instanceof Error ? error.message.slice(0, 160) : "未知错误"}`;
    }
    return NextResponse.json(
      { lesson, processingStatus, processingMessage },
      { status: 201, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 400 }
    );
  }
}
