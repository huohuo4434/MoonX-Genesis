import "server-only";

import { prisma } from "@/lib/prisma";
import { listCanonicalPublishedWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { WEEKLY_SCORE_VERSION, explainWeeklyVerification, scoreWeeklyVerification, weeklyDirectionMatches } from "@/lib/verification/weekly-verification-core";
import { selectCanonicalWeeklyVerificationRows } from "@/lib/accuracy/weekly-history-canonical";
import {
  buildWeeklyConfidenceCalibration,
  weeklyConfidenceBand,
  type WeeklyConfidenceBand,
  type WeeklyConfidenceCalibration,
} from "@/lib/accuracy/weekly-confidence-calibration";

export type WeeklyAccuracyPublicItem = {
  id: string;
  assetId: string;
  symbol: string;
  weekStart: string;
  weekEnd: string;
  predictedPattern: string;
  actualPattern: string | null;
  result: string;
  directionScore: number | null;
  pathScore: number | null;
  totalScore: number | null;
  explanation: string | null;
  verifiedAt: string | null;
  /** Confidence frozen on the exact pre-window weekly authority. */
  confidence: number | null;
  confidenceBand: WeeklyConfidenceBand;
};

export type WeeklyAccuracyPublicStats = {
  sampleSize: number;
  full: number;
  partial: number;
  miss: number;
  unverifiable: number;
  pending: number;
  exactAccuracyPct: number | null;
  weightedAccuracyPct: number | null;
  directionAccuracyPct: number | null;
  confidenceCalibration: WeeklyConfidenceCalibration;
};

const EMPTY_CONFIDENCE_CALIBRATION = buildWeeklyConfidenceCalibration([]);

const EMPTY_STATS: WeeklyAccuracyPublicStats = {
  sampleSize: 0,
  full: 0,
  partial: 0,
  miss: 0,
  unverifiable: 0,
  pending: 0,
  exactAccuracyPct: null,
  weightedAccuracyPct: null,
  directionAccuracyPct: null,
  confidenceCalibration: EMPTY_CONFIDENCE_CALIBRATION,
};

export async function getWeeklyAccuracyHistory(): Promise<{
  items: WeeklyAccuracyPublicItem[];
  stats: WeeklyAccuracyPublicStats;
}> {
  if (!prisma) return { items: [], stats: EMPTY_STATS };

  try {
    const storedRows = await prisma.weeklyVerificationRecord.findMany({
      orderBy: [{ weekEnd: "desc" }, { symbol: "asc" }],
      take: 200,
    });
    // V3 display normalization: old database rows are never allowed to keep showing stale
    // 0/65/90 outcomes after the scoring policy changes. The background/admin reverify
    // still writes V3 back to the database; this makes the public page correct immediately.
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
    const miss = eligible.filter((r) => r.result === "MISS").length;
    const directionHits = eligible.filter((r) => r.actualPattern && weeklyDirectionMatches(r.predictedPattern, r.actualPattern)).length;
    const items = rows.map((r): WeeklyAccuracyPublicItem => {
      const confidence = authorityById.get(r.weeklyAnalysisId)?.confidence ?? null;
      return {
        id: r.id,
        assetId: r.assetId,
        symbol: r.symbol,
        weekStart: r.weekStart,
        weekEnd: r.weekEnd,
        predictedPattern: r.predictedPattern,
        actualPattern: r.actualPattern,
        result: r.result,
        directionScore: r.directionScore,
        pathScore: r.pathScore,
        totalScore: r.totalScore,
        explanation: r.explanation,
        verifiedAt: r.verifiedAt?.toISOString() ?? null,
        confidence,
        confidenceBand: weeklyConfidenceBand(confidence),
      };
    });
    const confidenceCalibration = buildWeeklyConfidenceCalibration(items.map((item) => ({
      result: item.result,
      confidence: item.confidence,
      directionMatched: Boolean(item.actualPattern && weeklyDirectionMatches(item.predictedPattern, item.actualPattern)),
    })));

    return {
      items,
      stats: {
        sampleSize: eligible.length,
        full,
        partial,
        miss,
        unverifiable: rows.filter((r) => r.result === "UNVERIFIABLE").length,
        pending: rows.filter((r) => r.result === "PENDING").length,
        exactAccuracyPct: eligible.length ? Math.round((full / eligible.length) * 1000) / 10 : null,
        weightedAccuracyPct: eligible.length
          ? Math.round(((full + partial * 0.5) / eligible.length) * 1000) / 10
          : null,
        directionAccuracyPct: eligible.length
          ? Math.round((directionHits / eligible.length) * 1000) / 10
          : null,
        confidenceCalibration,
      },
    };
  } catch (error) {
    console.warn("[weekly-accuracy] unavailable", error);
    return { items: [], stats: EMPTY_STATS };
  }
}
