import type { KeyDateChartData } from '@/lib/presentation/key-date-chart';
import type { CandleProjection } from './daily-candle-projection-core';

/** User-approved prospective research hypothesis, NOT a teacher publication or order.
 * Prices are the BTCUSDT spot chart's 2026-09-20 reference levels. Dates below
 * allocate an illustrative sequence; they are not divination turning dates.
 */
export const BTC_PULLBACK_REVIEW = {
  id: 'btc-pullback-review-20260920-v1', version: 1,
  publishedAfter: '2026-09-20T11:25:56Z', start: '2026-09-20', end: '2026-10-17',
  trigger: 79500, invalidation: 82300, exhausted: 74967.97,
  phases: [
    { date: '2026-09-26', value: 81478.87 },
    { date: '2026-10-03', value: 79500 },
    { date: '2026-10-10', value: 76888 },
    { date: '2026-10-17', value: 76264 },
  ],
} as const;

export type ResearchScenario = {
  authority: 'RESEARCH_ONLY'; kind: 'BTC_PULLBACK_20260920';
  status: 'CONDITIONAL' | 'SUPPORT_LOST' | 'WITHDRAWN';
  reason: 'USER_REQUEST_20260920'; referenceDate: '2026-09-20';
  revision?: 'BTC_BREAKOUT_20260921_V2';
};

// Prospective editorial withdrawal, not a rewrite of the September 20 source.
// The user reported BTCUSDT above 83,000; do not revive the old path if price
// later falls back below its invalidation level. New candles remain data-driven.
export const BTC_BREAKOUT_REVIEW_AT = '2026-09-21T10:00:00Z';

/** Insert the explicitly labelled hypothesis before the unchanged technical
 * baseline. Fixed expiry and absolute phases prevent a perpetual rolling top.
 * Breached limits withdraw the path instead of forcing a bearish picture.
 */
export function withBtcFourWeekScenario(data: KeyDateChartData, rows: CandleProjection[], now: number): CandleProjection[] {
  const spec = BTC_PULLBACK_REVIEW;
  const today = new Date(now).toISOString().slice(0, 10);
  if (data.stale || data.assetId !== 'btc' || data.quoteSymbol !== 'BTCUSDT' || data.timeZone !== 'UTC'
    || now < Date.parse(spec.publishedAfter) || today > spec.end) return rows;
  const base = rows.find(p => p.level === 'MONTH');
  if (!base?.technical || !base.candles.length) return rows;
  const anchor = base.technical.anchorPrice;
  const closedAfterPublication = data.bars.filter(b => b.timestamp + 86400000 > Date.parse(spec.publishedAfter));
  const revised = now >= Date.parse(BTC_BREAKOUT_REVIEW_AT);
  const withdrawn = revised || anchor >= spec.invalidation || anchor <= spec.exhausted
    || closedAfterPublication.some(b => b.close >= spec.invalidation || b.close <= spec.exhausted);
  const researchScenario: ResearchScenario = {
    authority: 'RESEARCH_ONLY', kind: 'BTC_PULLBACK_20260920',
    status: withdrawn ? 'WITHDRAWN' : data.bars.at(-1)!.close < spec.trigger ? 'SUPPORT_LOST' : 'CONDITIONAL',
    reason: 'USER_REQUEST_20260920', referenceDate: '2026-09-20',
    ...(revised ? { revision: 'BTC_BREAKOUT_20260921_V2' as const } : {}),
  };
  if (withdrawn) return rows.map(p => p === base ? { ...p, sourceId: `${p.sourceId}:${spec.id}:withdrawn`, researchScenario } : p);
  const startTime = Date.parse(`${today}T00:00:00Z`);
  const points = [{ date: today, value: anchor }, ...spec.phases.filter(p => p.date > today)];
  // On the final day there is no remaining phase: only disclose the current anchor.
  const baselineAt = (date: string) => {
    const x = Date.parse(`${date}T00:00:00Z`);
    const right = points.findIndex(p => Date.parse(`${p.date}T00:00:00Z`) >= x);
    if (right <= 0) return right === 0 ? anchor : points.at(-1)!.value;
    const a = points[right - 1]!, b = points[right]!;
    const left = Math.max(startTime, Date.parse(`${a.date}T00:00:00Z`));
    return a.value + (b.value - a.value) * (x - left) / (Date.parse(`${b.date}T00:00:00Z`) - left);
  };
  let previous = anchor;
  const remaining = base.candles.filter(c => c.date <= spec.end);
  const candles = remaining.map((c, i) => {
    const baselineClose = baselineAt(c.date);
    const phaseEnd = spec.phases.some(p => p.date === c.date);
    const residual = i === 0 || i === remaining.length - 1 || phaseEnd ? 0
      : Math.max(-base.atr14 * .25, Math.min(base.atr14 * .25, c.close - c.baselineClose));
    const close = Math.max(1e-8, baselineClose + residual), open = previous;
    previous = close;
    return { ...c, open, close, baselineClose,
      high: Math.max(open, close) + Math.max(0, c.high - Math.max(c.open, c.close)),
      low: Math.max(1e-8, Math.min(open, close) - Math.max(0, Math.min(c.open, c.close) - c.low)),
      rangeLow: baselineClose * c.rangeLow / c.baselineClose,
      rangeHigh: baselineClose * c.rangeHigh / c.baselineClose };
  });
  const scenario: CandleProjection = { ...base, sourceId: spec.id, sourceVersion: spec.version,
    sourcePeriodStart: spec.start, sourcePeriodEnd: spec.end, direction: '先涨后跌',
    dateBasis: 'MODEL_PHASE_ALLOCATION', windows: [], candles, researchScenario };
  return rows.flatMap(p => p === base ? [scenario, p] : [p]);
}
