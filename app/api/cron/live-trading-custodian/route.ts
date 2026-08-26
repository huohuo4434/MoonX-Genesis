import { NextRequest, NextResponse } from "next/server";
import { runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Custody is an execution-safety path. Keep research data collection on its own
// schedule so a slow market-data provider can never delay position reconciliation.
export const maxDuration = 300;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const custody = await runUnifiedLiveCustodyCycle({ trigger: "CRON_CUSTODIAN", ownerKey: "official" });
  return NextResponse.json({ custody, newOrdersPlaced: 0, execution: "CUSTODY_ONLY" });
}
