import { buildMemberKeyDateRadar, keyDateChartForecasts } from '@/lib/data/member-key-date-radar';
import { forecastPaths } from '@/lib/presentation/forecast-path';
import { addChartDays } from '@/lib/presentation/chart-daily-session';

/** Future weekly periods may be used only if already published NOW. Never advance
 * the publication cutoff with the horizon, and never extend today's monthly source. */
export function horizonForecastPaths(today: string, now: number) {
  const paths = [0, 7, 14, 21, 27].flatMap(offset => {
    const date = addChartDays(today, offset);
    const items = buildMemberKeyDateRadar(date);
    return forecastPaths(items, keyDateChartForecasts(items, now), date)
      .filter(p => offset === 0 || p.level === 'WEEK');
  });
  return [...new Map(paths.map(p => [p.id, p])).values()];
}
