/**
 * Database-independent daily forecast fallback.
 *
 * This module intentionally does not import the technical-price engine, Prisma,
 * Supabase, or the automation pipeline. It exists so the homepage/member pages
 * can still show a locked weekly-derived direction when persistence or market
 * data is temporarily unavailable.
 *
 * IMPORTANT: this is a weekly-hexagram-to-daily presentation fallback. It does
 * not create an independent daily hexagram and does not rewrite locked weekly
 * research. Formal verification remains attached to the persisted locked daily
 * record when the normal 20:00 publication task succeeds.
 */
import { ALL_WEEKLY_ANALYSES } from "@/lib/data/published-weekly-analysis-20260727";
import { PUBLISHED_WEEKLY_ANALYSES_20260803 } from "@/lib/data/published-weekly-analysis-20260803";
import { PUBLISHED_WEEKLY_ANALYSES_20260810_V4 } from "@/lib/data/published-weekly-us-indices-20260809";
import { PUBLISHED_WEEKLY_ANALYSES_20260817 } from "@/lib/data/published-weekly-analysis-20260817";
import { isTradingDay } from "@/lib/calendar/next-trading-day";
import { generatedDailyToUi } from "@/lib/forecasts/generated-to-ui";
import { generateDailyFromWeekly, marketMeta } from "@/lib/forecasts/weekly-to-daily";
import type { DailyForecast } from "@/types/daily-forecast";
import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

export const PUBLIC_FALLBACK_MARKETS = [
  "BTC",
  "ETH",
  "SPX",
  "NDX",
  "SHCOMP",
  "HSTECH",
  "GLD",
  "SILVER",
  "WTI",
] as const;

const ALL_FALLBACK_WEEKLY_ANALYSES: WeeklyAnalysisRecord[] = [
  ...ALL_WEEKLY_ANALYSES,
  ...PUBLISHED_WEEKLY_ANALYSES_20260803,
  ...PUBLISHED_WEEKLY_ANALYSES_20260810_V4,
  ...PUBLISHED_WEEKLY_ANALYSES_20260817,
];

function analysisCodes(marketCode: string): string[] {
  if (marketCode === "SHCOMP") return ["SHCOMP", "000001.SS", "SSEC"];
  if (marketCode === "GLD") return ["GLD", "Gold", "GOLD", "XAU", "GC=F"];
  if (marketCode === "SILVER") return ["SILVER", "SI", "SI=F", "SLV"];
  if (marketCode === "WTI") return ["WTI", "CL", "CL=F"];
  return [marketCode];
}

function weeklyAnalysisForDate(
  marketCode: string,
  forecastDate: string
): WeeklyAnalysisRecord | null {
  const codes = analysisCodes(marketCode);
  const candidates = ALL_FALLBACK_WEEKLY_ANALYSES.filter((record) => {
    const display = record.displaySymbol ?? "";
    const symbol = record.symbol ?? "";
    return codes.includes(display) || codes.includes(symbol);
  }).sort((left, right) => {
    const exactLeft = left.weekStart <= forecastDate && left.weekEnd >= forecastDate ? 1 : 0;
    const exactRight = right.weekStart <= forecastDate && right.weekEnd >= forecastDate ? 1 : 0;
    return (
      exactRight - exactLeft ||
      right.version - left.version ||
      right.weekStart.localeCompare(left.weekStart) ||
      String(right.updatedAt || right.publishedAt).localeCompare(
        String(left.updatedAt || left.publishedAt)
      )
    );
  });

  const exact = candidates.find(
    (record) => record.weekStart <= forecastDate && record.weekEnd >= forecastDate
  );
  if (exact) return exact;

  const prior = candidates
    .filter((record) => record.weekEnd < forecastDate)
    .sort((left, right) => right.weekEnd.localeCompare(left.weekEnd))[0];
  if (!prior) return null;

  const dayGap = Math.round(
    (Date.parse(`${forecastDate}T00:00:00Z`) -
      Date.parse(`${prior.weekEnd}T00:00:00Z`)) /
      86_400_000
  );
  return dayGap <= 7 ? prior : null;
}

function extractHexagrams(record: WeeklyAnalysisRecord): {
  primary: string | null;
  changed: string | null;
} {
  const note = String(record.basisWeights?.note ?? "");
  const marker = note.match(/原卦[：:]\s*([^。；]+)/u)?.[1]?.trim();
  if (!marker) return { primary: null, changed: null };
  const parts = marker.split(/\s*[→➡]\s*/u).map((part) => part.trim()).filter(Boolean);
  return {
    primary: parts[0] ?? null,
    changed: parts[1]?.replace(/^变卦[：:]?\s*/u, "").trim() || null,
  };
}

function toWeeklySource(
  marketCode: string,
  forecastDate: string,
  record: WeeklyAnalysisRecord
): WeeklyForecastSourceRecord {
  const continuity = !(record.weekStart <= forecastDate && record.weekEnd >= forecastDate);
  const hexagrams = extractHexagrams(record);
  return {
    id: continuity ? `${record.id}-FALLBACK-${forecastDate}` : record.id,
    marketCode,
    periodStart: continuity ? forecastDate : record.weekStart,
    periodEnd: continuity ? forecastDate : record.weekEnd,
    primaryHexagram: hexagrams.primary,
    changedHexagram: hexagrams.changed,
    movingLines: [],
    specialPatterns: continuity ? ["CONTINUITY_LOW_CONFIDENCE_RESEARCH_ONLY"] : [],
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

function fallbackPublishIso(forecastDate: string): string {
  const release = new Date(`${forecastDate}T20:00:00+08:00`);
  release.setUTCDate(release.getUTCDate() - 1);
  return release.toISOString();
}

export type PublicFallbackMarket = (typeof PUBLIC_FALLBACK_MARKETS)[number];

export function buildWeeklyDerivedFallbackForMarket(
  marketCode: PublicFallbackMarket,
  forecastDate: string,
  accessLevel: "public" | "member" = "public"
): DailyForecast | null {
  try {
    const meta = marketMeta(marketCode);
    if (!isTradingDay(meta.legacyMarket, forecastDate)) return null;

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
    const publishedAt = fallbackPublishIso(forecastDate);
    return {
      ...ui,
      id: `${ui.id}-PUBLIC-FALLBACK`,
      publishedAt,
      updatedAt: publishedAt,
      reviewedAt: publishedAt,
      reviewedBy: "weekly-derived-emergency-fallback",
      publishedBy: "weekly-derived-emergency-fallback",
      accuracyEligible: false,
      accuracyExclusionReason:
        "周卦拆日补位；正式锁定记录由北京时间20:00自动任务写入后纳入验证",
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
