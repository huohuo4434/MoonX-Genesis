import { NextResponse, type NextRequest } from "next/server";
import { runTradingReliabilityWatchdog } from "@/lib/trading-signals/trading-reliability";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await runTradingReliabilityWatchdog({ source: "CRON" });
    // 可靠性异常写入审计并切换安全模式，但HTTP保持200，确保下一轮Cron仍能恢复检查。
    return NextResponse.json({ ok: report.ok, report });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Phase 4看门狗运行失败",
    });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
