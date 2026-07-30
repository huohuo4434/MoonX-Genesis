/** Minimal multi-horizon forecast presentation types for homepage structure. */

export type ForecastHorizon = "strategic" | "tactical" | "execution";

export type ForecastDirection =
  | "strong_bullish"
  | "bullish"
  | "slightly_bullish"
  | "neutral"
  | "slightly_bearish"
  | "bearish"
  | "strong_bearish"
  | "pending";

export interface ForecastLayer {
  horizon: ForecastHorizon;
  periodStart?: string;
  periodEnd?: string;
  direction: ForecastDirection;
  /** Optional Chinese/English label overriding the generic direction key. */
  directionLabelZhCN?: string;
  directionLabelEn?: string;
  summaryZhCN: string;
  summaryEn: string;
  confidenceLabel?: "low" | "medium" | "high";
  keyDates?: string[];
  supportLevels?: string[];
  resistanceLevels?: string[];
  confirmation?: string;
  confirmationZhCN?: string;
  invalidation?: string;
  invalidationZhCN?: string;
  updatedAt: string;
}

export interface AssetForecastSummary {
  assetId: string;
  symbol: string;
  nameZhCN: string;
  nameEn: string;
  direction: ForecastDirection;
  layers: ForecastLayer[];
  nextObservation?: string;
  updatedAt: string;
  detailHref: string;
  status: "active" | "pending";
}
