import { NextResponse, type NextRequest } from "next/server";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";

function csvCell(value: unknown): string { const raw=value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value); return `"${raw.replace(/"/g, '""')}"`; }
export async function GET(request: NextRequest) {
  const payload = await getPublicAccuracyHistory();
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  if (format !== "csv") return NextResponse.json({ generatedAt: new Date().toISOString(), methodology: { partialWeight: 0.5, unverifiableInDenominator: false, versionLocked: true }, ...payload }, { headers: { "Cache-Control": "no-store" } });
  const columns = ["forecastId","forecastDate","assetName","symbol","predictedDirection","predictedPattern","actualDirection","actualPattern","verdict","verdictLabel","actualReturnPct","verifiedAt","version","dataSource"] as const;
  const lines = [columns.map(csvCell).join(","), ...payload.items.map((item) => columns.map((key) => csvCell(item[key])).join(","))];
  return new NextResponse(`\uFEFF${lines.join("\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="moox-public-verification.csv"', "Cache-Control": "no-store" } });
}
