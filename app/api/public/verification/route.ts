import { NextResponse, type NextRequest } from "next/server";
import { getCachedPublicVerificationSnapshot } from "@/lib/accuracy/public-verification-snapshot";

function csvCell(value: unknown): string {
  const raw = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const snapshot = await getCachedPublicVerificationSnapshot();
  const { daily, weekly, pending, generatedAt } = snapshot;
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  if (format !== "csv") {
    return NextResponse.json(
      {
        generatedAt,
        methodology: {
          partialWeight: 0.5,
          unverifiableInDenominator: false,
          versionLocked: true,
          missesRetained: true,
          dailyAndWeeklySeparated: true,
        },
        // Backward-compatible daily fields.
        ...daily,
        weekly,
        pending,
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
