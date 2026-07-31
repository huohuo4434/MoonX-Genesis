/**
 * Database-independent daily forecast fallback.
 *
 * This module intentionally does not import the technical-price engine, Prisma,
 * Supabase, or the automation pipeline. It exists so the homepage/member pages
 * can still show a locked weekly-derived direction when persistence or market
 * data is temporarily unavailable.
 */
import { ALL_WEEKLY_ANALYSES } from "@/lib/data/published-weekly-analysis-20260727";
import { generatedDailyToUi } from "@/lib/forecasts/generated-to-ui";
import { generateDailyFromWeekly } from "@/lib/forecasts/weekly-to-daily";
import type { DailyForecast } from "@/types/daily-forecast";
import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

export const PUBLIC_FALLBACK_MARKETS = [
  "BTC",
  "SPX",
  "NDX",
  "SHCOMP",
  "HSTECH",
  "GLD",
  "WTI",
] as const;

function analysisCodes(marketCode: string): string[] {
  if (marketCode === "SHCOMP") return ["SHCOMP", "000001.SS", "SSEC"];
  if (marketCode === "GLD") return ["GLD", "Gold", "GOLD", "XAU", "GC=F"];
  return [marketCode];
}

function weeklyAnalysisForDate(
  marketCode: string,
  forecastDate: string
): WeeklyAnalysisRecord | null {
  const codes = analysisCodes(marketCode);
  const candidates = ALL_WEEKLY_ANALYSES.filter((record) => {
    const display = record.displaySymbol ?? "";
    const symbol = record.symbol ?? "";
    return codes.includes(display) || codes.includes(symbol);
  });

  const exact = candidates.find(
    (record) => record.weekStart <= forecastDate && record.weekEnd >= forecastDate
  );
  if (exact) return exact;

  const prior = candidates
    .filter((record) => record.weekEnd < forecastDate)
    .sort((a, b) => b.weekEnd.localeCompare(a.weekEnd))[0];
  if (!prior) return null;

  const dayGap = Math.round(
    (Date.parse(`${forecastDate}T00:00:00Z`) -
      Date.parse(`${prior.weekEnd}T00:00:00Z`)) /
      86_400_000
  );
  return dayGap <= 7 ? prior : null;
}

function toWeeklySource(
  marketCode: string,
  forecastDate: string,
  record: WeeklyAnalysisRecord
): WeeklyForecastSourceRecord {
  const continuity = !(record.weekStart <= forecastDate && record.weekEnd >= forecastDate);
  return {
    id: continuity ? `${record.id}-FALLBACK-${forecastDate}` : record.id,
    marketCode,
    periodStart: continuity ? forecastDate : record.weekStart,
    periodEnd: continuity ? forecastDate : record.weekEnd,
    primaryHexagram: null,
    changedHexagram: null,
    movingLines: [],
    specialPatterns: [],
    weeklyDirection: record.overallDirection,
    weeklyPath: continuity
      ? `沿用最近有效周度背景：${record.weeklyPath}`
      : record.weeklyPath,
    interpretation: continuity
      ? `临时连续预测：${record.headline}`
      : record.headline,
    riskSummary: [
      continuity ? "新周研究尚未锁定，当前为周度连续预测。" : "",
      (record.risks ?? []).join("；") || record.invalidation,
    ]
      .filter(Boolean)
      .join("；"),
    sourceType: "WEEKLY_ANALYSIS",
    version: record.version,
    status: "LOCKED",
    publishedAt: record.publishedAt,
    lockedAt: record.publishedAt,
    createdAt: record.publishedAt,
    updatedAt: record.updatedAt,
  };
}

export type PublicFallbackMarket = (typeof PUBLIC_FALLBACK_MARKETS)[number];

export function buildWeeklyDerivedFallbackForMarket(
  marketCode: PublicFallbackMarket,
  forecastDate: string,
  accessLevel: "public" | "member" = "public"
): DailyForecast | null {
  try {
    const analysis = weeklyAnalysisForDate(marketCode, forecastDate);
    if (!analysis) return null;
    const weekly = toWeeklySource(marketCode, forecastDate, analysis);
    const generated = generateDailyFromWeekly({
      weekly,
      forecastDate,
      version: 1,
      status: "LOCKED",
    });
    const ui = generatedDailyToUi(generated, accessLevel);
    return {
      ...ui,
      id: `${ui.id}-PUBLIC-FALLBACK`,
      publishedBy: "moox-auto-engine",
      reviewedBy: "moox-auto-engine",
      reviewedAt: ui.publishedAt,
      accuracyEligible: false,
      accuracyExclusionReason: "周度推演连续记录，不计入正式准确率",
    };
  } catch (error) {
    console.warn(`[public-daily-fallback] ${marketCode}:${forecastDate}`, error);
    return null;
  }
}

export function buildWeeklyDerivedFallbacks(
  forecastDate: string,
  accessLevel: "public" | "member" = "public"
): DailyForecast[] {
  return PUBLIC_FALLBACK_MARKETS.map((marketCode) =>
    buildWeeklyDerivedFallbackForMarket(marketCode, forecastDate, accessLevel)
  ).filter((row): row is DailyForecast => row != null);
}
