import { NextRequest, NextResponse } from "next/server";
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
  try {
    const report = await generateAndStoreXScanReport();
    return NextResponse.json({ ok: true, generatedAt: report.generatedAt, symbols: report.assets.length, buyCandidates: report.buyCandidateCount });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "X_REPORT_FAILED" }, { status: 500 });
  }
}
