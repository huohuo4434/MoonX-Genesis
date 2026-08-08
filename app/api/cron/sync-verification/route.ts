import { NextResponse, type NextRequest } from "next/server";
import { syncGeneratedDailyForecastsToVerificationStore } from "@/lib/verification/sync-generated-dailies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await syncGeneratedDailyForecastsToVerificationStore({ now: new Date() });
    if (report.errors.length > 0) {
      return NextResponse.json({ ok: false, report }, { status: 503 });
    }
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "verification sync failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
