/**
 * Helpers for admin long-term forecast charts.
 * Forecast candles are path-derived (direction / targets / ATR), never Math.random.
 */
import type {
  LongTermChartInterval,
  LongTermChartVerificationSummary,
  LongTermForecastCandle,
  LongTermForecastChart,
  LongTermOhlcCandle,
} from "@/types/long-term-forecast-chart";

export function selectForecastInterval(
  forecastStart: string,
  forecastEnd: string
): LongTermChartInterval {
  const start = new Date(`${forecastStart}T00:00:00Z`).getTime();
  const end = new Date(`${forecastEnd}T00:00:00Z`).getTime();
  const months = (end - start) / (30.44 * 24 * 60 * 60 * 1000);
  if (months <= 3) return "week";
  if (months <= 18) return "month";
  return "quarter";
}

export function averageTrueRange(candles: LongTermOhlcCandle[], lookback = 20): number {
  if (!candles.length) return 0;
  const slice = candles.slice(-lookback);
  const ranges = slice.map((c) => Math.max(c.high - c.low, Math.abs(c.high - c.close), Math.abs(c.low - c.close)));
  return ranges.reduce((a, b) => a + b, 0) / ranges.length;
}

/** Deterministic path candle: open→close drift with ATR-bounded wick. */
export function buildPathCandle(input: {
  time: string;
  open: number;
  close: number;
  atr: number;
  interval: LongTermChartInterval;
  scenario: LongTermForecastCandle["scenario"];
  confidence: number;
  pendingReview?: boolean;
}): LongTermForecastCandle {
  const body = Math.abs(input.close - input.open);
  const wick = Math.min(input.atr * 0.55, Math.max(body * 0.8, input.atr * 0.25));
  const high = Math.max(input.open, input.close) + wick * 0.45;
  const low = Math.min(input.open, input.close) - wick * 0.55;
  return {
    time: input.time,
    open: Number(input.open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(input.close.toFixed(2)),
    interval: input.interval,
    scenario: input.scenario,
    isForecast: true,
    confidence: input.confidence,
    pendingReview: input.pendingReview,
  };
}

export function assertScenarioProbabilities(chart: LongTermForecastChart): boolean {
  const sum =
    chart.baseScenario.probability + chart.bullScenario.probability + chart.bearScenario.probability;
  return Math.abs(sum - 100) < 0.01;
}

export function computeLongTermVerificationSummary(input: {
  forecastCandles: LongTermForecastCandle[];
  realizedCandles: LongTermOhlcCandle[];
  targetZones: Array<{ from: number; to: number }>;
  expectedEndBias: "up" | "down" | "flat";
}): LongTermChartVerificationSummary {
  if (!input.realizedCandles.length) {
    return {
      overallDirection: "待验证",
      highTimeDeviation: "待验证",
      lowTimeDeviation: "待验证",
      endPriceDeviationPct: null,
      targetZone: "待验证",
      pathOrder: "待验证",
    };
  }

  const lastForecast = input.forecastCandles[input.forecastCandles.length - 1];
  const lastReal = input.realizedCandles[input.realizedCandles.length - 1];
  const firstForecast = input.forecastCandles[0];
  if (!lastForecast || !lastReal || !firstForecast) {
    return {
      overallDirection: "待验证",
      highTimeDeviation: "待验证",
      lowTimeDeviation: "待验证",
      endPriceDeviationPct: null,
      targetZone: "待验证",
      pathOrder: "待验证",
    };
  }

  const forecastMove = lastForecast.close - firstForecast.open;
  const actualMove = lastReal.close - firstForecast.open;
  const forecastDir = forecastMove > 0 ? "up" : forecastMove < 0 ? "down" : "flat";
  const actualDir = actualMove > 0 ? "up" : actualMove < 0 ? "down" : "flat";
  const overallDirection =
    forecastDir === "flat" || actualDir === "flat"
      ? actualDir === forecastDir
        ? "命中"
        : "待验证"
      : forecastDir === actualDir
        ? "命中"
        : "未命中";

  const forecastLowIdx = input.forecastCandles.reduce(
    (best, c, i, arr) => (c.low < (arr[best]?.low ?? Infinity) ? i : best),
    0
  );
  const realLowIdx = input.realizedCandles.reduce(
    (best, c, i, arr) => (c.low < (arr[best]?.low ?? Infinity) ? i : best),
    0
  );
  const forecastHighIdx = input.forecastCandles.reduce(
    (best, c, i, arr) => (c.high > (arr[best]?.high ?? -Infinity) ? i : best),
    0
  );
  const realHighIdx = input.realizedCandles.reduce(
    (best, c, i, arr) => (c.high > (arr[best]?.high ?? -Infinity) ? i : best),
    0
  );

  const endPriceDeviationPct = Number(
    (((lastReal.close - lastForecast.close) / lastForecast.close) * 100).toFixed(2)
  );

  const hitZone = input.realizedCandles.some((c) =>
    input.targetZones.some((z) => c.low <= z.to && c.high >= z.from)
  );

  return {
    overallDirection,
    highTimeDeviation: `${Math.abs(forecastHighIdx - realHighIdx)}根K`,
    lowTimeDeviation: `${Math.abs(forecastLowIdx - realLowIdx)}根K`,
    endPriceDeviationPct,
    targetZone: hitZone ? "到达" : "未到达",
    pathOrder:
      overallDirection === "命中"
        ? Math.abs(forecastLowIdx - realLowIdx) <= 1
          ? "命中"
          : "部分命中"
        : "未命中",
  };
}
