import { NextResponse, type NextRequest } from "next/server";
import { runBitgetDemoServerRuntime } from "@/lib/bitget/demo-runtime";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";
import { refreshExternalAnalystSignals } from "@/lib/trading-signals/external-analyst-signals";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  let externalAnalysts: Awaited<ReturnType<typeof refreshExternalAnalystSignals>> | { error: string };
  try {
    externalAnalysts = await refreshExternalAnalystSignals(now);
  } catch (error) {
    externalAnalysts = {
      error: errorMessage(error, "外部分析师监测失败"),
    };
  }
  let runtime: Awaited<ReturnType<typeof runBitgetDemoServerRuntime>> | { error: string };
  try {
    runtime = await runBitgetDemoServerRuntime(now, "CRON");
  } catch (error) {
    runtime = { error: errorMessage(error, "Bitget Demo服务器执行链路失败") };
  }

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

  // Cron must remain retryable. Subsystem failures are returned in the JSON audit payload,
  // while the next minute still gets a chance to recover automatically.
  return NextResponse.json({
    ok: !("error" in runtime),
    checkedAt: now.toISOString(),
    runtime,
    memberDeskSync,
    externalAnalysts,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
