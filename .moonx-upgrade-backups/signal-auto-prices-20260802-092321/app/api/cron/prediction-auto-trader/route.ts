import { NextResponse, type NextRequest } from "next/server";
import { runPredictionAutoTrader } from "@/lib/trading-signals/prediction-auto-trader";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

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
  const now = new Date();
  try {
    const report = await runPredictionAutoTrader(now, { source: "CRON" });
    let memberDeskSync = "OK";
    try {
      await syncMemberAiTradingDeskSnapshot(now);
    } catch (error) {
      memberDeskSync = error instanceof Error ? error.message : "同步失败";
    }
    return NextResponse.json({ ...report, memberDeskSync });
  } catch (error) {
    try {
      await syncMemberAiTradingDeskSnapshot(now);
    } catch {
      // 策略异常时仍尽量保留最近一次会员公开快照。
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "strategy failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
