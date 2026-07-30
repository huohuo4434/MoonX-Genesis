import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { createLesson, listLessons } from "@/lib/master-intelligence/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const lessons = await listLessons();
  return NextResponse.json({ lessons }, { headers: { "Cache-Control": "no-store" } });
}

const createSchema = z.object({
  title: z.string().min(1),
  teacher: z.string().optional(),
  course: z.string().nullable().optional(),
  lessonNumber: z.number().int().nullable().optional(),
  source: z.enum(["MASTER", "INTERNAL"]).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const lesson = await createLesson({
    ...parsed.data,
    createdBy: admin.email ?? admin.id ?? null,
  });
  return NextResponse.json({ lesson }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
