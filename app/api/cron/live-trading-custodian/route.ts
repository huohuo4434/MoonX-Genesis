import { NextRequest, NextResponse } from "next/server";
import { runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json(await runUnifiedLiveCustodyCycle({ trigger: "CRON_CUSTODIAN", ownerKey: "official" }));
}
