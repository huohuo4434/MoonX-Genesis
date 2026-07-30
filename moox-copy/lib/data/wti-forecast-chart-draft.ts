/**
 * Locked V1 forecast chart draft for INT-WTI-20260807-20270204-EXT-001.
 * Historical OHLC from Yahoo CL=F monthly; forecast path derived from research stages + ATR.
 */
import { averageTrueRange, buildPathCandle } from "@/lib/research/long-term-forecast-chart";
import type {
  LongTermForecastCandle,
  LongTermForecastChart,
  LongTermOhlcCandle,
} from "@/types/long-term-forecast-chart";

export const WTI_EXT_FORECAST_CHART_RECORD_ID = "INT-WTI-20260807-20270204-EXT-001";

/** Last 36 monthly bars before forecast start (Yahoo CL=F). */
const ACTUAL_MONTHLY: LongTermOhlcCandle[] = [
  { time: "2023-02-01", open: 79.06, high: 80.62, low: 72.25, close: 77.05 },
  { time: "2023-03-01", open: 76.85, high: 80.94, low: 64.12, close: 75.67 },
  { time: "2023-04-01", open: 80.1, high: 83.53, low: 73.93, close: 76.78 },
  { time: "2023-05-01", open: 76.66, high: 76.69, low: 63.64, close: 68.09 },
  { time: "2023-06-01", open: 67.6, high: 75.06, low: 66.8, close: 70.64 },
  { time: "2023-07-01", open: 70.45, high: 82, low: 69.69, close: 81.8 },
  { time: "2023-08-01", open: 81.73, high: 84.89, low: 77.59, close: 83.63 },
  { time: "2023-09-01", open: 83.63, high: 95.03, low: 83.46, close: 90.79 },
  { time: "2023-11-01", open: 81.48, high: 83.6, low: 72.16, close: 75.96 },
  { time: "2023-12-01", open: 75.59, high: 76.76, low: 67.71, close: 71.65 },
  { time: "2024-01-01", open: 71.71, high: 79.29, low: 69.28, close: 75.85 },
  { time: "2024-02-01", open: 75.96, high: 79.8, low: 71.41, close: 78.26 },
  { time: "2024-03-01", open: 78.28, high: 83.85, low: 76.79, close: 83.17 },
  { time: "2024-04-01", open: 83.14, high: 87.67, low: 80.88, close: 81.93 },
  { time: "2024-05-01", open: 81.48, high: 81.57, low: 76.15, close: 76.99 },
  { time: "2024-06-01", open: 76.97, high: 82.72, low: 72.48, close: 81.54 },
  { time: "2024-07-01", open: 81.45, high: 84.52, low: 74.59, close: 77.91 },
  { time: "2024-08-01", open: 78.59, high: 80.16, low: 71.46, close: 73.55 },
  { time: "2024-10-01", open: 68.41, high: 78.46, low: 66.33, close: 69.26 },
  { time: "2024-11-01", open: 70.44, high: 72.88, low: 66.61, close: 68 },
  { time: "2025-01-01", open: 71.85, high: 80.77, low: 71.79, close: 72.53 },
  { time: "2025-02-01", open: 74.14, high: 75.18, low: 68.36, close: 69.76 },
  { time: "2025-03-01", open: 69.95, high: 71.83, low: 65.22, close: 71.48 },
  { time: "2025-04-01", open: 71.39, high: 72.28, low: 55.12, close: 58.21 },
  { time: "2025-05-01", open: 58.16, high: 64.19, low: 55.3, close: 60.79 },
  { time: "2025-07-01", open: 64.96, high: 70.51, low: 64.67, close: 69.26 },
  { time: "2025-08-01", open: 69.35, high: 69.58, low: 61.94, close: 64.01 },
  { time: "2025-09-01", open: 63.95, high: 66.42, low: 61.45, close: 62.37 },
  { time: "2025-10-01", open: 62.46, high: 62.92, low: 56.35, close: 60.98 },
  { time: "2025-11-01", open: 61.4, high: 61.5, low: 57.1, close: 58.55 },
  { time: "2025-12-01", open: 58.96, high: 60.5, low: 54.98, close: 57.42 },
  { time: "2026-01-01", open: 57.41, high: 66.48, low: 55.76, close: 65.21 },
  { time: "2026-04-01", open: 101.72, high: 117.63, low: 80.56, close: 105.07 },
  { time: "2026-05-01", open: 105.14, high: 109.47, low: 86.35, close: 87.36 },
  { time: "2026-06-01", open: 88.5, high: 97, low: 68.56, close: 69.5 },
  { time: "2026-07-01", open: 69.98, high: 93.5, low: 67.04, close: 89.31 },
];

const ANCHOR = 81.02; // last Yahoo session close before forecastStart (2026-07-28)
const ATR = averageTrueRange(ACTUAL_MONTHLY, 20);

function scenarioCloses(
  kind: "base" | "bull" | "bear"
): Array<{ time: string; close: number; pendingReview?: boolean; confidence: number }> {
  // Path from research: Aug–Oct range-down to 65–80; Oct low; Nov–Dec re-rally pending; year-end fade pending.
  if (kind === "base") {
    return [
      { time: "2026-08-01", close: 76.5, confidence: 62 },
      { time: "2026-09-01", close: 72.8, confidence: 60 },
      { time: "2026-10-01", close: 69.5, confidence: 58 },
      { time: "2026-11-01", close: 74.2, pendingReview: true, confidence: 42 },
      { time: "2026-12-01", close: 78.0, pendingReview: true, confidence: 40 },
      { time: "2027-01-01", close: 73.5, pendingReview: true, confidence: 38 },
      { time: "2027-02-01", close: 70.0, pendingReview: true, confidence: 36 },
    ];
  }
  if (kind === "bull") {
    return [
      { time: "2026-08-01", close: 78.8, confidence: 55 },
      { time: "2026-09-01", close: 76.2, confidence: 52 },
      { time: "2026-10-01", close: 74.0, confidence: 50 },
      { time: "2026-11-01", close: 82.5, pendingReview: true, confidence: 45 },
      { time: "2026-12-01", close: 90.0, pendingReview: true, confidence: 42 },
      { time: "2027-01-01", close: 84.0, pendingReview: true, confidence: 38 },
      { time: "2027-02-01", close: 78.5, pendingReview: true, confidence: 35 },
    ];
  }
  return [
    { time: "2026-08-01", close: 74.0, confidence: 55 },
    { time: "2026-09-01", close: 69.5, confidence: 52 },
    { time: "2026-10-01", close: 66.0, confidence: 50 },
    { time: "2026-11-01", close: 68.5, pendingReview: true, confidence: 40 },
    { time: "2026-12-01", close: 71.0, pendingReview: true, confidence: 38 },
    { time: "2027-01-01", close: 67.5, pendingReview: true, confidence: 36 },
    { time: "2027-02-01", close: 64.5, pendingReview: true, confidence: 34 },
  ];
}

function buildScenarioCandles(kind: "base" | "bull" | "bear"): LongTermForecastCandle[] {
  const points = scenarioCloses(kind);
  const out: LongTermForecastCandle[] = [];
  let open = ANCHOR;
  for (const p of points) {
    const candle = buildPathCandle({
      time: p.time,
      open,
      close: p.close,
      atr: ATR,
      interval: "month",
      scenario: kind,
      confidence: p.confidence,
      pendingReview: p.pendingReview,
    });
    out.push(candle);
    open = p.close;
  }
  return out;
}

const targetZones = [
  { id: "zone-65-80", from: 65, to: 80, label: "65–80目标区" },
];

const turningWindows = [
  { id: "oct-low", start: "2026-10-01", end: "2026-10-31", label: "低点窗口" },
  { id: "nov-dec", start: "2026-11-01", end: "2026-12-31", label: "高点窗口" },
  { id: "pending", start: "2026-11-01", end: "2027-02-04", label: "待复核阶段" },
];

export function buildWtiExtForecastChartV1(): LongTermForecastChart {
  const baseCandles = buildScenarioCandles("base");
  const bullCandles = buildScenarioCandles("bull");
  const bearCandles = buildScenarioCandles("bear");

  return {
    enabled: true,
    generatedAt: "2026-07-28T21:30:00+08:00",
    forecastStart: "2026-08-07",
    forecastEnd: "2027-02-04",
    interval: "month",
    anchorPrice: ANCHOR,
    priceDataSource: "yahoo-finance:CL=F:1mo",
    priceMode: "absolute",
    actualCandles: ACTUAL_MONTHLY,
    realizedCandles: [],
    baseScenario: {
      scenario: "base",
      probability: 55,
      candles: baseCandles,
      targetZones,
      turningWindows,
      invalidationLevel: 95,
    },
    bullScenario: {
      scenario: "bull",
      probability: 25,
      candles: bullCandles,
      targetZones: [{ id: "zone-prior-high", from: 90, to: 110, label: "偏强再升温区" }],
      turningWindows,
      invalidationLevel: 62,
    },
    bearScenario: {
      scenario: "bear",
      probability: 20,
      candles: bearCandles,
      targetZones: [{ id: "zone-deep", from: 60, to: 70, label: "偏弱低位区" }],
      turningWindows,
      invalidationLevel: 85,
    },
    markers: [
      {
        id: "start",
        time: "2026-08-01",
        kind: "forecast_start",
        label: "预测起点",
        detail: `锚定价 ${ANCHOR}（发布前最后真实收盘）`,
        price: ANCHOR,
      },
      {
        id: "oct-low",
        time: "2026-10-01",
        kind: "low_window",
        label: "低点窗口",
        detail: "10月附近阶段低点观察",
      },
      {
        id: "pending",
        time: "2026-11-01",
        kind: "pending_review",
        label: "待六爻复核情景",
        detail: "10月以后不得作为已确认MoonX路径",
      },
      {
        id: "target",
        time: "2026-10-01",
        kind: "target_zone",
        label: "目标区间",
        detail: "65–80美元",
        price: 72.5,
      },
      {
        id: "invalidation",
        time: "2026-08-01",
        kind: "invalidation",
        label: "失效价位",
        detail: "基准情景失效参考 95",
        price: 95,
      },
    ],
    turningWindows,
    targetZones,
    invalidationLevel: 95,
    locked: true,
    version: 1,
    verificationSummary: {
      overallDirection: "待验证",
      highTimeDeviation: "待验证",
      lowTimeDeviation: "待验证",
      endPriceDeviationPct: null,
      targetZone: "待验证",
      pathOrder: "待验证",
    },
  };
}
