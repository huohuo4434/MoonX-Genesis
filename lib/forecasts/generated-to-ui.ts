/**
 * Map GeneratedDailyForecastRecord → UI DailyForecast.
 */
import { sessionLabelForMarket } from "@/lib/calendar/next-trading-day";
import { marketMeta } from "@/lib/forecasts/weekly-to-daily";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type { DailyForecast } from "@/types/daily-forecast";

export function generatedDailyToUi(
  r: GeneratedDailyForecastRecord,
  accessLevel: "public" | "member" = "member"
): DailyForecast {
  const meta = marketMeta(r.marketCode);
  const assetIdMap: Record<string, string> = {
    BTC: "bitcoin",
    SPX: "sp500",
    NDX: "nasdaq-100",
    SHCOMP: "shanghai-composite",
    HSTECH: "hang-seng",
    GLD: "gold",
    WTI: "wti-crude",
  };
  const formal = r.direction;
  // Complex paths must not be collapsed by the last matching character.
  // “先涨后跌/冲高回落” belong to the down family, while
  // “先跌后涨/探底回升” belong to the up family.
  const direction =
    /先涨后跌|冲高回落|震荡下跌|下跌/.test(formal)
      ? "看跌"
      : /先跌后涨|探底回升|震荡上涨|上涨/.test(formal)
        ? "看涨"
        : "中性";

  return {
    id: r.id,
    assetId: assetIdMap[r.marketCode] ?? r.marketCode.toLowerCase(),
    assetName: meta.assetName,
    symbol: r.marketCode === "SHCOMP" ? "000001.SS" : r.marketCode,
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
    headline: `${meta.assetName}${formal}`,
    summary: [r.expectedPath, r.liuyaoEvidence, r.revisionReason].filter(Boolean).join("。"),
    expectedPath: r.expectedPath ? [r.expectedPath] : [],
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
    reviewedBy: "weekly-to-daily",
    reviewedAt: r.publishedAt ?? r.generatedAt,
    publishedBy: "weekly-to-daily",
    accuracyEligible: r.status === "LOCKED" || r.status === "PUBLISHED",
  };
}
