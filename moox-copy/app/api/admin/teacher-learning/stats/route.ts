import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getKnowledgeGrowthStats,
  listLearningLogs,
} from "@/lib/teacher-learning-center/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const [logs, stats] = await Promise.all([listLearningLogs(), getKnowledgeGrowthStats()]);
  return NextResponse.json({ logs, stats }, { headers: { "Cache-Control": "no-store" } });
}
