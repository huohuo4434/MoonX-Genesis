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

export async function runWeeklyVerification(
  now = new Date(),
  options: { force?: boolean } = {}
) {
  if (!prisma) {
    return { scanned: 0, verified: 0, skipped: 0, errors: ["Database unavailable"] };
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const records = listAllPublishedWeeklyAnalyses().filter((r) => r.weekEnd < today);
  const report = { scanned: 0, verified: 0, skipped: 0, errors: [] as string[] };

  for (const record of records) {
    report.scanned += 1;
    const existing = await prisma.weeklyVerificationRecord.findUnique({
      where: { weeklyAnalysisId: record.id },
    });

    if (
      !options.force &&
      existing &&
      existing.result !== "PENDING" &&
      existing.explanation?.includes(WEEKLY_SCORE_VERSION)
    ) {
      report.skipped += 1;
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

      if (actualPattern === "UNVERIFIABLE") {
        await prisma.weeklyVerificationRecord.upsert({
          where: { weeklyAnalysisId: record.id },
          create: {
            id: `WVR-${record.id}`,
            weeklyAnalysisId: record.id,
            assetId: record.assetId,
            symbol: record.symbol,
            weekStart: record.weekStart,
            weekEnd: record.weekEnd,
            predictedPattern: record.overallDirection,
            actualPattern,
            result: "UNVERIFIABLE",
            directionScore: 0,
            pathScore: 0,
            totalScore: 0,
            dataSource: `market-data:${quoteSymbol};score=${WEEKLY_SCORE_VERSION}`,
            explanation: `[${WEEKLY_SCORE_VERSION}] 有效交易日数据不足，不进入准确率分母。`,
            verifiedAt: now,
          },
          update: {
            actualPattern,
            result: "UNVERIFIABLE",
            directionScore: 0,
            pathScore: 0,
            totalScore: 0,
            dataSource: `market-data:${quoteSymbol};score=${WEEKLY_SCORE_VERSION}`,
            explanation: `[${WEEKLY_SCORE_VERSION}] 有效交易日数据不足，不进入准确率分母。`,
            verifiedAt: now,
          },
        });
        continue;
      }

      const firstBar = bars[0]!;
      const lastBar = bars.at(-1)!;
      const netChangePct = ((lastBar.close - firstBar.open) / Math.max(firstBar.open, 1e-9)) * 100;
      const netLabel = `${netChangePct >= 0 ? "+" : ""}${netChangePct.toFixed(2)}%`;
      const scored = scoreWeeklyVerification(record.overallDirection, actualPattern);
      const concise = explainWeeklyVerification(record.overallDirection, actualPattern, scored);

      await prisma.weeklyVerificationRecord.upsert({
        where: { weeklyAnalysisId: record.id },
        create: {
          id: `WVR-${record.id}`,
          weeklyAnalysisId: record.id,
          assetId: record.assetId,
          symbol: record.symbol,
          weekStart: record.weekStart,
          weekEnd: record.weekEnd,
          predictedPattern: record.overallDirection,
          actualPattern,
          ...scored,
          levelScore: null,
          dataSource: `market-data:${quoteSymbol};score=${WEEKLY_SCORE_VERSION}`,
          explanation: `[${WEEKLY_SCORE_VERSION}] ${concise} 周初→周末${netLabel}。`,
          verifiedAt: now,
        },
        update: {
          actualPattern,
          ...scored,
          dataSource: `market-data:${quoteSymbol};score=${WEEKLY_SCORE_VERSION}`,
          explanation: `[${WEEKLY_SCORE_VERSION}] ${concise} 周初→周末${netLabel}。`,
          verifiedAt: now,
        },
      });
      report.verified += 1;
    } catch (error) {
      report.errors.push(`${record.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return report;
}
