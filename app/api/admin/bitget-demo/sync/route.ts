import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getBitgetDemoAdminDashboard } from "@/lib/bitget/demo-runtime";
import { syncBitgetDemoOrders } from "@/lib/bitget/demo-connector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json({
      ok: true,
      result: await syncBitgetDemoOrders(),
      dashboard: await getBitgetDemoAdminDashboard(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "同步失败" },
      { status: 500 }
    );
  }
}
