import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { getTeacherNote, updateTeacherNote } from "@/lib/teacher-voice-learning/store";
import { processTeacherNote } from "@/lib/teacher-voice-learning/pipeline";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  const note = await getTeacherNote(id);
  if (!note) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ note }, { headers: { "Cache-Control": "no-store" } });
}

const patchSchema = z.object({
  rawText: z.string().optional(),
  action: z.enum(["process"]).optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.rawText != null) {
    await updateTeacherNote(id, {
      rawText: parsed.data.rawText,
      status: "TRANSCRIBED",
      progress: 55,
      errorMessage: null,
    });
  }

  if (parsed.data.action === "process" || parsed.data.rawText != null) {
    const result = await processTeacherNote(id);
    const note = await getTeacherNote(id);
    return NextResponse.json({ note, ...result }, { headers: { "Cache-Control": "no-store" } });
  }

  const note = await getTeacherNote(id);
  return NextResponse.json({ note }, { headers: { "Cache-Control": "no-store" } });
}
