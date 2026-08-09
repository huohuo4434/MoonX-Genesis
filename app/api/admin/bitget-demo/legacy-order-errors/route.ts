import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { auditLegacyBitgetOrderErrors } from "@/lib/bitget/legacy-order-reconciliation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const report = await auditLegacyBitgetOrderErrors(100);
    return NextResponse.json({ ok: true, report }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "旧版订单错误历史核对失败" }, { status: 500 });
  }
}
