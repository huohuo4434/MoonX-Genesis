import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, getCurrentUser } from "@/lib/auth/permissions";
import { createLesson, listLessons } from "@/lib/teacher-knowledge/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const user = await getCurrentUser();
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const lesson = await createLesson({
      ...parsed.data,
      createdBy: user?.email || null,
    });
    return NextResponse.json(
      { lesson },
      { status: 201, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 400 }
    );
  }
}
