import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getPredictionAutoTraderDashboard } from "@/lib/trading-signals/prediction-auto-trader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json(await getPredictionAutoTraderDashboard());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取失败" },
      { status: 500 }
    );
  }
}
