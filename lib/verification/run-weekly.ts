import "server-only";

import { prisma } from "@/lib/prisma";
import { listAllPublishedWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { resolveCanonicalQuoteSymbol } from "@/lib/market-data/quote-symbols";
import {
  WEEKLY_SCORE_VERSION,
  classifyWeeklyPath,
  explainWeeklyVerification,
  resolveWeeklyVerificationMarket,
  scoreWeeklyVerification,
} from "@/lib/verification/weekly-verification-core";

type PersistedWeeklyOutcome = {
  actualPattern: string;
  result: string;
  directionScore: number;
  pathScore: number;
  levelScore: number | null;
  totalScore: number;
  dataSource: string;
  explanation: string;
};

function revisionId(weeklyAnalysisId: string, scoreVersion: string): string {
  return `WVRR-${weeklyAnalysisId}-${scoreVersion}`;
}

function isConcurrentInsertConflict(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && (error as { code?: unknown }).code === "P2002"
  );
}

export async function runWeeklyVerification(
  now = new Date(),
  options: { force?: boolean } = {}
) {
  if (!prisma) {
    return {
      scanned: 0,
      verified: 0,
      skipped: 0,
      immutableSkipped: 0,
      concurrentSkipped: 0,
      versionUpgradeRequired: 0,
      errors: ["Database unavailable"],
    };
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const records = listAllPublishedWeeklyAnalyses().filter((r) => r.weekEnd < today);
  const report = {
    scanned: 0,
    verified: 0,
    skipped: 0,
    immutableSkipped: 0,
    concurrentSkipped: 0,
    versionUpgradeRequired: 0,
    errors: [] as string[],
  };

  for (const record of records) {
    report.scanned += 1;
    const existing = await prisma.weeklyVerificationRecord.findUnique({
      where: { weeklyAnalysisId: record.id },
    });
    const isTerminal = existing && existing.result !== "PENDING";

    // A current-policy result is immutable, even with force=true. Force only
    // authorizes an explicit upgrade from an older scoring policy.
    if (isTerminal && existing.scoreVersion === WEEKLY_SCORE_VERSION) {
      report.skipped += 1;
      report.immutableSkipped += 1;
      continue;
    }
    if (isTerminal && existing.scoreVersion !== WEEKLY_SCORE_VERSION && !options.force) {
      report.skipped += 1;
      report.versionUpgradeRequired += 1;
      continue;
    }

    try {
      const market = resolveWeeklyVerificationMarket(record.symbol);
      const quoteSymbol = resolveCanonicalQuoteSymbol(record.symbol, "");
      const fetched = await fetchRecentDailyBarsForForecast({
        quoteSymbol,
        market,
        asOfDate: record.weekEnd,
      });
      const bars = fetched.filter((b) => b.date >= record.weekStart && b.date <= record.weekEnd);
      const actualPattern = classifyWeeklyPath(bars);
      let outcome: PersistedWeeklyOutcome;

      if (actualPattern === "UNVERIFIABLE") {
        outcome = {
          actualPattern,
          result: "UNVERIFIABLE",
          directionScore: 0,
          pathScore: 0,
          levelScore: null,
          totalScore: 0,
          dataSource: `market-data:${quoteSymbol};score=${WEEKLY_SCORE_VERSION}`,
          explanation: `[${WEEKLY_SCORE_VERSION}] 有效交易日数据不足，不进入准确率分母。`,
        };
      } else {
        const firstBar = bars[0]!;
        const lastBar = bars.at(-1)!;
        const netChangePct = ((lastBar.close - firstBar.open) / Math.max(firstBar.open, 1e-9)) * 100;
        const netLabel = `${netChangePct >= 0 ? "+" : ""}${netChangePct.toFixed(2)}%`;
        const scored = scoreWeeklyVerification(record.overallDirection, actualPattern);
        const concise = explainWeeklyVerification(record.overallDirection, actualPattern, scored);
        outcome = {
          actualPattern,
          ...scored,
          levelScore: null,
          dataSource: `market-data:${quoteSymbol};score=${WEEKLY_SCORE_VERSION}`,
          explanation: `[${WEEKLY_SCORE_VERSION}] ${concise} 周初→周末${netLabel}。`,
        };
      }

      const persisted = await prisma.$transaction(async (tx) => {
        if (existing && isTerminal) {
          await tx.weeklyVerificationRevision.upsert({
            where: {
              weeklyAnalysisId_scoreVersion: {
                weeklyAnalysisId: existing.weeklyAnalysisId,
                scoreVersion: existing.scoreVersion,
              },
            },
            create: {
              id: revisionId(existing.weeklyAnalysisId, existing.scoreVersion),
              weeklyAnalysisId: existing.weeklyAnalysisId,
              weeklyVerificationRecordId: existing.id,
              scoreVersion: existing.scoreVersion,
              predictedPattern: existing.predictedPattern,
              actualPattern: existing.actualPattern,
              result: existing.result,
              directionScore: existing.directionScore,
              pathScore: existing.pathScore,
              levelScore: existing.levelScore,
              totalScore: existing.totalScore,
              dataSource: existing.dataSource,
              explanation: existing.explanation,
              verifiedAt: existing.verifiedAt,
            },
            update: {},
          });
        }

        let saved;
        if (existing) {
          // Compare-and-swap protects the terminal result from a second force
          // request that read the old version before another request upgraded it.
          const changed = await tx.weeklyVerificationRecord.updateMany({
            where: {
              id: existing.id,
              scoreVersion: existing.scoreVersion,
              result: existing.result,
            },
            data: { ...outcome, scoreVersion: WEEKLY_SCORE_VERSION, verifiedAt: now },
          });
          if (changed.count !== 1) return null;
          saved = await tx.weeklyVerificationRecord.findUniqueOrThrow({ where: { id: existing.id } });
        } else {
          saved = await tx.weeklyVerificationRecord.create({
              data: {
                id: `WVR-${record.id}`,
                weeklyAnalysisId: record.id,
                assetId: record.assetId,
                symbol: record.symbol,
                weekStart: record.weekStart,
                weekEnd: record.weekEnd,
                predictedPattern: record.overallDirection,
                ...outcome,
                scoreVersion: WEEKLY_SCORE_VERSION,
                verifiedAt: now,
              },
            });
        }

        await tx.weeklyVerificationRevision.upsert({
          where: {
            weeklyAnalysisId_scoreVersion: {
              weeklyAnalysisId: record.id,
              scoreVersion: WEEKLY_SCORE_VERSION,
            },
          },
          create: {
            id: revisionId(record.id, WEEKLY_SCORE_VERSION),
            weeklyAnalysisId: record.id,
            weeklyVerificationRecordId: saved.id,
            scoreVersion: WEEKLY_SCORE_VERSION,
            predictedPattern: saved.predictedPattern,
            actualPattern: saved.actualPattern,
            result: saved.result,
            directionScore: saved.directionScore,
            pathScore: saved.pathScore,
            levelScore: saved.levelScore,
            totalScore: saved.totalScore,
            dataSource: saved.dataSource,
            explanation: saved.explanation,
            verifiedAt: saved.verifiedAt,
          },
          update: {},
        });
        return saved;
      });
      if (!persisted) {
        report.skipped += 1;
        report.concurrentSkipped += 1;
        continue;
      }
      report.verified += 1;
    } catch (error) {
      // Two schedulers can race before either one sees the first record. The
      // unique key remains the authority; the loser is a safe skip, not a
      // verification failure and never an overwrite.
      if (isConcurrentInsertConflict(error)) {
        report.skipped += 1;
        report.concurrentSkipped += 1;
        continue;
      }
      report.errors.push(`${record.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return report;
}
