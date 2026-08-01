import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getTradingV2Snapshot } from "@/lib/trading-signals/v2-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json(await getTradingV2Snapshot());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取失败" },
      { status: 500 }
    );
  }
}
