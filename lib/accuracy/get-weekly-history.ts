import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ACCURACY_GOVERNANCE_VERSION,
  WEEKLY_STABLE_SAMPLE_SIZE,
  accuracySampleMaturity,
  weightedAccuracy,
} from "@/lib/accuracy/accuracy-governance-core";
import { WEEKLY_SCORE_VERSION, weeklyDirectionMatches } from "@/lib/verification/weekly-verification-core";

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
  scoreVersion: string;
  dataSource: string | null;
  explanation: string | null;
  verifiedAt: string | null;
};

export type WeeklyAccuracyPublicStats = {
  governanceVersion: string;
  scoreVersion: string;
  sampleSize: number;
  sampleReady: boolean;
  sampleState: "BUILDING" | "STABLE";
  stableAt: number;
  remaining: number;
  full: number;
  partial: number;
  miss: number;
  unverifiable: number;
  pending: number;
  excludedOtherScoreVersions: number;
  weightedAccuracyPct: number | null;
  directionAccuracyPct: number | null;
};

const EMPTY_STATS: WeeklyAccuracyPublicStats = {
  governanceVersion: ACCURACY_GOVERNANCE_VERSION,
  scoreVersion: WEEKLY_SCORE_VERSION,
  sampleSize: 0,
  sampleReady: false,
  sampleState: "BUILDING",
  stableAt: WEEKLY_STABLE_SAMPLE_SIZE,
  remaining: WEEKLY_STABLE_SAMPLE_SIZE,
  full: 0,
  partial: 0,
  miss: 0,
  unverifiable: 0,
  pending: 0,
  excludedOtherScoreVersions: 0,
  weightedAccuracyPct: null,
  directionAccuracyPct: null,
};

export async function getWeeklyAccuracyHistory(): Promise<{
  items: WeeklyAccuracyPublicItem[];
  stats: WeeklyAccuracyPublicStats;
}> {
  if (!prisma) return { items: [], stats: EMPTY_STATS };

  try {
    const [rows, currentVersionRows, excludedOtherScoreVersions] = await Promise.all([
      prisma.weeklyVerificationRecord.findMany({
        orderBy: [{ weekEnd: "desc" }, { symbol: "asc" }],
        take: 200,
      }),
      prisma.weeklyVerificationRecord.findMany({
        where: { scoreVersion: WEEKLY_SCORE_VERSION },
        select: { result: true, predictedPattern: true, actualPattern: true },
      }),
      prisma.weeklyVerificationRecord.count({
        where: { scoreVersion: { not: WEEKLY_SCORE_VERSION } },
      }),
    ]);
    const eligible = currentVersionRows.filter((row) => !["PENDING", "UNVERIFIABLE"].includes(row.result));
    const full = eligible.filter((row) => row.result === "FULL_HIT").length;
    const partial = eligible.filter((row) => row.result === "PARTIAL_HIT").length;
    const miss = eligible.filter((row) => row.result === "MISS").length;
    const weighted = weightedAccuracy({ full, partial, miss });
    const directionHits = eligible.filter(
      (row) => row.actualPattern && weeklyDirectionMatches(row.predictedPattern, row.actualPattern)
    ).length;
    const maturity = accuracySampleMaturity(eligible.length, WEEKLY_STABLE_SAMPLE_SIZE);

    return {
      // Every stored result remains visible. Only the current score version enters
      // the headline rate, so policy changes cannot silently blend denominators.
      items: rows.map((row) => ({
        id: row.id,
        assetId: row.assetId,
        symbol: row.symbol,
        weekStart: row.weekStart,
        weekEnd: row.weekEnd,
        predictedPattern: row.predictedPattern,
        actualPattern: row.actualPattern,
        result: row.result,
        directionScore: row.directionScore,
        pathScore: row.pathScore,
        totalScore: row.totalScore,
        scoreVersion: row.scoreVersion,
        dataSource: row.dataSource,
        explanation: row.explanation,
        verifiedAt: row.verifiedAt?.toISOString() ?? null,
      })),
      stats: {
        governanceVersion: ACCURACY_GOVERNANCE_VERSION,
        scoreVersion: WEEKLY_SCORE_VERSION,
        sampleSize: eligible.length,
        sampleReady: maturity.state === "STABLE",
        sampleState: maturity.state,
        stableAt: maturity.stableAt,
        remaining: maturity.remaining,
        full,
        partial,
        miss,
        unverifiable: currentVersionRows.filter((row) => row.result === "UNVERIFIABLE").length,
        pending: currentVersionRows.filter((row) => row.result === "PENDING").length,
        excludedOtherScoreVersions,
        weightedAccuracyPct: weighted == null ? null : Math.round(weighted * 1000) / 10,
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
