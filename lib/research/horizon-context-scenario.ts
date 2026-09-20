import type { ForecastPath } from '@/lib/presentation/forecast-path';
import type { KeyDateChartData } from '@/lib/presentation/key-date-chart';
import { addChartDays, exchangeDate } from '@/lib/presentation/chart-daily-session';
import { projectDailyCandles, type CandleProjection } from './daily-candle-projection-core';

export type HorizonContext = {
  authority: 'RESEARCH_ONLY'; kind: 'SOURCE_PHASES_V1';
  sourceId: string; sourceVersion: number; originalStart: string; originalEnd: string;
  requestedEnd: string; coverageEnd: string; partial: boolean; technicalDirection: string;
  phases: { start: string; end: string; direction: string; sourceId: string; version: number }[];
};
const recent = (a: ForecastPath, b: ForecastPath) => Date.parse(b.lockedAt) - Date.parse(a.lockedAt) || b.version - a.version || a.id.localeCompare(b.id);

/** Horizon context is separate from the selectable momentum baseline. Official
 * sources own phase direction; closed prices/ATR/pivots own price scale and wicks.
 * Does not publish a new teacher forecast and is never an order input. */
export function withHorizonContext(data: KeyDateChartData, rows: CandleProjection[], sources: ForecastPath[], now: number): CandleProjection[] {
  if (data.stale || rows.some(r => r.researchScenario)) return rows; // Preserve the separately approved BTC review.
  const base = rows.find(r => r.level === 'MONTH' && r.technical);
  if (!base?.technical || !base.candles.length) return rows;
  const today = exchangeDate(now, data.timeZone), end = addChartDays(today, 27);
  const eligible = sources.filter(s => s.assetId === data.assetId && Date.parse(s.lockedAt) <= now && s.periodStart <= end && s.periodEnd >= today);
  const source = eligible.filter(s => s.level === 'MONTH' && s.periodStart <= today).sort(recent)[0];
  if (!source) return rows;
  const coverageEnd = source.periodEnd < end ? source.periodEnd : end;
  const phasePaths: ForecastPath[] = (source.phases ?? []).map((p, index) => ({ ...source, ...p,
    id: `${source.id}:phase:${index}`, phases: undefined,
    windows: source.windows.filter(w => w.focusDate >= p.periodStart && w.focusDate <= p.periodEnd) }));
  const weeks = eligible.filter(s => s.level === 'WEEK').sort(recent);
  // Narrower structured phases supersede broad months, independent weeks first.
  phasePaths.sort((a, b) => (Date.parse(a.periodEnd) - Date.parse(a.periodStart)) - (Date.parse(b.periodEnd) - Date.parse(b.periodStart)) || recent(a, b));
  const candidates = [...weeks, ...phasePaths, source];
  const anchor = base.technical.anchorPrice;
  const curves = new Map(candidates.map(p => [p.id, projectDailyCandles(data, [p], now, anchor)[0]]));
  const phases: HorizonContext['phases'] = [];
  let previous = anchor, baseline = anchor;
  const candles = base.candles.filter(c => c.date <= coverageEnd).map((c, index, all) => {
    const selected = candidates.find(p => p.periodStart <= c.date && p.periodEnd >= c.date && curves.get(p.id)?.candles.some(b => b.date === c.date))!;
    const curve = curves.get(selected.id)!;
    const n = curve.candles.findIndex(b => b.date === c.date);
    const step = curve.candles[n]!;
    const prior = n === 0 ? anchor : curve.candles[n - 1]!.baselineClose;
    // Integrate local phase increments, not absolute paths: phase changes cannot
    // reset price to the starting quote or replay an already elapsed peak.
    baseline *= step.baselineClose / prior;
    const offset = index === all.length - 1 ? 0 : Math.max(-.5 * base.atr14, Math.min(.5 * base.atr14, step.close - step.baselineClose));
    const close = Math.max(1e-8, baseline + offset), open = previous;
    previous = close;
    const phase = phases.at(-1);
    if (phase?.sourceId === selected.id) phase.end = c.date;
    else phases.push({ start: c.date, end: c.date, direction: selected.direction, sourceId: selected.id, version: selected.version });
    return { ...c, open, close, baselineClose: baseline, morphologyDate: step.morphologyDate,
      high: Math.max(open, close) + Math.max(.05 * base.atr14, step.high - Math.max(step.open, step.close)),
      low: Math.max(1e-8, Math.min(open, close) - Math.max(.05 * base.atr14, Math.min(step.open, step.close) - step.low)),
      rangeLow: baseline * c.rangeLow / c.baselineClose, rangeHigh: baseline * c.rangeHigh / c.baselineClose };
  });
  if (!candles.length) return rows;
  const context: HorizonContext = { authority: 'RESEARCH_ONLY', kind: 'SOURCE_PHASES_V1', sourceId: source.id, sourceVersion: source.version,
    originalStart: source.periodStart, originalEnd: source.periodEnd, requestedEnd: end, coverageEnd, partial: coverageEnd < end,
    technicalDirection: base.direction, phases };
  const scenario: CandleProjection = { ...base, sourceId: `horizon-v1:${source.id}:${source.version}:${today}:${phases.map(p => `${p.sourceId}-v${p.version}`).join('|')}`,
    sourceVersion: source.version, direction: source.direction, sourceHorizon: source.sourceHorizon, sourcePeriodStart: today, sourcePeriodEnd: coverageEnd,
    dateBasis: 'MODEL_PHASE_ALLOCATION', candles, horizonContext: context,
    windows: [...new Map(candidates.flatMap(p => p.windows).filter(w => w.focusDate >= today && w.focusDate <= coverageEnd).map(w => [w.id, w])).values()] };
  return rows.flatMap(r => r === base ? [scenario, r] : [r]);
}
