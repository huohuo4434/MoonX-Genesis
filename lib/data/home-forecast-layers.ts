/**
 * Derives homepage multi-horizon presentation from existing MoonX snapshot fields.
 * Does not invent prices, directions, or weekly day-by-day paths.
 */
import {
  getDominantDirection,
  type AssetIntelligenceSnapshot,
} from "@/lib/data/intelligence-snapshot-types";
import type { AssetForecastSummary, ForecastDirection, ForecastLayer } from "@/types/forecast-horizon";

function confidenceLabel(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function mapDirection(scores: AssetIntelligenceSnapshot["scores"]): ForecastDirection {
  const trend = getDominantDirection(scores);
  if (trend === "up") return scores.bullish >= 70 ? "strong_bullish" : "bullish";
  if (trend === "down") return scores.bearish >= 70 ? "strong_bearish" : "bearish";
  return "neutral";
}

function firstOrPending(zh?: string, en?: string, fallbackZh = "等待研究更新", fallbackEn = "Awaiting research update"): { zhCN: string; en: string } {
  const zhCN = zh?.trim() || fallbackZh;
  const enText = en?.trim() || fallbackEn;
  return { zhCN, en: enText };
}

export function toAssetForecastSummary(asset: AssetIntelligenceSnapshot): AssetForecastSummary {
  const direction = mapDirection(asset.scores);
  const updatedAt = asset.forecastWindow.end || asset.forecastWindow.start;
  const support = asset.keySupport?.slice(0, 2) ?? [];
  const resistance = asset.keyResistance?.slice(0, 2) ?? [];
  const strategicSummary = firstOrPending(asset.summaryZh ?? asset.trendPathZh?.[0], asset.currentView || asset.trendPath[0]);
  const tacticalSummary = firstOrPending(asset.shortViewZh, asset.shortView);
  const confirmation = asset.verificationItems[0];
  const confirmationZhCN = asset.verificationItemsZh?.[0] ?? confirmation;
  const invalidation = asset.primaryRisk;
  const invalidationZhCN = asset.primaryRiskZh ?? invalidation;

  const layers: ForecastLayer[] = [
    {
      horizon: "strategic",
      periodStart: asset.forecastWindow.start,
      periodEnd: asset.forecastWindow.end,
      direction,
      summaryZhCN: strategicSummary.zhCN,
      summaryEn: strategicSummary.en,
      confidenceLabel: confidenceLabel(asset.scores.confidence),
      updatedAt,
    },
    {
      horizon: "tactical",
      periodStart: asset.forecastWindow.start,
      periodEnd: asset.forecastWindow.end,
      direction,
      summaryZhCN: tacticalSummary.zhCN,
      summaryEn: tacticalSummary.en,
      keyDates: asset.forecastWindow.start ? [asset.forecastWindow.start] : undefined,
      updatedAt,
    },
    {
      horizon: "execution",
      direction,
      summaryZhCN: support.length || resistance.length ? "关键价位与确认条件见下方执行观察。" : "等待研究更新",
      summaryEn: support.length || resistance.length ? "Key levels and confirmation conditions are listed below." : "Awaiting research update",
      supportLevels: support,
      resistanceLevels: resistance,
      confirmation,
      confirmationZhCN,
      invalidation,
      invalidationZhCN,
      updatedAt,
    },
  ];

  return {
    assetId: asset.id,
    symbol: asset.symbol,
    nameZhCN: asset.assetZh ?? asset.asset,
    nameEn: asset.asset,
    direction,
    layers,
    nextObservation: asset.forecastWindow.start,
    updatedAt,
    detailHref: `/research/intelligence-snapshot#${asset.id}`,
    status: support.length || resistance.length || asset.shortView ? "active" : "pending",
  };
}
