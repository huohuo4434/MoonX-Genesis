import {
  ALL_WEEKLY_ANALYSES,
  PUBLISHED_WEEKLY_ANALYSES,
  WEEKLY_CORE_MARKETS,
} from "@/lib/data/published-weekly-analysis-20260727";
import { applyWeeklyPriceOverlay } from "@/lib/data/apply-price-overlays";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type {
  WeeklyAnalysisMemberView,
  WeeklyAnalysisPublicSummary,
  WeeklyAnalysisRecord,
  WeeklyAnalysisTeaser,
  WeeklyMarketSlot,
} from "@/types/weekly-analysis";

export { WEEKLY_CORE_MARKETS };

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
    displaySymbol: r.displaySymbol ?? r.symbol,
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
    displaySymbol: r.displaySymbol ?? r.symbol,
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    overallDirection: r.overallDirection,
    weeklyPath: r.weeklyPath,
    headline: r.headline,
    probabilities: r.probabilities,
    strongWindow: r.strongWindow,
    weakWindow: r.weakWindow,
    keyDates: r.keyDates,
    keySupport: r.keySupport,
    keyResistance: r.keyResistance,
    invalidation: r.invalidation,
    confirmation: r.confirmation,
    catalysts: r.catalysts,
    risks: r.risks,
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

/** Always 7 slots in canonical order — missing markets show as unpublished. */
export function buildWeeklyMarketSlots(): WeeklyMarketSlot[] {
  const byAsset = new Map(
    listPublishedWeeklyAnalyses().map((r) => [r.assetId, toWeeklyMemberView(r)])
  );
  return WEEKLY_CORE_MARKETS.map((m) => {
    const analysis = byAsset.get(m.assetId);
    if (analysis) return { kind: "published" as const, analysis };
    return {
      kind: "unpublished" as const,
      assetId: m.assetId,
      assetName: m.assetName,
      symbol: m.symbol,
      displaySymbol: m.displaySymbol,
    };
  });
}

export function buildWeeklyPublicSummary(): WeeklyAnalysisPublicSummary {
  const slots = buildWeeklyMarketSlots();
  const published = slots
    .filter((s): s is Extract<WeeklyMarketSlot, { kind: "published" }> => s.kind === "published")
    .map((s) => s.analysis);
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

  const teasers: WeeklyAnalysisTeaser[] = slots.map((s) => {
    if (s.kind === "published") {
      return {
        id: s.analysis.id,
        assetId: s.analysis.assetId,
        assetName: s.analysis.assetName,
        symbol: s.analysis.symbol,
        displaySymbol: s.analysis.displaySymbol ?? s.analysis.symbol,
        weekStart: s.analysis.weekStart,
        weekEnd: s.analysis.weekEnd,
        status: s.analysis.status,
        publishedAt: s.analysis.publishedAt,
        updatedAt: s.analysis.updatedAt,
        isReady: true,
      };
    }
    return {
      id: `WEEKLY-EMPTY-${s.assetId}`,
      assetId: s.assetId,
      assetName: s.assetName,
      symbol: s.symbol,
      displaySymbol: s.displaySymbol,
      weekStart,
      weekEnd,
      status: "draft",
      publishedAt: "",
      updatedAt: "",
      isReady: false,
    };
  });

  return {
    weekStart,
    weekEnd,
    weekLabel: `${formatDateChina(weekStart)}至${formatDateChina(weekEnd)}`,
    publishedAtLabel: publishedAt ? formatDateTimeChina(publishedAt) : "—",
    lastUpdatedLabel: updated ? formatDateTimeChina(updated) : "—",
    publishedCount: published.length,
    coverageCount: WEEKLY_CORE_MARKETS.length,
    assetNames: WEEKLY_CORE_MARKETS.map((m) => m.assetName),
    teasers,
    nextPublishHint: "下一交易日观点持续更新。",
  };
}
