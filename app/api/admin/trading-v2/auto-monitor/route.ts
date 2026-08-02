import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { runTradingSignalServerMonitor } from "@/lib/trading-signals/server-auto-monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const report = await runTradingSignalServerMonitor();
    return NextResponse.json({ ...report, intervalSeconds: 30 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "自动行情监控失败" },
      { status: 500 }
    );
  }
}
