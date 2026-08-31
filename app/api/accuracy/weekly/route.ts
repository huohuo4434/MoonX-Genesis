import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectPublicAttribution } from "@/lib/presentation/public-attribution";
import { listCanonicalPublishedWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { selectCanonicalWeeklyVerificationRows } from "@/lib/accuracy/weekly-history-canonical";
import { WEEKLY_SCORE_VERSION, explainWeeklyVerification, scoreWeeklyVerification } from "@/lib/verification/weekly-verification-core";
import { weeklyDirectionMatches } from "@/lib/verification/weekly-verification-core";
import { buildWeeklyConfidenceCalibration, weeklyConfidenceBand } from "@/lib/accuracy/weekly-confidence-calibration";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Public verification endpoint: authorization is intentionally not required; output is presentation-projected.

export async function GET(request: Request) {
  const locale = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "zh";
  if (!prisma) {
    const confidenceCalibration = buildWeeklyConfidenceCalibration([]);
    return NextResponse.json(
      { ok: true, summary: { sampleSize: 0, full: 0, partial: 0, miss: 0, exactAccuracyPct: null, weightedAccuracy: null, directionAccuracyPct: null, confidenceCalibration }, data: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  const storedRows = await prisma.weeklyVerificationRecord.findMany({ orderBy: [{ weekEnd: "desc" }, { symbol: "asc" }] });
  const authorities = listCanonicalPublishedWeeklyAnalyses();
  const authorityById = new Map(authorities.map((analysis) => [analysis.id, analysis] as const));
  const rows = selectCanonicalWeeklyVerificationRows(
    storedRows,
    authorities,
  ).map((row) => {
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
  const directionHits = eligible.filter((r) => r.actualPattern && weeklyDirectionMatches(r.predictedPattern, r.actualPattern)).length;
  const weightedAccuracy = eligible.length ? Math.round(((full + partial * 0.5) / eligible.length) * 1000) / 10 : null;
  const data = rows.map((row) => {
    const confidence = authorityById.get(row.weeklyAnalysisId)?.confidence ?? null;
    return { ...row, confidence, confidenceBand: weeklyConfidenceBand(confidence) };
  });
  const confidenceCalibration = buildWeeklyConfidenceCalibration(data.map((row) => ({
    result: row.result,
    confidence: row.confidence,
    directionMatched: Boolean(row.actualPattern && weeklyDirectionMatches(row.predictedPattern, row.actualPattern)),
  })));
  return NextResponse.json({
    ok: true,
    summary: {
      sampleSize: eligible.length,
      full,
      partial,
      miss: eligible.length - full - partial,
      exactAccuracyPct: eligible.length ? Math.round(full / eligible.length * 1000) / 10 : null,
      weightedAccuracy,
      directionAccuracyPct: eligible.length ? Math.round(directionHits / eligible.length * 1000) / 10 : null,
      confidenceCalibration,
    },
    data: projectPublicAttribution(data, { locale }),
  }, { headers: { "Cache-Control": "no-store" } });
}
