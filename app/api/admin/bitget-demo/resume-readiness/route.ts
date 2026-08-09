import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { auditBitgetLiveResumeReadiness } from "@/lib/bitget/live-resume-readiness";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const report = await auditBitgetLiveResumeReadiness();
    return NextResponse.json({ ok: true, report }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "恢复前只读安全核对失败" }, { status: 500 });
  }
}
