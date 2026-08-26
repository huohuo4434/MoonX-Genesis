import { NextRequest, NextResponse } from "next/server";
import { buildStrategyEnsembleSnapshot } from "@/lib/trading-signals/strategy-ensemble";
import { persistStrategyEnsembleSnapshot } from "@/lib/trading-signals/strategy-ensemble-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`
    || request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const ensemble = await buildStrategyEnsembleSnapshot();
  const persisted = await persistStrategyEnsembleSnapshot(ensemble, "official");
  return NextResponse.json({ ensemble, persisted, newOrdersPlaced: 0, execution: "RESEARCH_ONLY" });
}
