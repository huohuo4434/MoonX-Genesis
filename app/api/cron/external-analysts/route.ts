// MOOX_EXTERNAL_ANALYST_V1
import { NextResponse, type NextRequest } from "next/server";
import { refreshExternalAnalystSignals } from "@/lib/trading-signals/external-analyst-signals";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const force = request.nextUrl.searchParams.get("force") === "1";
  try {
    const report = await refreshExternalAnalystSignals(new Date(), { force });
    return NextResponse.json({ ok: report.errors.length === 0, report });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "External analyst refresh failed",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
