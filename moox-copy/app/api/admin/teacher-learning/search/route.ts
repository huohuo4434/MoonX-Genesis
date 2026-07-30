import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { searchTeacherKnowledge } from "@/lib/teacher-learning-center/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q") || "";
  const result = await searchTeacherKnowledge(q);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
