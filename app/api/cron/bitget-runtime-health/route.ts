import { NextRequest, NextResponse } from "next/server";
import { refreshBitgetRuntimeHealthOnly } from "@/lib/bitget/demo-runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const state = await refreshBitgetRuntimeHealthOnly(new Date(), "CRON");
    return NextResponse.json({
      ok: true,
      readOnly: true,
      paused: state.paused,
      pauseSource: state.pauseSource,
      heartbeatAgeSeconds: state.heartbeatAgeSeconds,
      quoteAgeSeconds: state.quoteAgeSeconds,
      freshQuotesCount: state.freshQuotesCount,
      totalSymbols: state.totalSymbols,
      accountConnected: state.account.connected,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Bitget只读健康刷新失败" },
      { status: 500 }
    );
  }
}
