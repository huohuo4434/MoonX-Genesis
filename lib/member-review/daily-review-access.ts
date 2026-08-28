import "server-only";

import { listDailyForecastRecords, listDailyReviews, listDailyVerificationResults } from "@/lib/data/moonx-data-store";
import { getWeeklySourceForMarketDate } from "@/lib/weekly-source/store";
import { buildMemberDailyReviewReports } from "@/lib/member-review/daily-review-report";
import type { DailyForecastRecord } from "@/types/daily-accuracy";

const CORE_SOURCE_MARKET: Readonly<Record<string, string>> = Object.freeze({
  BTC: "BTC",
  ETH: "ETH",
  SPX: "SPX",
  NDX: "NDX",
  SSEC: "SHCOMP",
  HSTECH: "HSTECH",
  GOLD: "GOLD",
  GLD: "GOLD",
  SILVER: "SILVER",
  WTI: "WTI",
});

async function enrichCoreSource(forecast: DailyForecastRecord): Promise<DailyForecastRecord> {
  if (forecast.sourcePrimaryHexagram) return forecast;
  const marketCode = CORE_SOURCE_MARKET[forecast.symbol.trim().toUpperCase()];
  if (!marketCode) return forecast;
  const source = await getWeeklySourceForMarketDate(marketCode, forecast.forecastDate).catch(() => null);
  if (!source) return forecast;
  if (forecast.sourceForecastId && source.id !== forecast.sourceForecastId) return forecast;
  const sourceLockedAt = Date.parse(source.lockedAt ?? source.publishedAt ?? source.createdAt);
  const forecastPublishedAt = Date.parse(forecast.publishedAt);
  if (Number.isFinite(sourceLockedAt) && Number.isFinite(forecastPublishedAt) && sourceLockedAt > forecastPublishedAt) {
    return forecast;
  }
  return {
    ...forecast,
    sourceForecastId: source.id,
    sourcePeriodStart: source.periodStart,
    sourcePeriodEnd: source.periodEnd,
    sourcePrimaryHexagram: source.primaryHexagram,
    sourceChangedHexagram: source.changedHexagram,
    sourceInterpretation: source.interpretation,
    sourceWeeklyDirection: source.weeklyDirection,
  };
}

export async function getMemberDailyReviewReports(now = new Date()) {
  const [forecasts, results, reviews] = await Promise.all([
    listDailyForecastRecords(),
    listDailyVerificationResults(),
    listDailyReviews(),
  ]);
  const enriched = await Promise.all(forecasts.map(enrichCoreSource));
  return buildMemberDailyReviewReports({ forecasts: enriched, results, reviews, now, maxDays: 14 });
}
