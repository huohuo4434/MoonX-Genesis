import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { searchTeacherKnowledgeAdmin } from "@/lib/teacher-knowledge/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const result = await searchTeacherKnowledgeAdmin({
    q: sp.get("q") || "",
    status: sp.get("status") || undefined,
    asset: sp.get("asset") || undefined,
    timeframe: sp.get("timeframe") || undefined,
    category: sp.get("category") || undefined,
    teacherName: sp.get("teacher") || undefined,
    lessonId: sp.get("lessonId") || undefined,
    approvedOnly: sp.get("approvedOnly") === "1",
  });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
