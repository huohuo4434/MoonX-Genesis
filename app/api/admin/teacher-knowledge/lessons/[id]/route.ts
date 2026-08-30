import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, getCurrentUser } from "@/lib/auth/permissions";
import { analyzeTeacherKnowledgeLesson } from "@/lib/teacher-knowledge/pipeline";
import {
  getLesson,
  listCases,
  listConcepts,
  listMethods,
  listQuotes,
  listRules,
  updateLessonWithVersion,
} from "@/lib/teacher-knowledge/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  const lesson = await getLesson(id);
  if (!lesson) return NextResponse.json({ error: "不存在" }, { status: 404 });
  const [rules, cases, concepts, quotes, methods] = await Promise.all([
    listRules(),
    listCases(),
    listConcepts(),
    listQuotes(),
    listMethods(),
  ]);
  return NextResponse.json(
    {
      lesson,
      drafts: {
        rules: rules.filter((r: { sourceLessonId?: string | null }) => r.sourceLessonId === lesson.id),
        cases: cases.filter((c: { sourceLessonId?: string | null }) => c.sourceLessonId === lesson.id),
        concepts: concepts.filter((c: { sourceLessonId?: string | null }) => c.sourceLessonId === lesson.id),
        quotes: quotes.filter((q: { sourceLessonId?: string | null }) => q.sourceLessonId === lesson.id),
        methods: methods.filter((m: { sourceLessonId?: string | null }) => m.sourceLessonId === lesson.id),
      },
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
  );
}

const patchSchema = z.object({
  action: z.enum(["extract", "update-meta", "set-status"]),
  title: z.string().optional(),
  teacherName: z.string().optional(),
  courseSeries: z.string().optional(),
  lessonNumber: z.string().optional(),
  adminNotes: z.string().optional(),
  cleanedTranscript: z.string().optional(),
  summary: z.string().optional(),
  rawTranscript: z.string().optional(),
  allowRawChange: z.boolean().optional(),
  changeReason: z.string().optional(),
  status: z.enum(["DRAFT", "ANALYZED", "REVIEWING", "APPROVED", "ARCHIVED"]).optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const lesson = await getLesson(id);
    if (!lesson) return NextResponse.json({ error: "不存在" }, { status: 404 });

    if (parsed.data.action === "extract") {
      const { extracted, qimenShadowExtraction } = await analyzeTeacherKnowledgeLesson(id, user?.email || null);
      return NextResponse.json({
        ok: true,
        extracted: {
          summary: extracted.summary,
          uncertain: extracted.uncertain,
          exceptions: extracted.exceptions,
          possibleConflicts: extracted.possibleConflicts,
          counts: {
            rules: extracted.rules.length,
            cases: extracted.cases.length,
            concepts: extracted.concepts.length,
            quotes: extracted.quotes.length,
            methods: extracted.methods.length,
          },
          qimenShadow: {
            modelStatus: qimenShadowExtraction.modelStatus,
            accepted: qimenShadowExtraction.accepted.length,
            rejected: qimenShadowExtraction.rejected.length,
          },
        },
      });
    }

    if (parsed.data.action === "set-status") {
      const updated = await updateLessonWithVersion(id, {
        status: parsed.data.status || lesson.status,
        changeReason: "状态变更",
        changedBy: user?.email || null,
      });
      return NextResponse.json({ lesson: updated });
    }

    const updated = await updateLessonWithVersion(
      id,
      {
        title: parsed.data.title,
        teacherName: parsed.data.teacherName,
        courseSeries: parsed.data.courseSeries,
        lessonNumber: parsed.data.lessonNumber,
        adminNotes: parsed.data.adminNotes,
        cleanedTranscript: parsed.data.cleanedTranscript,
        summary: parsed.data.summary,
        rawTranscript: parsed.data.rawTranscript,
        changeReason: parsed.data.changeReason || "管理员编辑",
        changedBy: user?.email || null,
      },
      { allowRawChange: Boolean(parsed.data.allowRawChange) }
    );
    return NextResponse.json({ lesson: updated });
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
  try {
    const { deleteLesson } = await import("@/lib/teacher-knowledge/store");
    await deleteLesson(id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "删除失败" },
      { status: 400 }
    );
  }
}
