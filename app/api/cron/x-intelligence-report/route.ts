import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreEarlyAltcoinRadar } from "@/lib/trading-signals/early-altcoin-radar";
import { generateAndStoreXScanReport } from "@/lib/trading-signals/x-scan-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const [market, altcoin] = await Promise.allSettled([
    generateAndStoreXScanReport(),
    generateAndStoreEarlyAltcoinRadar(),
  ]);
  const marketOk = market.status === "fulfilled";
  const altcoinOk = altcoin.status === "fulfilled";
  if (!marketOk && !altcoinOk) {
    return NextResponse.json({
      ok: false,
      error: "X_REPORTS_FAILED",
      marketError: market.status === "rejected" ? String(market.reason) : null,
      altcoinError: altcoin.status === "rejected" ? String(altcoin.reason) : null,
    }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    market: marketOk ? { generatedAt: market.value.generatedAt, assets: market.value.assets.length, buyCandidates: market.value.buyCandidateCount } : { error: String(market.reason) },
    earlyAltcoin: altcoinOk ? { generatedAt: altcoin.value.generatedAt, candidates: altcoin.value.candidateCount, earlyCandidates: altcoin.value.earlyCandidateCount } : { error: String(altcoin.reason) },
  });
}
