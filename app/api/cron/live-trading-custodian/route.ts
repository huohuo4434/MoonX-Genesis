import { NextRequest, NextResponse } from "next/server";
import { runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";
import { buildStrategyEnsembleSnapshot } from "@/lib/trading-signals/strategy-ensemble";
import { persistStrategyEnsembleSnapshot } from "@/lib/trading-signals/strategy-ensemble-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Custody runs first. The research-only ensemble may still perform up to nine
// sequential 15-second market reads, so retain the same 300-second budget as
// the primary trading runner instead of allowing Vercel to cut off the response.
export const maxDuration = 300;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const custody = await runUnifiedLiveCustodyCycle({ trigger: "CRON_CUSTODIAN", ownerKey: "official" });
  const ensemble = await buildStrategyEnsembleSnapshot();
  const persisted = await persistStrategyEnsembleSnapshot(ensemble, "official");
  return NextResponse.json({ custody, ensemble, persisted, newOrdersPlaced: 0, execution: "ADMIN_CONFIRMATION_REQUIRED" });
}
