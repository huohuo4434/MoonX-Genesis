/**
 * Admin-only long-term forecast candlestick chart types.
 * Never serialize onto public/member HTML or public APIs.
 */

export type LongTermChartInterval = "week" | "month" | "quarter";
export type LongTermChartScenarioId = "base" | "bull" | "bear";
export type LongTermChartViewMode = "forecast_only" | "compare" | "actual_only";

export type LongTermOhlcCandle = {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
};

export type LongTermForecastCandle = LongTermOhlcCandle & {
  interval: LongTermChartInterval;
  scenario: LongTermChartScenarioId;
  isForecast: true;
  confidence: number;
  /** Post-review gate — render with lower opacity; not confirmed MoonX path. */
  pendingReview?: boolean;
};

export type LongTermChartMarker = {
  id: string;
  time: string;
  kind:
    | "forecast_start"
    | "high_window"
    | "low_window"
    | "target_zone"
    | "invalidation"
    | "pending_review"
    | "actual_verify";
  label: string;
  detail?: string;
  price?: number;
};

export type LongTermChartScenarioBundle = {
  scenario: LongTermChartScenarioId;
  probability: number;
  candles: LongTermForecastCandle[];
  targetZones: Array<{ id: string; from: number; to: number; label: string }>;
  turningWindows: Array<{ id: string; start: string; end: string; label: string }>;
  invalidationLevel: number | null;
};

export type LongTermChartVerificationSummary = {
  overallDirection: "命中" | "未命中" | "待验证";
  highTimeDeviation: string;
  lowTimeDeviation: string;
  endPriceDeviationPct: number | null;
  targetZone: "到达" | "未到达" | "待验证";
  pathOrder: "命中" | "部分命中" | "未命中" | "待验证";
};

export type LongTermForecastChartVersion = {
  version: number;
  savedAt: string;
  reason: string;
  chart: Omit<LongTermForecastChart, "versions">;
};

export type LongTermForecastChart = {
  enabled: boolean;
  generatedAt: string;
  forecastStart: string;
  forecastEnd: string;
  interval: LongTermChartInterval;
  anchorPrice: number;
  priceDataSource: string;
  priceMode: "absolute" | "relative";
  relativeIndexNote?: string;
  actualCandles: LongTermOhlcCandle[];
  /** Live overlays after forecast start — never mutate locked forecast candles. */
  realizedCandles?: LongTermOhlcCandle[];
  baseScenario: LongTermChartScenarioBundle;
  bullScenario: LongTermChartScenarioBundle;
  bearScenario: LongTermChartScenarioBundle;
  markers: LongTermChartMarker[];
  turningWindows: Array<{ id: string; start: string; end: string; label: string }>;
  targetZones: Array<{ id: string; from: number; to: number; label: string }>;
  invalidationLevel: number | null;
  locked: boolean;
  version: number;
  versions?: LongTermForecastChartVersion[];
  verificationSummary?: LongTermChartVerificationSummary;
};
