import { NextRequest, NextResponse } from "next/server";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Independent snapshot publisher: never run a trading cycle to refresh a member page.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (getBitgetDemoEnvironment().mode !== "LIVE_EXPERIMENT") {
    return NextResponse.json({ ok: true, skipped: "LIVE_SNAPSHOT_ONLY" });
  }
  try {
    const snapshot = await syncMemberAiTradingDeskSnapshot();
    return NextResponse.json({ ok: true, snapshotOnly: true, lastSyncedAt: snapshot.lastSyncedAt });
  } catch {
    return NextResponse.json({ ok: false, error: "Member snapshot synchronization failed" }, { status: 503 });
  }
}
