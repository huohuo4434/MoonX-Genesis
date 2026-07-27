/**
 * Types for the MoonX Scenario Forecast System — the simulated candlestick
 * visualization that converts curated research conclusions (see
 * `lib/data/intelligence-snapshot.ts`) into a chart.
 *
 * IMPORTANT: every candle produced from these types is **curated scenario
 * data**, not a live or historical market feed. Nothing here should ever be
 * wired to a real price API — see `lib/forecast-candles.ts` for the
 * deterministic (seeded, non-`Math.random`) generation rules.
 */
import type { MoonXFrameworkName } from "@/lib/data/research-intelligence";

export type ChartTimeframe = "4H" | "1D" | "1W";

export type ForecastScenarioId = "base" | "bull" | "bear";

export type CandleKind = "historical" | "forecast";

/** One simulated OHLC bar. `time` is a Unix timestamp in seconds (UTC). */
export interface ForecastCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  kind: CandleKind;
}

/** A single anchor point the deterministic path generator interpolates between. */
export interface ForecastWaypoint {
  /** 0–1 position across the candle range this waypoint set describes. */
  progress: number;
  price: number;
  /** Rendered as a circled marker on the forecast path when true. */
  majorTurningPoint?: boolean;
  /** Short label shown in the marker tooltip, e.g. "Support Test". */
  label?: string;
}

export type PriceLevelKind = "support" | "major-support" | "resistance" | "major-resistance" | "target" | "invalidation";

export interface PriceLevel {
  id: string;
  price: number;
  kind: PriceLevelKind;
  label: string;
  labelZh?: string;
}

export type PriceZoneKind = "consolidation" | "support" | "resistance" | "peak";

export interface PriceZone {
  id: string;
  from: number;
  to: number;
  kind: PriceZoneKind;
  label: string;
  labelZh?: string;
}

export interface TurningWindow {
  id: string;
  label: string;
  labelZh?: string;
  startDate: string;
  endDate: string;
  note?: string;
}

export interface ScenarioPath {
  id: ForecastScenarioId;
  label: string;
  /** One-line summary shown on the scenario selector. */
  summary: string;
  summaryZh?: string;
  waypoints: ForecastWaypoint[];
  /** Fraction of price used as deterministic noise amplitude, e.g. 0.01 = ~1%. */
  volatility: number;
  /** 0–100. Explicitly NOT a statistical probability — labeled "Scenario Weight" in the UI. */
  scenarioWeight: number;
  /** "Base Case Logic" / "Bull Case Trigger" / "Bear Case Trigger" copy. */
  logic: string;
  logicZh?: string;
}

export interface AssetChartScenario {
  id: string;
  asset: string;
  assetZh?: string;
  symbol: string;
  chartTitle: string;
  chartTitleZh?: string;
  forecastWindow: { start: string; end: string };
  /** Approximate price the illustrative historical path leads into. */
  referencePrice: number;
  /** Decimal places shown on the price axis/tooltip. Defaults to 2 when omitted. */
  pricePrecision?: number;
  historicalCandleCount: number;
  forecastCandleCount: number;
  /** Fixed integer seed — output must be identical on every render/refresh. */
  seed: number;
  historicalWaypoints: ForecastWaypoint[];
  historicalVolatility: number;
  levels: PriceLevel[];
  zones: PriceZone[];
  turningWindows: TurningWindow[];
  scenarios: Record<ForecastScenarioId, ScenarioPath>;
  relevantFrameworks: MoonXFrameworkName[];
  currentView: string;
  currentViewZh?: string;
  mainSupport: string;
  mainSupportZh?: string;
  mainResistance: string;
  mainResistanceZh?: string;
  invalidationLevel: string;
  invalidationLevelZh?: string;
  nextTurningWindow: string;
  nextTurningWindowZh?: string;
  keyRisks: string[];
  keyRisksZh?: string[];
  verificationChecklist: string[];
  verificationChecklistZh?: string[];
}

export interface ForecastChartToggles {
  showLevels: boolean;
  showForecastPath: boolean;
  showTurningWindows: boolean;
  showConsolidationZones: boolean;
}
