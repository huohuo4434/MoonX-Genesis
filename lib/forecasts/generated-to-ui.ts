/**
 * Map GeneratedDailyForecastRecord → UI DailyForecast.
 */
import { sessionLabelForMarket } from "@/lib/calendar/next-trading-day";
import { consensusStarsFromInputs } from "@/lib/forecasts/consensus-confidence";
import { marketMeta } from "@/lib/forecasts/weekly-to-daily";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type { DailyForecast } from "@/types/daily-forecast";
import { normalizeDailyLanguage, signalStrengthFromConfidence } from "@/lib/forecasts/daily-language";
import { canonicalAssetCode, canonicalAssetId, assetDisplayName } from "@/lib/presentation/asset-catalog";
import { normalizeForecastContract } from "@/lib/forecasts/forecast-contract";

export function generatedDailyToUi(
  r: GeneratedDailyForecastRecord,
  accessLevel: "public" | "member" = "member"
): DailyForecast {
  const meta = marketMeta(r.marketCode);
  const canonicalCode = canonicalAssetCode(r.marketCode);
  const formal = r.direction;
  const qimenSummary = r.qimenEvidence
    ? r.qimenEvidence.split("；").slice(0, 3).join("；")
    : null; // MOOX_QIMEN_FIRST_V72005_UI
  const consensus = consensusStarsFromInputs({
    confidence: Math.max(r.upProbability, r.sidewaysProbability, r.downProbability),
    frameworkCount: [r.liuyaoEvidence, r.qimenEvidence, r.calendarEvidence, r.newsEvidence].filter(Boolean).length || 1,
    hasTechnical: Boolean(r.supportLevels?.length && r.resistanceLevels?.length),
    pathDefined: Boolean(r.expectedPath),
  });
  // Complex paths must not be collapsed by the last matching character.
  // “先涨后跌/冲高回落” belong to the down family, while
  // “先跌后涨/探底回升” belong to the up family.
  const direction =
    /先涨后跌|冲高回落|震荡下跌|下跌/.test(formal)
      ? "看跌"
      : /先跌后涨|探底回升|震荡上涨|上涨/.test(formal)
        ? "看涨"
        : "中性";

  return normalizeForecastContract({
    id: r.id,
    assetId: canonicalAssetId(canonicalCode),
    assetName: assetDisplayName(canonicalCode, meta.assetName),
    symbol: canonicalCode,
    market: meta.legacyMarket,
    forecastForDate: r.forecastDate,
    tradingSessionLabel: sessionLabelForMarket(meta.legacyMarket),
    publishedAt: r.publishedAt ?? r.generatedAt,
    updatedAt: r.generatedAt,
    publicAt: `${r.forecastDate}T08:00:00+08:00`,
    accessLevel,
    status: r.status === "DRAFT" ? "draft" : "published",
    version: r.version,
    direction,
    directionLabel: formal,
    confidence: Math.max(r.upProbability, r.sidewaysProbability, r.downProbability),
    consensusStars: consensus.stars,
    consensusScore: consensus.score,
    consensusLabel: consensus.label,
    consensusModuleCount: consensus.activeModules,
    consensusNote: consensus.note,
    headline: `${meta.assetName}${formal}`,
    summary: [qimenSummary, normalizeDailyLanguage(r.expectedPath), r.liuyaoEvidence, r.revisionReason].filter(Boolean).join("。"),
    expectedPath: r.expectedPath ? [normalizeDailyLanguage(r.expectedPath)] : [],
    pathBias: normalizeDailyLanguage(r.expectedPath),
    intradayRhythm: r.expectedPath ? [normalizeDailyLanguage(r.expectedPath)] : [],
    signalStrength: signalStrengthFromConfidence(Math.max(r.upProbability, r.sidewaysProbability, r.downProbability)),
    waitForConfirmation: !Boolean(r.supportLevels?.length && r.resistanceLevels?.length && r.confirmationLevel),
    supportLevels: r.supportLevels,
    resistanceLevels: r.resistanceLevels,
    invalidation: r.invalidationLevel ?? undefined,
    confirmation: r.confirmationLevel ?? undefined,
    catalysts: r.catalysts,
    risks: r.risks,
    probabilities: {
      up: r.upProbability,
      flat: r.sidewaysProbability,
      down: r.downProbability,
    },
    qimenEvidence: r.qimenEvidence ?? undefined, // MOOX_QIMEN_DAILY_RESONANCE_V7201_RAW
    liuyaoEvidence: r.liuyaoEvidence || undefined,
    reviewedBy: "weekly-to-daily",
    reviewedAt: r.publishedAt ?? r.generatedAt,
    publishedBy: "weekly-to-daily",
    accuracyEligible: r.status === "LOCKED" || r.status === "PUBLISHED",
  });
}
