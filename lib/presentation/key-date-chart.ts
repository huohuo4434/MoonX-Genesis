import type { ChanCandle } from "@/types/chan-execution";
import type { KeyDateRadarItem } from "@/lib/data/key-date-radar-core";
import { keyDateGuidance } from "@/lib/presentation/key-date-guidance";
import { isValidChanCandle } from "@/lib/market-data/chan-market-data-core";

export type ChartWindow = Pick<KeyDateRadarItem, "id" | "assetId" | "symbol" | "startDate" | "endDate" | "focusDate" | "level" | "evidence"> & {
  kind: "strength" | "risk" | "low" | "high" | "watch";
  closed: boolean;
  nextSessionDate: string | null;
};
export function chartWindow(item: KeyDateRadarItem): ChartWindow {
  const guide = keyDateGuidance(item);
  const kind = item.sourceDateType === "上涨候选" ? "strength"
    : item.sourceDateType === "下跌风险" ? "risk"
      : item.sourceDateType === "阶段低点" ? "low"
        : item.sourceDateType === "阶段高点" ? "high"
          : !item.sourceDateType && item.action === "BOTTOM_WATCH" ? "low"
            : !item.sourceDateType && item.action === "TOP_EXIT_WATCH" ? "high" : "watch";
  return { id: item.id, assetId: item.assetId, symbol: item.symbol, startDate: item.startDate,
    endDate: item.endDate, focusDate: item.focusDate, level: item.level, evidence: item.evidence,
    kind, closed: guide.closed, nextSessionDate: guide.nextSessionDate };
}

export type ChartBar = ChanCandle & { date: string };
export type ChartZone = { low: number; high: number; touches: number };
export type KeyDateChartData = {
  assetId: string; quoteSymbol: string; source: string; timeZone: string;
  bars: ChartBar[]; support: ChartZone | null; resistance: ChartZone | null;
  asOf: string; stale: boolean;
};

/** A daily candle is usable only on a later exchange date. No current-session bars. */
export function closedChartBars(candles: ChanCandle[], timeZone: string, now: number): ChartBar[] {
  const date = (timestamp: number) => new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(timestamp));
  const today = date(now);
  return [...new Map(candles.filter(isValidChanCandle).filter(bar => bar.timestamp < now)
    .map(bar => ({ ...bar, date: date(bar.timestamp) })).filter(bar => bar.date < today)
    .sort((a, b) => a.timestamp - b.timestamp).map(bar => [bar.date, bar])).values()].slice(-80);
}

/** Presentation-only daily swing clusters, NOT volume-at-price or trade authority. */
export function chartZones(bars: ChartBar[]): { support: ChartZone | null; resistance: ChartZone | null } {
  if (bars.length < 20) return { support: null, resistance: null };
  const price = bars.at(-1)!.close;
  const recent = bars.slice(-15);
  const atr = recent.slice(1).reduce((sum, bar, i) => sum + Math.max(bar.high - bar.low,
    Math.abs(bar.high - recent[i]!.close), Math.abs(bar.low - recent[i]!.close)), 0) / (recent.length - 1);
  const tolerance = Math.max(atr * 0.35, price * 0.001);
  function clusters(side: "low" | "high") {
    const points: number[] = [];
    for (let i = 2; i < bars.length - 2; i++) {
      const v = bars[i]![side];
      const neighbours = [bars[i - 2]!, bars[i - 1]!, bars[i + 1]!, bars[i + 2]!];
      if (neighbours.every(b => side === "low" ? b.low > v : b.high < v)) points.push(v);
    }
    const zones: ChartZone[] = [];
    for (const point of points.sort((a, b) => a - b)) {
      const last = zones.at(-1);
      if (last && point - last.low <= tolerance) { last.high = point; last.touches++; }
      else zones.push({ low: point, high: point, touches: 1 });
    }
    return zones.filter(z => z.touches >= 2);
  }
  return {
    support: clusters("low").filter(z => z.high < price).sort((a, b) => b.high - a.high)[0] ?? null,
    resistance: clusters("high").filter(z => z.low > price).sort((a, b) => a.low - b.low)[0] ?? null,
  };
}
