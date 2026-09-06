import { NextResponse } from "next/server";
import { refreshAllDailyProjections } from "@/lib/research/daily-candle-projection.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await refreshAllDailyProjections();
    console.info("DAILY_CANDLE_PROJECTIONS", JSON.stringify(result));
    return NextResponse.json(result, { status: result.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "DAILY_PROJECTION_REFRESH_FAILED" }, { status: 503 });
  }
}
