import type { ForecastPath } from '@/lib/presentation/forecast-path';
import { addChartDays } from '@/lib/presentation/chart-daily-session';
import { ALLOWED_FORMAL_DIRECTIONS } from '@/lib/forecasts/formal-direction';

export const SOURCE_RESEARCH_POLICY = 'source-research-only-20260927' as const;
export type SourceResearch = { policy: typeof SOURCE_RESEARCH_POLICY; assetId: string; asOfDate: string; records: ForecastPath[] };
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;

/** Published/locked paths only. No prices, averaging or direction override. */
export function buildSourceResearch(assetId: string, paths: ForecastPath[], today: string, now: number): SourceResearch {
  const end = addChartDays(today, 27);
  const records = paths.filter(p => p.assetId === assetId && Number.isFinite(Date.parse(p.lockedAt))
    && Date.parse(p.lockedAt) <= now && validDate(p.periodStart) && validDate(p.periodEnd)
    && p.periodStart <= p.periodEnd && p.periodStart <= end && p.periodEnd >= today
    && ALLOWED_FORMAL_DIRECTIONS.includes(p.direction) && Number.isInteger(p.version) && p.version > 0)
    .map(p => ({ id: p.id, assetId: p.assetId, level: p.level, sourceHorizon: p.sourceHorizon,
      direction: p.direction, periodStart: p.periodStart, periodEnd: p.periodEnd, lockedAt: p.lockedAt, version: p.version,
      windows: p.windows.filter(w => w.assetId === assetId && w.evidence === 'EXPLICIT' && validDate(w.focusDate)
        && w.focusDate >= today && w.focusDate <= end && w.focusDate >= p.periodStart && w.focusDate <= p.periodEnd).map(w => ({ ...w })),
      phases: p.phases?.filter(s => validDate(s.periodStart) && validDate(s.periodEnd) && s.periodStart <= s.periodEnd
        && s.periodStart >= p.periodStart && s.periodEnd <= p.periodEnd && s.periodEnd >= today && s.periodStart <= end).map(s => ({ ...s })),
    })).sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.id.localeCompare(b.id));
  return { policy: SOURCE_RESEARCH_POLICY, assetId, asOfDate: today, records };
}

export function researchWindow(research: SourceResearch, level: 'WEEK' | 'MONTH') {
  const start = research.asOfDate, end = addChartDays(start, level === 'WEEK' ? 6 : 27);
  const records = research.records.filter(p => p.periodStart <= end && p.periodEnd >= start);
  const owners = level === 'WEEK' ? records.filter(p => p.level === 'WEEK' || p.sourceHorizon === 'STAGE') : records;
  const gaps: { start: string; end: string }[] = [];
  for (let date = start; date <= end; date = addChartDays(date, 1)) {
    if (owners.some(p => p.periodStart <= date && p.periodEnd >= date)) continue;
    const previous = gaps.at(-1);
    if (previous && addChartDays(previous.end, 1) === date) previous.end = date;
    else gaps.push({ start: date, end: date });
  }
  return { start, end, records, gaps };
}
