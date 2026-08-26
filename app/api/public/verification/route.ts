import { NextResponse, type NextRequest } from "next/server";
import { getCachedPublicVerificationSnapshot } from "@/lib/accuracy/public-verification-snapshot";
import { getVerificationPipelineStatus } from "@/lib/accuracy/verification-pipeline-status";
import {
  ACCURACY_GOVERNANCE_VERSION,
  ASSET_RANK_MIN_SAMPLE_SIZE,
  DAILY_STABLE_SAMPLE_SIZE,
  PARTIAL_HIT_WEIGHT,
  STAR_BUCKET_MIN_SAMPLE_SIZE,
  WEEKLY_STABLE_SAMPLE_SIZE,
} from "@/lib/accuracy/accuracy-governance-core";

function csvCell(value: unknown): string {
  const raw = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const [snapshot, pipeline] = await Promise.all([
    getCachedPublicVerificationSnapshot(),
    getVerificationPipelineStatus(),
  ]);
  const { daily, weekly, pending, generatedAt } = snapshot;
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  if (format !== "csv") {
    return NextResponse.json(
      {
        generatedAt,
        methodology: {
          governanceVersion: ACCURACY_GOVERNANCE_VERSION,
          partialWeight: PARTIAL_HIT_WEIGHT,
          unverifiableInDenominator: false,
          versionLocked: true,
          missesRetained: true,
          dailyAndWeeklySeparated: true,
          directionAndPathScoredSeparately: true,
          thresholds: {
            dailyStable: DAILY_STABLE_SAMPLE_SIZE,
            weeklyStable: WEEKLY_STABLE_SAMPLE_SIZE,
            assetRanking: ASSET_RANK_MIN_SAMPLE_SIZE,
            starBucket: STAR_BUCKET_MIN_SAMPLE_SIZE,
          },
        },
        // Backward-compatible daily fields.
        ...daily,
        weekly,
        pending,
        pipeline,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // CSV remains backward compatible with the existing daily export contract.
  const columns = [
    "forecastId",
    "forecastDate",
    "assetName",
    "symbol",
    "predictedDirection",
    "predictedPattern",
    "actualDirection",
    "actualPattern",
    "verdict",
    "directionVerdict",
    "verdictLabel",
    "actualReturnPct",
    "verifiedAt",
    "version",
    "dataSource",
  ] as const;
  const lines = [
    columns.map(csvCell).join(","),
    ...daily.items.map((item) => columns.map((key) => csvCell(item[key])).join(",")),
  ];
  return new NextResponse(`\uFEFF${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="moox-public-verification.csv"',
      "Cache-Control": "no-store",
    },
  });
}
