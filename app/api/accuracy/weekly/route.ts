import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectPublicAttribution } from "@/lib/presentation/public-attribution";
import { WEEKLY_SCORE_VERSION, explainWeeklyVerification, scoreWeeklyVerification } from "@/lib/verification/weekly-verification-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Public verification endpoint: authorization is intentionally not required; output is presentation-projected.

export async function GET(request: Request) {
  const locale = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "zh";
  if (!prisma) {
    return NextResponse.json(
      { ok: true, summary: { sampleSize: 0, full: 0, partial: 0, miss: 0, weightedAccuracy: null }, data: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  const storedRows = await prisma.weeklyVerificationRecord.findMany({ orderBy: [{ weekEnd: "desc" }, { symbol: "asc" }] });
  const rows = storedRows.map((row) => {
    if (!row.actualPattern || row.result === "PENDING") return row;
    const scored = scoreWeeklyVerification(row.predictedPattern, row.actualPattern);
    const isCurrent = row.explanation?.includes(WEEKLY_SCORE_VERSION) ?? false;
    return {
      ...row,
      ...scored,
      explanation: isCurrent
        ? row.explanation
        : `[${WEEKLY_SCORE_VERSION}] ${explainWeeklyVerification(row.predictedPattern, row.actualPattern, scored)}`,
    };
  });
  const eligible = rows.filter((r) => !["PENDING", "UNVERIFIABLE"].includes(r.result));
  const full = eligible.filter((r) => r.result === "FULL_HIT").length;
  const partial = eligible.filter((r) => r.result === "PARTIAL_HIT").length;
  const weightedAccuracy = eligible.length ? Math.round(((full + partial * 0.5) / eligible.length) * 1000) / 10 : null;
  return NextResponse.json({
    ok: true,
    summary: { sampleSize: eligible.length, full, partial, miss: eligible.length - full - partial, weightedAccuracy },
    data: projectPublicAttribution(rows, { locale }),
  }, { headers: { "Cache-Control": "no-store" } });
}
