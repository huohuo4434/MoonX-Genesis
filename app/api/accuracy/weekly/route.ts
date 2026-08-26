import { NextResponse } from "next/server";
import { getWeeklyAccuracyHistory } from "@/lib/accuracy/get-weekly-history";
import { projectPublicAttribution } from "@/lib/presentation/public-attribution";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Public verification endpoint: authorization is intentionally not required; output is presentation-projected.

export async function GET(request: Request) {
  const locale = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "zh";
  const { items, stats } = await getWeeklyAccuracyHistory();
  return NextResponse.json({
    ok: true,
    summary: {
      ...stats,
      // Backward-compatible field name for existing API consumers.
      weightedAccuracy: stats.weightedAccuracyPct,
    },
    data: projectPublicAttribution(items, { locale }),
  }, { headers: { "Cache-Control": "no-store" } });
}
