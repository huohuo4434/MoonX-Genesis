// MOOX_V72051_X_FRESHNESS_HOOK
import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreEarlyAltcoinRadar } from "@/lib/trading-signals/early-altcoin-radar";
import { generateAndStoreXScanReport } from "@/lib/trading-signals/x-scan-report";
import { runContentFreshnessSelfCheck } from "@/lib/automation/content-freshness";

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
  const freshness = await runContentFreshnessSelfCheck({ repair: true, now: new Date() }).catch(() => null);
  return NextResponse.json({
    ok: true,
    market: marketOk ? { generatedAt: market.value.generatedAt, assets: market.value.assets.length, buyCandidates: market.value.buyCandidateCount } : { error: String(market.reason) },
    earlyAltcoin: altcoinOk ? { generatedAt: altcoin.value.generatedAt, candidates: altcoin.value.candidateCount, earlyCandidates: altcoin.value.earlyCandidateCount } : { error: String(altcoin.reason) },
    freshness: freshness ? { status: freshness.status, generatedAt: freshness.generatedAt } : null,
  });
}
