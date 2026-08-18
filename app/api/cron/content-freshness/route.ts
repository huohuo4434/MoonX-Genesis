import { NextResponse, type NextRequest } from "next/server";
import { runContentFreshnessSelfCheck } from "@/lib/automation/content-freshness";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const report = await runContentFreshnessSelfCheck({ repair: true });
  return NextResponse.json({ ok: report.status === "OK", report }, { status: report.status === "OK" ? 200 : 207, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) { return GET(request); }
