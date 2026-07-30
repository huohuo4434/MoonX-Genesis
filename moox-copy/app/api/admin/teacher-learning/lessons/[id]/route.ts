import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { publicPlaybackUrl } from "@/lib/teacher-learning-center/media";
import {
  reAiOrganizeOnly,
  relearnTeacherLesson,
  startTeacherLearning,
} from "@/lib/teacher-learning-center/pipeline";
import {
  deleteLesson,
  getLesson,
  publishLessonToKnowledgeBase,
  updateLesson,
} from "@/lib/teacher-learning-center/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  const lesson = await getLesson(id);
  if (!lesson) return NextResponse.json({ error: "不存在" }, { status: 404 });
  return NextResponse.json(
    { lesson: { ...lesson, playbackUrl: publicPlaybackUrl(lesson.audioUrl) } },
    { headers: { "Cache-Control": "no-store" } }
  );
}

const patchSchema = z.object({
  action: z.enum(["learn", "relearn", "re-ai", "publish", "rename"]),
  title: z.string().optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    if (parsed.data.action === "rename") {
      const lesson = await updateLesson(id, { title: parsed.data.title || "" });
      return NextResponse.json({ lesson });
    }
    if (parsed.data.action === "learn") {
      const lesson = await startTeacherLearning(id);
      return NextResponse.json({
        lesson: { ...lesson, playbackUrl: publicPlaybackUrl(lesson.audioUrl) },
      });
    }
    if (parsed.data.action === "relearn") {
      const lesson = await relearnTeacherLesson(id);
      return NextResponse.json({
        lesson: { ...lesson, playbackUrl: publicPlaybackUrl(lesson.audioUrl) },
      });
    }
    if (parsed.data.action === "re-ai") {
      const lesson = await reAiOrganizeOnly(id);
      return NextResponse.json({
        lesson: { ...lesson, playbackUrl: publicPlaybackUrl(lesson.audioUrl) },
      });
    }
    if (parsed.data.action === "publish") {
      const result = await publishLessonToKnowledgeBase(id);
      const lesson = await getLesson(id);
      return NextResponse.json({ ...result, lesson });
    }
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "操作失败" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  await deleteLesson(id);
  return NextResponse.json({ ok: true });
}
