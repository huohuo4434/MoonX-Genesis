import {
  ALL_WEEKLY_ANALYSES,
  PUBLISHED_WEEKLY_ANALYSES,
} from "@/lib/data/published-weekly-analysis-20260727";
import { applyWeeklyPriceOverlay } from "@/lib/data/apply-price-overlays";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type {
  WeeklyAnalysisMemberView,
  WeeklyAnalysisPublicSummary,
  WeeklyAnalysisRecord,
  WeeklyAnalysisTeaser,
} from "@/types/weekly-analysis";

export function listAllWeeklyAnalyses(): WeeklyAnalysisRecord[] {
  return ALL_WEEKLY_ANALYSES.map(applyWeeklyPriceOverlay);
}

export function listPublishedWeeklyAnalyses(): WeeklyAnalysisRecord[] {
  return PUBLISHED_WEEKLY_ANALYSES.filter((r) => r.status === "published").map(applyWeeklyPriceOverlay);
}

export function toWeeklyTeaser(r: WeeklyAnalysisRecord): WeeklyAnalysisTeaser {
  return {
    id: r.id,
    assetId: r.assetId,
    assetName: r.assetName,
    symbol: r.symbol,
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    status: r.status,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    isReady: r.status === "published",
  };
}

export function toWeeklyMemberView(r: WeeklyAnalysisRecord): WeeklyAnalysisMemberView {
  return {
    id: r.id,
    assetId: r.assetId,
    assetName: r.assetName,
    symbol: r.symbol,
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    overallDirection: r.overallDirection,
    weeklyPath: r.weeklyPath,
    headline: r.headline,
    probabilities: r.probabilities,
    strongWindow: r.strongWindow,
    weakWindow: r.weakWindow,
    keySupport: r.keySupport,
    keyResistance: r.keyResistance,
    invalidation: r.invalidation,
    confirmation: r.confirmation,
    priceSnapshot: r.priceSnapshot,
    priceDataSourceLabel: r.priceDataSourceLabel,
    priceSnapshotAtLabel: r.priceSnapshotAtLabel,
    riskLevel: r.riskLevel,
    confidence: r.confidence,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    status: r.status,
    visibility: r.visibility,
    version: r.version,
    originalLocked: r.originalLocked,
  };
}

export function buildWeeklyPublicSummary(): WeeklyAnalysisPublicSummary {
  const published = listPublishedWeeklyAnalyses();
  const first = published[0];
  const weekStart = first?.weekStart ?? "2026-07-27";
  const weekEnd = first?.weekEnd ?? "2026-08-02";
  const updated = published
    .map((r) => r.updatedAt || r.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const publishedAt = published
    .map((r) => r.publishedAt)
    .filter(Boolean)
    .sort()
    .at(0);

  return {
    weekStart,
    weekEnd,
    weekLabel: `${formatDateChina(weekStart)}至${formatDateChina(weekEnd)}`,
    publishedAtLabel: publishedAt ? formatDateTimeChina(publishedAt) : "—",
    lastUpdatedLabel: updated ? formatDateTimeChina(updated) : "—",
    publishedCount: published.length,
    assetNames: published.map((r) => r.assetName),
    teasers: published.map(toWeeklyTeaser),
    nextPublishHint: "下一次固定发布时间：每周日 20:00（北京时间）",
  };
}
