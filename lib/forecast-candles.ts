/**
 * Deterministic candle generation for the MoonX Scenario Forecast System.
 *
 * Everything here is a pure function of its inputs — no `Math.random`, no
 * `Date.now()`. A `mulberry32` seeded generator supplies "noise" so the
 * simulated path looks organic (pullbacks/rebounds) instead of a straight
 * line, while remaining byte-for-byte identical across refreshes, servers,
 * and builds. This must stay true for the whole chart to be trustworthy as
 * a *simulation*, since it explicitly never touches a live market feed.
 */
import type {
  AssetChartScenario,
  ChartTimeframe,
  ForecastCandle,
  ForecastScenarioId,
  ForecastWaypoint,
} from "@/types/forecast-chart";

/** Small, fast, deterministic PRNG — NOT `Math.random`. Same seed → same sequence, forever. */
function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smoothstep easing so segments between waypoints curve rather than kink. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Interpolates the "clean" scenario path price at a given 0–1 progress value. */
export function interpolateWaypoints(waypoints: ForecastWaypoint[], progress: number): number {
  if (waypoints.length === 0) return 0;
  const sorted = waypoints;
  const first = sorted[0]!;
  if (progress <= first.progress) return first.price;
  const last = sorted[sorted.length - 1]!;
  if (progress >= last.progress) return last.price;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (progress >= a.progress && progress <= b.progress) {
      const span = b.progress - a.progress || 1;
      const t = ease((progress - a.progress) / span);
      return a.price + (b.price - a.price) * t;
    }
  }
  return last.price;
}

export function isoToUnixSeconds(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00.000Z`) / 1000);
}

/** Adds `days` (may be negative) to an ISO date, returning a new ISO date string. */
export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function unixSecondsToIso(time: number): string {
  return new Date(time * 1000).toISOString().slice(0, 10);
}

/** Maps a 0–1 progress value onto a whole-day timestamp between two ISO dates. */
export function dateAtProgress(startDate: string, endDate: string, progress: number): number {
  const startSec = isoToUnixSeconds(startDate);
  const endSec = isoToUnixSeconds(endDate);
  const totalDays = Math.max(1, Math.round((endSec - startSec) / 86400));
  const dayOffset = Math.round(progress * totalDays);
  return startSec + dayOffset * 86400;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface GenerateCandleRangeConfig {
  seed: number;
  count: number;
  startDate: string;
  endDate: string;
  kind: "historical" | "forecast";
  /** Fraction of price used as noise amplitude for each candle's body/wicks. */
  volatility: number;
  waypoints: ForecastWaypoint[];
}

/**
 * Generates `count` OHLC candles that follow `waypoints` with deterministic
 * seeded noise layered on top — realistic-looking pullbacks/rebounds without
 * ever being a genuine market series.
 */
export function generateCandleRange(config: GenerateCandleRangeConfig): ForecastCandle[] {
  const { seed, startDate, endDate, kind, volatility, waypoints } = config;
  const random = createSeededRandom(seed);
  const candles: ForecastCandle[] = [];
  let prevClose = interpolateWaypoints(waypoints, 0);

  // Candle timestamps snap to whole calendar days (see `dateAtProgress`), so
  // requesting more candles than the window has days would force two
  // candles onto the same day — breaking lightweight-charts' strictly
  // ascending time requirement. Clamp to the number of distinct days
  // available; short curated windows (e.g. Gold's 12-day forecast) simply
  // render fewer, still evenly spaced, candles.
  const totalDays = Math.max(1, Math.round((isoToUnixSeconds(endDate) - isoToUnixSeconds(startDate)) / 86400));
  const count = Math.max(1, Math.min(config.count, totalDays + 1));

  for (let i = 0; i < count; i++) {
    const progress = count <= 1 ? 1 : i / (count - 1);
    const time = dateAtProgress(startDate, endDate, progress);
    const basePrice = interpolateWaypoints(waypoints, progress);

    const noise = (random() - 0.5) * 2 * volatility * basePrice;
    const open = prevClose;
    const close = round2(basePrice + noise);
    const wickUp = Math.abs(random()) * volatility * 0.6 * basePrice;
    const wickDown = Math.abs(random()) * volatility * 0.6 * basePrice;
    const high = round2(Math.max(open, close) + wickUp);
    const low = round2(Math.min(open, close) - wickDown);

    candles.push({ time, open: round2(open), high, low, close, kind });
    prevClose = close;
  }

  return candles;
}

/** Aggregates consecutive daily candles into weekly OHLC bars (pure rollup, no new data). */
function aggregateWeekly(candles: ForecastCandle[]): ForecastCandle[] {
  const groupSize = 5;
  const result: ForecastCandle[] = [];
  for (let i = 0; i < candles.length; i += groupSize) {
    const group = candles.slice(i, i + groupSize);
    if (group.length === 0) continue;
    const groupFirst = group[0]!;
    const groupLast = group[group.length - 1]!;
    result.push({
      time: groupFirst.time,
      open: groupFirst.open,
      close: groupLast.close,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      kind: group.some((c) => c.kind === "forecast") ? "forecast" : "historical",
    });
  }
  return result;
}

/** Deterministically splits each daily candle into 4 denser sub-candles (visual density only). */
function splitIntoFourHour(candles: ForecastCandle[], seed: number): ForecastCandle[] {
  const random = createSeededRandom(seed + 777);
  const subCount = 4;
  const step = 86400 / subCount;
  const result: ForecastCandle[] = [];

  for (const candle of candles) {
    const range = Math.max(candle.high - candle.low, candle.close * 0.0005);
    let prevClose = candle.open;

    for (let i = 0; i < subCount; i++) {
      const isLast = i === subCount - 1;
      const time = candle.time + i * step;
      const target = candle.open + ((candle.close - candle.open) * (i + 1)) / subCount;
      const wiggle = (random() - 0.5) * range * 0.3;
      const close = isLast ? candle.close : round2(target + wiggle);
      const open = round2(prevClose);
      const wickUp = Math.abs(random()) * range * 0.2;
      const wickDown = Math.abs(random()) * range * 0.2;
      const high = round2(Math.min(candle.high, Math.max(open, close) + wickUp));
      const low = round2(Math.max(candle.low, Math.min(open, close) - wickDown));

      result.push({ time, open, high: Math.max(high, open, close), low: Math.min(low, open, close), close, kind: candle.kind });
      prevClose = close;
    }
  }

  return result;
}

/**
 * Changes simulated candle *density* only — never implies real intraday or
 * weekly market data. 1D candles are the source of truth; 4H splits each
 * daily bar into 4 deterministic sub-bars, 1W rolls 5 daily bars into 1.
 */
export function resampleCandles(candles: ForecastCandle[], timeframe: ChartTimeframe, seed: number): ForecastCandle[] {
  if (timeframe === "1D") return candles;
  if (timeframe === "1W") return aggregateWeekly(candles);
  return splitIntoFourHour(candles, seed);
}

export interface ForecastPathPoint {
  time: number;
  value: number;
  majorTurningPoint?: boolean;
  label?: string;
}

/**
 * Builds the yellow dashed "expected path" line by connecting waypoints
 * directly (not the noisy candle closes) — literally the swing points the
 * scenario is built from.
 */
/**
 * Plain-language accessibility summary rendered below every chart — the
 * text alternative required alongside the visual: base path, main
 * support/resistance, invalidation, and the forecast window.
 */
export function buildForecastTextAlternative(scenario: AssetChartScenario, scenarioId: ForecastScenarioId): string {
  const scenarioPath = scenario.scenarios[scenarioId];
  return (
    `${scenario.asset} (${scenario.symbol}) — ${scenarioPath.label}: ${scenarioPath.summary} ` +
    `Main support is ${scenario.mainSupport} and main resistance is ${scenario.mainResistance}. ` +
    `The scenario is invalidated by: ${scenario.invalidationLevel}. ` +
    `Forecast window: ${scenario.forecastWindow.start} to ${scenario.forecastWindow.end}. ` +
    `This is a curated simulation, not live market data or financial advice.`
  );
}

export function buildForecastPathPoints(
  waypoints: ForecastWaypoint[],
  startDate: string,
  endDate: string
): ForecastPathPoint[] {
  return waypoints.map((wp) => ({
    time: dateAtProgress(startDate, endDate, wp.progress),
    value: wp.price,
    majorTurningPoint: wp.majorTurningPoint,
    label: wp.label,
  }));
}
