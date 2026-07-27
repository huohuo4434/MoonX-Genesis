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

/**
 * Gold three-horizon split:
 * - strategic: annual soft-bearish (must not be overwritten by short-term 4200 scenario)
 * - tactical: this-week high-then-soft
 * - execution: short-term price scenario (4060 / 4200) only
 */
function goldLayers(asset: AssetIntelligenceSnapshot, updatedAt: string): {
  direction: ForecastDirection;
  directionLabelZhCN: string;
  directionLabelEn: string;
  layers: ForecastLayer[];
} {
  const support = asset.keySupport?.length ? asset.keySupport.slice(0, 2) : ["4,060"];
  const resistance = asset.keyResistance?.length ? asset.keyResistance.slice(0, 2) : ["4,200"];

  return {
    direction: "slightly_bearish",
    directionLabelZhCN: "中性偏空",
    directionLabelEn: "Neutral soft-bearish",
    layers: [
      {
        horizon: "strategic",
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
        direction: "slightly_bearish",
        directionLabelZhCN: "中性偏空",
        directionLabelEn: "Neutral soft-bearish",
        summaryZhCN: "上半年主要高位可能已经形成，2026年下半年进入高波动和逐渐转弱阶段。",
        summaryEn: "The key H1 high zone may already be in place; H2 2026 enters higher volatility and gradual softening.",
        confidenceLabel: "medium",
        updatedAt,
      },
      {
        horizon: "tactical",
        periodStart: "2026-07-27",
        periodEnd: "2026-07-31",
        direction: "slightly_bearish",
        directionLabelZhCN: "略微看跌 · 前高后低",
        directionLabelEn: "Slightly bearish · high then soft",
        summaryZhCN: "周初可能高位震荡或试探前高，周中后获利兑现和回落风险增加。",
        summaryEn: "Early week may chop high or probe highs; mid/late week profit-taking and fade risk rises.",
        keyDates: ["2026-07-29"],
        updatedAt,
      },
      {
        horizon: "execution",
        periodStart: "2026-07-26",
        periodEnd: "2026-08-07",
        direction: "slightly_bearish",
        directionLabelZhCN: "短期价格情景",
        directionLabelEn: "Short-term price scenario",
        summaryZhCN: "短期价格情景：2026-08-07前突破4,200难度较大。不覆盖年度中性偏空方向。",
        summaryEn: "Short-term price scenario: breaking 4,200 before 2026-08-07 looks difficult. Does not override the annual soft-bearish view.",
        supportLevels: support,
        resistanceLevels: resistance,
        confirmation: "Breaking 4,200 before August 7 looks difficult.",
        confirmationZhCN: "2026-08-07前突破4,200难度较大",
        invalidation: asset.primaryRisk,
        invalidationZhCN: asset.primaryRiskZh ?? asset.primaryRisk,
        updatedAt,
      },
    ],
  };
}

export function toAssetForecastSummary(asset: AssetIntelligenceSnapshot): AssetForecastSummary {
  const updatedAt = asset.forecastWindow.end || asset.forecastWindow.start;

  if (asset.id === "gold") {
    const gold = goldLayers(asset, updatedAt);
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      nameZhCN: asset.assetZh ?? asset.asset,
      nameEn: asset.asset,
      direction: gold.direction,
      layers: gold.layers,
      nextObservation: "2026-07-29",
      updatedAt,
      detailHref: `/research/intelligence-snapshot#${asset.id}`,
      status: "active",
    };
  }

  const direction = mapDirection(asset.scores);
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
      summaryZhCN: support.length || resistance.length ? "关键价位与确认条件见下方执行观察。" : "中长期观点已更新；执行价位待技术补充。",
      summaryEn: support.length || resistance.length ? "Key levels and confirmation conditions are listed below." : "Longer-horizon view is active; execution levels pending technical update.",
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
