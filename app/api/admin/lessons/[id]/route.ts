import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { getLesson, setRawTranscript, updateLesson } from "@/lib/master-intelligence/store";
import { processLessonToReview, markLessonPublished } from "@/lib/master-intelligence/pipeline";
import { buildCleanTranscript } from "@/lib/master-intelligence/transcript";
import { setCleanTranscript } from "@/lib/master-intelligence/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  const pack = await getLesson(id);
  if (!pack) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(pack, { headers: { "Cache-Control": "no-store" } });
}

const patchSchema = z.object({
  title: z.string().optional(),
  teacher: z.string().optional(),
  course: z.string().nullable().optional(),
  lessonNumber: z.number().int().nullable().optional(),
  rawTranscript: z.string().optional(),
  action: z.enum(["process", "publish"]).optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestStartedMs = Date.now();
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.rawTranscript != null) {
    try {
      await setRawTranscript(id, parsed.data.rawTranscript);
      const clean = buildCleanTranscript(parsed.data.rawTranscript);
      await setCleanTranscript(id, clean);
      await updateLesson(id, { status: "TRANSCRIBED", errorMessage: null });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "无法写入 Raw Transcript" },
        { status: 400 }
      );
    }
  }

  await updateLesson(id, {
    title: parsed.data.title,
    teacher: parsed.data.teacher,
    course: parsed.data.course,
    lessonNumber: parsed.data.lessonNumber,
  });

  if (parsed.data.action === "process") {
    await updateLesson(id, {
      automationAttemptCount: 0,
      automationNextRetryAt: null,
      automationLastError: null,
    });
    const result = await processLessonToReview(id, {
      deadlineMs: requestStartedMs + 55_000,
      maxSteps: 3,
    });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  }
  if (parsed.data.action === "publish") {
    await markLessonPublished(id);
    return NextResponse.json({ ok: true, status: "PUBLISHED" }, { headers: { "Cache-Control": "no-store" } });
  }

  const pack = await getLesson(id);
  return NextResponse.json(pack, { headers: { "Cache-Control": "no-store" } });
}
