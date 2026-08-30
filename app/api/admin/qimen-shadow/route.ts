import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/permissions";
import { qimenShadowAdminRequestSchema } from "@/lib/research/qimen-shadow-capture-core";
import {
  evaluateQimenShadowObservation,
  getQimenShadowDashboard,
  lockQimenShadowObservation,
  registerQimenShadowCandidate,
  QimenShadowConflictError,
  QimenShadowValidationError,
} from "@/lib/research/qimen-shadow-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    return NextResponse.json(
      { ok: true, dashboard: await getQimenShadowDashboard() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取影子研究失败" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const parsed = qimenShadowAdminRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不完整", detail: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const result = parsed.data.action === "REGISTER_CANDIDATE"
      ? await registerQimenShadowCandidate(parsed.data.candidate, admin.id)
      : parsed.data.action === "LOCK_OBSERVATION"
        ? await lockQimenShadowObservation(parsed.data.observation, admin.id)
        : await evaluateQimenShadowObservation(parsed.data.evaluation, admin.id);
    const id = "candidate" in result
      ? result.candidate.id
      : "observation" in result
        ? result.observation.id
        : result.experiment.id;
    return NextResponse.json(
      { ok: true, action: parsed.data.action, created: result.created, id },
      { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const conflict = error instanceof QimenShadowConflictError;
    const validation = error instanceof QimenShadowValidationError;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存影子研究失败" },
      { status: conflict ? 409 : validation ? 422 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
