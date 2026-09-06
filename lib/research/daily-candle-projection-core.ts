import { forecastGeometry, type ForecastPath } from "@/lib/presentation/forecast-path";
import { chartZones, type ChartBar, type KeyDateChartData } from "@/lib/presentation/key-date-chart";
import { addChartDays, exchangeDate } from "@/lib/presentation/chart-daily-session";
import { isChartTradingDay, chartCalendarSupported } from "@/lib/presentation/chart-market-calendar";

export const PROJECTION_ENGINE = "conditional-history-shape-v3-coverage";
export type ScenarioCandle = Omit<ChartBar, "volume"> & { volume: null; rangeLow: number; rangeHigh: number; baselineClose: number; morphologyDate: string };
export type CandleProjection = {
  sourceId: string; sourceVersion: number; level: "MONTH" | "WEEK"; direction: string;
  dateBasis: "EXPLICIT_WINDOW" | "MODEL_PHASE_ALLOCATION"; candles: ScenarioCandle[];
  windows: ForecastPath["windows"]; atr14: number; ema60: number | null;
  risk: "NEAR_RESISTANCE" | "BELOW_EMA60" | "NORMAL"; generatedAt: string;
  sourceHorizon?: ForecastPath['sourceHorizon'];
};
export type DailyProjectionData = KeyDateChartData & {
  checkedAt: string; expectedAsOf: string; projectionDate: string; engine: string;
  projections: CandleProjection[]; archiveStatus: "STORED" | "UNAVAILABLE" | "NOT_APPLICABLE";
  archiveId: string | null;
  unavailable?: Partial<Record<'MONTH' | 'WEEK', 'NO_SOURCE' | 'INSUFFICIENT_BARS' | 'CALENDAR' | 'NO_FUTURE_SESSION'>>;
};

export function projectionCoverage(data: KeyDateChartData, paths: ForecastPath[], projections: CandleProjection[], now: number): DailyProjectionData['unavailable'] {
  const result: NonNullable<DailyProjectionData['unavailable']> = {};
  const today = exchangeDate(now, data.timeZone);
  for (const level of ['MONTH', 'WEEK'] as const) {
    if (projections.some(p => p.level === level)) continue;
    const sources = paths.filter(p => p.assetId === data.assetId && p.level === level && p.periodEnd >= today && Date.parse(p.lockedAt) <= now);
    result[level] = !sources.length ? 'NO_SOURCE' : !dailyVolatility(data.bars) ? 'INSUFFICIENT_BARS'
      : !sources.some(p => chartCalendarSupported(data.assetId, p.periodStart > today ? p.periodStart : today)) ? 'CALENDAR' : 'NO_FUTURE_SESSION';
  }
  return result;
}

function ema(bars: ChartBar[], period: number) {
  if (bars.length < period) return null;
  let value = bars.slice(0, period).reduce((sum, b) => sum + b.close, 0) / period;
  for (const bar of bars.slice(period)) value += 2 / (period + 1) * (bar.close - value);
  return value;
}
export function dailyVolatility(bars: ChartBar[]) {
  if (bars.length < 20) return null;
  const tail = bars.slice(-15);
  const atr14 = tail.slice(1).reduce((sum, bar, i) => sum + Math.max(bar.high - bar.low,
    Math.abs(bar.high - tail[i]!.close), Math.abs(bar.low - tail[i]!.close)), 0) / 14;
  return Number.isFinite(atr14) && atr14 > 0 ? { atr14, ema60: ema(bars, 60) } : null;
}
function interpolate(points: { x: number; value: number }[], x: number) {
  const right = points.findIndex(p => p.x >= x);
  if (right <= 0) return right === 0 ? points[0]!.value : points.at(-1)!.value;
  const a = points[right - 1]!, b = points[right]!;
  return a.value + (b.value - a.value) * (x - a.x) / (b.x - a.x);
}
/** RESEARCH_ONLY conditional scenario. OHLC is synthesized using disclosed assumptions,
 * not fitted/validated price predictions. No random candles, outcome scoring or trade signals.
 * Source direction is immutable. Date allocation without an explicit window is a model assumption.
 */
export function projectDailyCandles(data: KeyDateChartData, paths: ForecastPath[], now: number): CandleProjection[] {
  if (data.stale) return [];
  const metrics = dailyVolatility(data.bars);
  if (!metrics) return [];
  const last = data.bars.at(-1)!;
  const today = exchangeDate(now, data.timeZone);
  const start = addChartDays(last.date, 1) > today ? addChartDays(last.date, 1) : today;
  const { support, resistance } = chartZones(data.bars);
  const nearResistance = resistance !== null && resistance.low - last.close <= metrics.atr14;
  const risk: CandleProjection["risk"] = nearResistance ? "NEAR_RESISTANCE" : metrics.ema60 !== null && last.close < metrics.ema60 ? "BELOW_EMA60" : "NORMAL";
  return paths.filter(p => p.assetId === data.assetId && p.periodEnd >= start && Date.parse(p.lockedAt) <= now)
    .map(originalPath => {
      // Shared source presentation may carry an older calendar. Re-derive only the
      // research trading-day annotation, retaining the original dated evidence.
      const path = { ...originalPath, windows: originalPath.windows.map(window => {
        if (!chartCalendarSupported(data.assetId, window.focusDate)) return window;
        const closed = !isChartTradingDay(data.assetId, window.focusDate);
        let next = window.focusDate;
        if (closed) do { next = addChartDays(next, 1); } while (chartCalendarSupported(data.assetId, next) && !isChartTradingDay(data.assetId, next));
        return { ...window, closed, nextSessionDate: closed && chartCalendarSupported(data.assetId, next) ? next : null };
      }) };
      const first = start > path.periodStart ? start : path.periodStart;
      const dates: string[] = [];
      for (let date = first, n = 0; date <= path.periodEnd && n < 40; date = addChartDays(date, 1), n++) {
        if (!chartCalendarSupported(data.assetId, date)) break;
        if (isChartTradingDay(data.assetId, date)) dates.push(date);
      }
      // Freeze undated phase allocation against original period, never restart its first leg daily.
      const whole = forecastGeometry(path, path.periodStart);
      const geometry = whole.mode === "DATED" ? forecastGeometry(path, last.date) : whole;
      const span = Math.max(86_400_000, Date.parse(geometry.end) - Date.parse(geometry.start));
      const progress = (date: string) => Math.max(0, Math.min(1, (Date.parse(date) - Date.parse(geometry.start)) / span));
      const baseline = interpolate(geometry.points, progress(last.date));
      const totalSessions = Math.min(30, Math.max(1, Math.round((Date.parse(path.periodEnd) - Date.parse(path.periodStart)) / 86_400_000)));
      // A transparent volatility scale, NOT a calibrated expected return.
      const scale = metrics.atr14 / last.close * Math.sqrt(totalSessions);
      // Replay a consecutive, already-closed shape sample, NOT its trend or dates.
      // Detrend the sample and pin its endpoint to the unchanged central scenario.
      // ponytail: one transparent sample, not a calibrated distribution of futures.
      const sample = data.bars.slice(-(dates.length + 1));
      const shapes = dates.map((_, i) => sample[1 + i % (sample.length - 1)]!);
      const returns = shapes.map((bar, i) => Math.log(bar.close / sample[i % (sample.length - 1)]!.close));
      const drift = returns.reduce((sum, r) => sum + r, 0) / Math.max(1, returns.length);
      let residual = 0;
      let previous = last.close;
      const candles = dates.map((date, i): ScenarioCandle => {
        let move = (interpolate(geometry.points, progress(date)) - baseline) * scale;
        if (move > 0 && (nearResistance || risk === "BELOW_EMA60")) move *= .6;
        if (move < 0 && support && last.close - support.high <= metrics.atr14) move *= .6;
        const baselineClose = last.close * Math.exp(Math.max(-.7, Math.min(.7, move)));
        residual += returns[i]! - drift;
        const datedAnchor = path.windows.some(w => w.evidence === "EXPLICIT" && (w.closed ? w.nextSessionDate : w.focusDate) === date);
        const cap = .75 * metrics.atr14;
        const offset = i === dates.length - 1 || datedAnchor ? 0 : cap * Math.tanh(residual * last.close / Math.max(cap, 1e-9));
        const close = Math.max(.00000001, baselineClose + offset);
        const shape = shapes[i]!;
        const prior = sample[i % (sample.length - 1)]!;
        const gapCap = metrics.atr14 * .5;
        const gap = data.timeZone === "UTC" || i === 0 ? 0 : Math.max(-gapCap, Math.min(gapCap, previous * (shape.open / prior.close - 1)));
        const open = Math.max(.00000001, previous + gap);
        previous = close;
        const upper = Math.max(.05 * metrics.atr14, Math.min(1.5 * metrics.atr14, (shape.high - Math.max(shape.open, shape.close)) / shape.close * close));
        const lower = Math.max(.05 * metrics.atr14, Math.min(1.5 * metrics.atr14, (Math.min(shape.open, shape.close) - shape.low) / shape.close * close));
        const spread = metrics.atr14 / last.close * Math.sqrt(i + 1);
        return { date, timestamp: Date.parse(`${date}T00:00:00Z`), open, close,
          high: Math.max(open, close) + upper, low: Math.max(.00000001, Math.min(open, close) - lower), volume: null,
          baselineClose, morphologyDate: shape.date,
          rangeLow: baselineClose * Math.exp(-spread), rangeHigh: baselineClose * Math.exp(spread) };
      });
      return { sourceId: path.id, sourceVersion: path.version, level: path.level, sourceHorizon: path.sourceHorizon, direction: path.direction,
        dateBasis: whole.mode === "DATED" ? "EXPLICIT_WINDOW" as const : "MODEL_PHASE_ALLOCATION" as const,
        candles, windows: path.windows, ...metrics, risk, generatedAt: new Date(now).toISOString() };
    }).filter(p => p.candles.length > 0);
}
