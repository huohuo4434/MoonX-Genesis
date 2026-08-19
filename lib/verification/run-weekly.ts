import "server-only";

import { prisma } from "@/lib/prisma";
import { listAllPublishedWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { resolveCanonicalQuoteSymbol } from "@/lib/market-data/quote-symbols";
import { classifyWeeklyPath, resolveWeeklyVerificationMarket, scoreWeeklyVerification } from "@/lib/verification/weekly-verification-core";

const WEEKLY_SCORE_VERSION = "WEEKLY_SCORE_V2_END_DIRECTION_FIRST";

export async function runWeeklyVerification(now = new Date()) {
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
    if (existing && existing.result !== "PENDING" && existing.explanation?.includes(WEEKLY_SCORE_VERSION)) {
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
            dataSource: `market-data:${quoteSymbol}`,
            explanation: `[${WEEKLY_SCORE_VERSION}] 有效交易日数据不足，不进入准确率分母。`,
            verifiedAt: now,
          },
          update: {
            actualPattern,
            result: "UNVERIFIABLE",
            dataSource: `market-data:${quoteSymbol}`,
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
          dataSource: `market-data:${quoteSymbol}`,
          explanation: `[${WEEKLY_SCORE_VERSION}] 预测${record.overallDirection}，实际${actualPattern}，周初→周末净变化${netLabel}。净方向优先；“震荡上涨/震荡下跌”允许周内不同先后路径，只要最终方向一致且确有波动；只有明确预测反转顺序时才严格核对先后路径。`,
          verifiedAt: now,
        },
        update: {
          actualPattern,
          ...scored,
          dataSource: `market-data:${quoteSymbol}`,
          explanation: `[${WEEKLY_SCORE_VERSION}] 预测${record.overallDirection}，实际${actualPattern}，周初→周末净变化${netLabel}。净方向优先；“震荡上涨/震荡下跌”允许周内不同先后路径，只要最终方向一致且确有波动；只有明确预测反转顺序时才严格核对先后路径。`,
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
