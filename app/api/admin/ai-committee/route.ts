import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { committeeRequestSchema } from "@/lib/ai-committee/schemas";
import { previewCommittee, runCommittee } from "@/lib/ai-committee/run";
import { listCommitteeRuns } from "@/lib/ai-committee/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const runs = await listCommitteeRuns(20);
  return NextResponse.json(
    { ok: true, runs },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const parsed = committeeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数不完整", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result =
      parsed.data.action === "preview"
        ? await previewCommittee(parsed.data.input)
        : await runCommittee(parsed.data.input);
    return NextResponse.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "委员会运行失败" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
