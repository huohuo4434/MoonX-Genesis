import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { KeyDateRadarItem } from "@/lib/data/key-date-radar-core";
import { normalizeOfficialDirection, ALLOWED_FORMAL_DIRECTIONS, type OfficialDirection } from "@/lib/forecasts/formal-direction";
import { chartWindow, type ChartWindow } from "./key-date-chart";
import { keyDateSourceHorizon } from './key-date-source-horizon';

export type ForecastPath = {
  id: string; assetId: string; level: "MONTH" | "WEEK"; direction: OfficialDirection;
  periodStart: string; periodEnd: string; lockedAt: string; version: number;
  windows: ChartWindow[];
  sourceHorizon?: 'MONTH' | 'WEEK' | 'STAGE';
};
/** The chart does not create or publish a forecast. Unknown/discordant inputs have no curve. */
export function forecastPaths(items: KeyDateRadarItem[], records: ConvictionPeriodForecast[], asOfDate: string): ForecastPath[] {
  const paths: ForecastPath[] = [];
  for (const row of records) {
    if (row.status !== "published" || row.periodEnd < asOfDate
      || !(ALLOWED_FORMAL_DIRECTIONS as readonly string[]).includes(row.direction)) continue;
    const sourceHorizon = keyDateSourceHorizon(row);
    const level = sourceHorizon === 'STAGE' ? 'MONTH' : sourceHorizon;
    if (!level) continue; // Never relabel an annual/monthly fallback as a weekly forecast.
    const matching = items.filter(item => item.assetId === row.assetId && item.level === level && item.sourceIds.includes(row.id));
    if (!matching.length) continue;
    const direction = normalizeOfficialDirection(row.direction);
    // Existing overlays can revise member wording. Do not silently contradict that wording.
    const displayed = matching.map(item => item.primaryView.match(/）：([^。]+)。/)?.[1]).filter(Boolean);
    if (displayed.some(value => normalizeOfficialDirection(value) !== direction)) continue;
    const explicitWindows = (row.keyDates ?? []).filter(key => key.date && key.date >= row.periodStart && key.date <= row.periodEnd)
      .map(key => chartWindow({ ...matching[0]!, id: `${row.id}:${key.date}:${key.type}`, startDate: key.date!, endDate: key.date!,
        focusDate: key.date!, sourceDateType: key.type, evidence: "EXPLICIT" }));
    // Retain passed explicit anchors: a past high must not become another future high on refresh.
    const windows = explicitWindows.length ? explicitWindows : matching.map(chartWindow);
    paths.push({ id: row.id, assetId: row.assetId, level, sourceHorizon: sourceHorizon!, direction, periodStart: row.periodStart,
      periodEnd: row.periodEnd, lockedAt: row.lockedAt, version: row.version, windows });
  }
  return [...new Map(paths.map(path => [`${path.level}:${path.id}`, path])).values()];
}

const patterns: Record<OfficialDirection, number[]> = {
  // Neutral sources specify no ordered turn; historical candle variation is separate.
  上涨: [0, 1], 下跌: [0, -1], 震荡: [0, 0],
  震荡上涨: [0, .55, .25, 1], 震荡下跌: [0, -.55, -.25, -1],
  先涨后跌: [0, 1, 0], 先跌后涨: [0, -1, 0],
};
export type PathGeometry = {
  mode: "DATED" | "SEQUENCE";
  points: { x: number; value: number }[];
  anchor: ChartWindow | null;
  start: string; end: string;
};
const dateMs = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** Unitless scenario geometry: never convert these drawing heights into prices or probabilities.
 * Only one unambiguous explicit source window may pin a turn. Derived dates stay annotations.
 * Without a dated anchor the horizontal axis is phase order, NOT a fabricated calendar date.
 */
export function forecastGeometry(path: ForecastPath, asOfDate: string): PathGeometry {
  const start = path.periodStart > asOfDate ? path.periodStart : asOfDate;
  const end = path.periodEnd;
  const upwardTurn = path.direction === "先跌后涨";
  const downwardTurn = path.direction === "先涨后跌";
  const candidates = path.windows.filter(w => w.evidence === "EXPLICIT"
    && w.focusDate >= path.periodStart && w.focusDate <= end
    && (upwardTurn ? w.kind === "low" || w.kind === "strength"
      : downwardTurn ? w.kind === "high" || w.kind === "risk" : false)
    && (!w.closed || w.nextSessionDate !== null));
  const anchors = [...new Map(candidates.map(w => [`${w.focusDate}:${w.kind}`, w])).values()];
  if (anchors.length === 1 && dateMs(end) > dateMs(start)) {
    const anchor = anchors[0]!;
    const anchorDate = anchor.closed ? anchor.nextSessionDate! : anchor.focusDate;
    if (anchorDate <= end) {
      const x = Math.max(0, (dateMs(anchorDate) - dateMs(start)) / (dateMs(end) - dateMs(start)));
      // A strength/risk START is not a low/high: no invented dip/peak leading into it.
      const extremum = anchor.kind === "low" ? -1 : anchor.kind === "high" ? 1 : 0;
      const tail = upwardTurn ? 1 : -1;
      const points = x === 0 ? [{ x: 0, value: 0 }, { x: 1, value: tail }]
        : [{ x: 0, value: 0 }, { x, value: extremum }, { x: 1, value: extremum + tail }];
      return { mode: "DATED", points: points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x), anchor, start, end };
    }
  }
  const values = patterns[path.direction];
  return { mode: "SEQUENCE", points: values.map((value, index) => ({ x: index / (values.length - 1), value })), anchor: null, start, end };
}
