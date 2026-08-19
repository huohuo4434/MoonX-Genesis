import "server-only";

import { prisma } from "@/lib/prisma";
import { WEEKLY_SCORE_VERSION, explainWeeklyVerification, scoreWeeklyVerification, weeklyDirectionMatches } from "@/lib/verification/weekly-verification-core";

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
};

export type WeeklyAccuracyPublicStats = {
  sampleSize: number;
  full: number;
  partial: number;
  miss: number;
  unverifiable: number;
  pending: number;
  weightedAccuracyPct: number | null;
  directionAccuracyPct: number | null;
};

const EMPTY_STATS: WeeklyAccuracyPublicStats = {
  sampleSize: 0,
  full: 0,
  partial: 0,
  miss: 0,
  unverifiable: 0,
  pending: 0,
  weightedAccuracyPct: null,
  directionAccuracyPct: null,
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
    const miss = eligible.filter((r) => r.result === "MISS").length;
    const directionHits = eligible.filter((r) => r.actualPattern && weeklyDirectionMatches(r.predictedPattern, r.actualPattern)).length;

    return {
      items: rows.map((r) => ({
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
      })),
      stats: {
        sampleSize: eligible.length,
        full,
        partial,
        miss,
        unverifiable: rows.filter((r) => r.result === "UNVERIFIABLE").length,
        pending: rows.filter((r) => r.result === "PENDING").length,
        weightedAccuracyPct: eligible.length
          ? Math.round(((full + partial * 0.5) / eligible.length) * 1000) / 10
          : null,
        directionAccuracyPct: eligible.length
          ? Math.round((directionHits / eligible.length) * 1000) / 10
          : null,
      },
    };
  } catch (error) {
    console.warn("[weekly-accuracy] unavailable", error);
    return { items: [], stats: EMPTY_STATS };
  }
}
