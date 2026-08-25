import { NextResponse, type NextRequest } from "next/server";
import { runTradingReliabilityWatchdog } from "@/lib/trading-signals/trading-reliability";
import { runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function legacyTradingWatchdogGET(request: NextRequest) {
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

// MOOX_UNIFIED_LIVE_CUSTODY_WATCHDOG_V72031:GET
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await runUnifiedLiveCustodyCycle({
    trigger: "TRADING_WATCHDOG:GET",
    ownerKey: "official",
  });
  return legacyTradingWatchdogGET(request);
}

// MOOX_UNIFIED_LIVE_CUSTODY_WATCHDOG_V72031:POST
export async function POST(request: NextRequest) {
  return GET(request);
}
