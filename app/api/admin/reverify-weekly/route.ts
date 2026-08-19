import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { runWeeklyVerification } from "@/lib/verification/run-weekly";
import { WEEKLY_SCORE_VERSION } from "@/lib/verification/weekly-verification-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { force?: boolean };
    const report = await runWeeklyVerification(new Date(), { force: body.force === true });
    return NextResponse.json({
      ok: true,
      scoreVersion: WEEKLY_SCORE_VERSION,
      report,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "重新验证失败" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
