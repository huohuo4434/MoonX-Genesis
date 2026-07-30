import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { searchTeacherNotes } from "@/lib/teacher-voice-learning/search";
import {
  getTeacherLearningAccuracy,
  recordTeacherLearningFeedback,
} from "@/lib/teacher-voice-learning/feedback";
import { listLearningFeedback } from "@/lib/teacher-voice-learning/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q");
  if (q) {
    const hits = await searchTeacherNotes(q, 10);
    return NextResponse.json({ hits }, { headers: { "Cache-Control": "no-store" } });
  }
  const [feedback, accuracy] = await Promise.all([listLearningFeedback(), getTeacherLearningAccuracy()]);
  return NextResponse.json({ feedback, accuracy }, { headers: { "Cache-Control": "no-store" } });
}

const feedbackSchema = z.object({
  teacherNoteId: z.string().nullable().optional(),
  assetId: z.string().nullable().optional(),
  query: z.string().nullable().optional(),
  prediction: z.string().min(1),
  actual: z.string().min(1),
  correct: z.boolean(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const result = await recordTeacherLearningFeedback(parsed.data);
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
