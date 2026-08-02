import { NextResponse, type NextRequest } from "next/server";
import { runPredictionAutoTrader } from "@/lib/trading-signals/prediction-auto-trader";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";
import { runTradingSignalServerMonitor } from "@/lib/trading-signals/server-auto-monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const [strategyResult, signalResult] = await Promise.allSettled([
    runPredictionAutoTrader(now, { source: "CRON" }),
    runTradingSignalServerMonitor(),
  ]);

  const strategy =
    strategyResult.status === "fulfilled"
      ? strategyResult.value
      : { error: errorMessage(strategyResult.reason, "预测自动交易检查失败") };
  const generalSignalMonitor =
    signalResult.status === "fulfilled"
      ? signalResult.value
      : { error: errorMessage(signalResult.reason, "AI交易信号自动行情同步失败") };

  let memberDeskSync: { ok: true } | { ok: false; error: string };
  try {
    await syncMemberAiTradingDeskSnapshot(now);
    memberDeskSync = { ok: true };
  } catch (error) {
    memberDeskSync = {
      ok: false,
      error: errorMessage(error, "会员交易公开台同步失败"),
    };
  }

  // A single subsystem failure must not prevent the other server tasks from running.
  // Cron remains HTTP 200 so the next minute continues normally; details stay in logs.
  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    strategy,
    generalSignalMonitor,
    memberDeskSync,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
