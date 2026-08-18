// MOOX_V72051_DAILY_SELF_CHECK
import { NextResponse, type NextRequest } from "next/server";
import { runDailyForecastPipeline, resolvePipelinePhase } from "@/lib/forecasts/daily-pipeline";
import { runContentFreshnessSelfCheck } from "@/lib/automation/content-freshness";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.VERCEL !== "1";
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const force = request.nextUrl.searchParams.get("phase");
    const date = request.nextUrl.searchParams.get("date") ?? undefined;
    const forcePhase =
      force === "draft" || force === "revise" || force === "lock" || force === "idle"
        ? force
        : undefined;
    const report = await runDailyForecastPipeline({
      forcePhase: forcePhase ?? resolvePipelinePhase(),
      forceDraftDate: date,
    });
    const freshness = await runContentFreshnessSelfCheck({ repair: true, now: new Date() }).catch((error) => ({
      status: "ATTENTION" as const,
      generatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }));
    return NextResponse.json({ ok: true, report, freshness });
  } catch (err) {
    console.error("[cron/generate-daily-forecasts]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
