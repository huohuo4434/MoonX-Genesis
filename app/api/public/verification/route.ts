import { NextResponse, type NextRequest } from "next/server";
import { getCachedPublicVerificationSnapshot } from "@/lib/accuracy/public-verification-snapshot";
import { publicStarAccuracyBreakdown, publicStarTrendAnalysis } from "@/lib/accuracy/public-history-filter";

function csvCell(value: unknown): string {
  const raw = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export const revalidate = 60;
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const snapshot = await getCachedPublicVerificationSnapshot();
  const payload = snapshot.daily;
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
    "X-MOOX-Verification-Cache": "60s",
  };

  if (format !== "csv") {
    return NextResponse.json({
      generatedAt: snapshot.generatedAt,
      methodology: {
        partialWeight: 0.5,
        unverifiableInDenominator: false,
        versionLocked: true,
        outcomeBasedDeletion: false,
      },
      ...payload,
      weekly: snapshot.weekly,
      pending: snapshot.pending,
      starBreakdown: publicStarAccuracyBreakdown(payload.items),
      starTrend: publicStarTrendAnalysis(payload.items),
    }, { headers: cacheHeaders });
  }

  const columns = ["forecastId","forecastDate","assetName","symbol","predictedDirection","predictedPattern","actualDirection","actualPattern","verdict","verdictLabel","actualReturnPct","consensusStars","verifiedAt","version","dataSource"] as const;
  const lines = [
    columns.map(csvCell).join(","),
    ...payload.items.map((item) => columns.map((key) => csvCell(item[key])).join(",")),
  ];
  return new NextResponse(`\uFEFF${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="moox-public-verification.csv"',
      ...cacheHeaders,
    },
  });
}
