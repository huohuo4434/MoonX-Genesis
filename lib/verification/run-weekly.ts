import "server-only";

import { prisma } from "@/lib/prisma";
import { listAllPublishedWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { resolveCanonicalQuoteSymbol } from "@/lib/market-data/quote-symbols";
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import type { WeeklyOverallDirection } from "@/types/weekly-analysis";

function marketFor(symbol: string): DailyAccuracyMarket {
  if (symbol === "BTC") return "CRYPTO";
  if (symbol === "000001.SS") return "CN";
  if (symbol === "HSTECH") return "HK";
  if (symbol === "WTI") return "US_FUTURES";
  return "US";
}

function classifyWeeklyPath(bars: Array<{ open: number; high: number; low: number; close: number }>): string {
  if (!bars.length) return "UNVERIFIABLE";
  const first = bars[0]!;
  const last = bars.at(-1)!;
  const weekHigh = Math.max(...bars.map((b) => b.high));
  const weekLow = Math.min(...bars.map((b) => b.low));
  const highIndex = bars.findIndex((b) => b.high === weekHigh);
  const lowIndex = bars.findIndex((b) => b.low === weekLow);
  const change = (last.close - first.open) / Math.max(first.open, 1e-9);
  const range = (weekHigh - weekLow) / Math.max(first.open, 1e-9);
  if (range < 0.015) return "震荡";
  if (lowIndex < highIndex && change > 0.003) return "先跌后涨";
  if (highIndex < lowIndex && change < -0.003) return "先涨后跌";
  if (change > 0.012) return "上涨";
  if (change < -0.012) return "下跌";
  if (change > 0.003) return "震荡上涨";
  if (change < -0.003) return "震荡下跌";
  return "震荡";
}

function family(pattern: string): "UP" | "DOWN" | "RANGE" {
  if (/先跌后涨|探底回升|震荡上涨|上涨/.test(pattern)) return "UP";
  if (/先涨后跌|冲高回落|震荡下跌|下跌/.test(pattern)) return "DOWN";
  return "RANGE";
}

function score(predicted: WeeklyOverallDirection, actual: string) {
  if (predicted === actual) return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 };
  if (family(predicted) === family(actual)) return { result: "PARTIAL_HIT", directionScore: 45, pathScore: 20, totalScore: 65 };
  if (predicted === "震荡" && /震荡/.test(actual)) return { result: "PARTIAL_HIT", directionScore: 35, pathScore: 20, totalScore: 55 };
  return { result: "MISS", directionScore: 0, pathScore: 0, totalScore: 0 };
}

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
    if (existing && existing.result !== "PENDING") {
      report.skipped += 1;
      continue;
    }
    try {
      const market = marketFor(record.symbol);
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
            explanation: "有效交易日数据不足，不进入准确率分母。",
            verifiedAt: now,
          },
          update: {
            actualPattern,
            result: "UNVERIFIABLE",
            dataSource: `market-data:${quoteSymbol}`,
            explanation: "有效交易日数据不足，不进入准确率分母。",
            verifiedAt: now,
          },
        });
        continue;
      }
      const scored = score(record.overallDirection, actualPattern);
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
          explanation: `预测${record.overallDirection}，实际${actualPattern}。周度方向和路径分开计分。`,
          verifiedAt: now,
        },
        update: {
          actualPattern,
          ...scored,
          dataSource: `market-data:${quoteSymbol}`,
          explanation: `预测${record.overallDirection}，实际${actualPattern}。周度方向和路径分开计分。`,
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
