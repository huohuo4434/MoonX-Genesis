import { NextRequest, NextResponse } from "next/server";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const snapshot = await syncMemberAiTradingDeskSnapshot(new Date());
    return NextResponse.json({
      ok: true,
      mode: snapshot.mode,
      lastSyncedAt: snapshot.lastSyncedAt ?? snapshot.generatedAt,
      syncStatus: snapshot.syncStatus,
      positionsCount: snapshot.positions.length,
      plansCount: snapshot.plans.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "会员交易台快照同步失败" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
