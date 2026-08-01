import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { runPredictionAutoTrader } from "@/lib/trading-signals/prediction-auto-trader";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json(await runPredictionAutoTrader());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "策略检查失败" },
      { status: 500 }
    );
  }
}
