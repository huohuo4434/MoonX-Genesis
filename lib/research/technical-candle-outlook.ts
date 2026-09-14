import { ema } from '@/lib/market-data/ema-core';
import { isValidChanCandle } from '@/lib/market-data/chan-market-data-core';
import { chartLevelLadder, type KeyDateChartData, type ChartZone } from '@/lib/presentation/key-date-chart';
import { addChartDays, exchangeDate } from '@/lib/presentation/chart-daily-session';
import { chartCalendarSupported, isChartTradingDay } from '@/lib/presentation/chart-market-calendar';
import type { ForecastPath } from '@/lib/presentation/forecast-path';
import type { ChanCandle } from '@/types/chan-execution';
import { dailyVolatility, projectDailyCandles, type CandleProjection } from './daily-candle-projection-core';

export type IntradayContext = { source: string; candles: ChanCandle[] };
type TechnicalFrame = { score: number; close: number; ema20: number; ema60: number; dif: number; dea: number; histogram: number; histogramChange: number; through: string };
export type TechnicalOutlook = {
  authority: 'RESEARCH_ONLY'; revisionReason: 'TECHNICAL_FIRST_POLICY_20260915';
  daily: TechnicalFrame; fourHour: TechnicalFrame | null; intradayStatus: 'CURRENT' | 'UNAVAILABLE' | 'NOT_APPLICABLE';
  intradaySource: string | null; anchorPrice: number; technicalScore: number;
  support: ChartZone | null; resistance: ChartZone | null; nearResistance: boolean; nearSupport: boolean;
  timingSources: { id: string; version: number; direction: string }[];
};
const clamp = (v: number, cap = 1) => Math.max(-cap, Math.min(cap, v));

/** Heuristic, not a calibrated probability. EMA60 trend, EMA20 slope, MACD,
 * five-bar displacement and prior-20-bar breakout; no analyst/news direction input. */
export function technicalFrame(bars: ChanCandle[], duration: number): TechnicalFrame | null {
  if (bars.length < 65 || bars.some((b, i) => !isValidChanCandle(b) || (i > 0 && b.timestamp <= bars[i - 1]!.timestamp))) return null;
  const closes = bars.map(b => b.close);
  const slow = ema(closes, 60), fast = ema(closes, 20);
  const e12 = ema(closes, 12), e26 = ema(closes, 26);
  const difs = e12.map((v, i) => v - e26[i]!).slice(25);
  const deas = ema(difs, 9);
  const last = bars.at(-1)!;
  const atr = bars.slice(-14).reduce((sum, b, i) => {
    const prev = bars[bars.length - 15 + i]!.close;
    return sum + Math.max(b.high - b.low, Math.abs(b.high - prev), Math.abs(b.low - prev));
  }, 0) / 14;
  if (!Number.isFinite(atr) || atr <= 0) return null;
  const dif = difs.at(-1)!, dea = deas.at(-1)!, histogram = dif - dea;
  const histogramChange = histogram - (difs.at(-2)! - deas.at(-2)!);
  const prior = bars.slice(-21, -1);
  const breakout = last.close > Math.max(...prior.map(b => b.high)) ? 1 : last.close < Math.min(...prior.map(b => b.low)) ? -1 : 0;
  const score = (2 * clamp((last.close - slow.at(-1)!) / atr)
    + clamp((fast.at(-1)! - fast.at(-4)!) / atr)
    + clamp(dif / atr * 2) + clamp(histogram / atr * 4)
    + clamp((last.close - bars.at(-6)!.close) / (2 * atr)) + 2 * breakout) / 8;
  return { score, close: last.close, ema20: fast.at(-1)!, ema60: slow.at(-1)!, dif, dea, histogram, histogramChange,
    through: new Date(last.timestamp + duration).toISOString() };
}

/** New prospective research version only. Never mutates source publications or order authority.
 * Explicit metaphysical windows can attenuate/shape at most 0.15 ATR locally;
 * they cannot set direction or manufacture a turn/date. */
export function projectTechnicalCandles(data: KeyDateChartData, sources: ForecastPath[], now: number, intraday?: IntradayContext | null): CandleProjection[] {
  if (data.stale || data.bars.some(b => b.timestamp >= now)) return [];
  const daily = technicalFrame(data.bars, 86_400_000);
  const metrics = dailyVolatility(data.bars);
  if (!daily || !metrics) return [];
  const crypto = ['btc', 'eth', 'sol', 'hype'].includes(data.assetId);
  const duration = 4 * 3_600_000;
  const expected4h = Math.floor(now / duration) * duration;
  const closed4h = crypto ? (intraday?.candles ?? []).filter(b => b.timestamp % duration === 0 && b.timestamp + duration <= now) : [];
  const usable4h = closed4h.at(-1)?.timestamp === expected4h - duration
    && closed4h.slice(1).every((b, i) => b.timestamp - closed4h[i]!.timestamp === duration);
  const fourHour = usable4h ? technicalFrame(closed4h, duration) : null;
  const anchorPrice = fourHour?.close ?? daily.close;
  const today = exchangeDate(now, data.timeZone);
  // Use the same reference for chart labels and scenario barriers, across all pivots.
  const ladder = chartLevelLadder(data.bars, anchorPrice);
  const support = ladder.supports[0] ?? null;
  const resistance = ladder.resistances[0] ?? null;
  const nearResistance = !!resistance && resistance.low - anchorPrice <= metrics.atr14 * .5;
  const nearSupport = !!support && anchorPrice - support.high <= metrics.atr14 * .5;
  return (['WEEK', 'MONTH'] as const).flatMap(level => {
    const end = addChartDays(today, level === 'WEEK' ? 6 : 27);
    const eligible = sources.filter(s => s.assetId === data.assetId && Date.parse(s.lockedAt) <= now && s.periodStart <= end && s.periodEnd >= today);
    const windows = [...new Map(eligible.flatMap(s => s.windows.filter(w => w.assetId === data.assetId && w.evidence === 'EXPLICIT'
      && w.focusDate >= today && w.focusDate <= end && w.focusDate >= s.periodStart && w.focusDate <= s.periodEnd)).map(w => [`${w.focusDate}:${w.kind}`, w])).values()]
      .filter(w => chartCalendarSupported(data.assetId, w.focusDate)).map(w => {
        const closed = !isChartTradingDay(data.assetId, w.focusDate);
        let next = w.focusDate;
        if (closed) do { next = addChartDays(next, 1); } while (chartCalendarSupported(data.assetId, next) && !isChartTradingDay(data.assetId, next));
        return { ...w, closed, nextSessionDate: closed && chartCalendarSupported(data.assetId, next) ? next : null };
      });
    const fastWeight = level === 'WEEK' ? .3 : .1;
    const technicalScore = fourHour ? daily.score * (1 - fastWeight) + fourHour.score * fastWeight : daily.score;
    const direction: ForecastPath['direction'] = technicalScore >= .2 ? '震荡上涨' : technicalScore <= -.2 ? '震荡下跌' : '震荡';
    const technical: TechnicalOutlook = { authority: 'RESEARCH_ONLY', revisionReason: 'TECHNICAL_FIRST_POLICY_20260915', daily, fourHour,
      intradayStatus: crypto ? fourHour ? 'CURRENT' : 'UNAVAILABLE' : 'NOT_APPLICABLE', intradaySource: fourHour ? intraday!.source : null,
      anchorPrice, technicalScore, support, resistance, nearResistance, nearSupport,
      timingSources: eligible.filter(s => s.windows.some(w => windows.some(chosen => chosen.id === w.id))).map(s => ({ id: s.id, version: s.version, direction: s.direction })) };
    const path: ForecastPath = { id: `technical-v5:${data.assetId}:${level}:${data.asOf}`, assetId: data.assetId, level, sourceHorizon: level,
      direction, periodStart: today, periodEnd: end, lockedAt: new Date(now).toISOString(), version: 5, windows: [] };
    const row = projectDailyCandles(data, [path], now, anchorPrice)[0];
    if (!row) return [];
    // Scale the illustrative drift down when evidence is weak or a barrier is near.
    const strength = Math.min(1, Math.abs(technicalScore) * 2);
    const barrier = technicalScore > 0 && nearResistance || technicalScore < 0 && nearSupport ? .5 : 1;
    let previous = anchorPrice;
    const candles = row.candles.map((c, i) => {
      const signs = windows.filter(w => (w.closed ? w.nextSessionDate : w.focusDate) === c.date)
        .map(w => w.kind === 'low' || w.kind === 'strength' ? 1 : w.kind === 'high' || w.kind === 'risk' ? -1 : 0);
      const timing = i === row.candles.length - 1 ? 0 : clamp(signs.reduce<number>((a, b) => a + b, 0)) * .15 * metrics.atr14;
      const baselineClose = anchorPrice + (c.baselineClose - anchorPrice) * strength * barrier;
      const close = Math.max(1e-8, baselineClose + (c.close - c.baselineClose) + timing);
      const open = previous;
      previous = close;
      const upper = c.high - Math.max(c.open, c.close), lower = Math.min(c.open, c.close) - c.low;
      return { ...c, open, close, baselineClose, high: Math.max(open, close) + upper, low: Math.max(1e-8, Math.min(open, close) - lower),
        rangeLow: baselineClose * c.rangeLow / c.baselineClose, rangeHigh: baselineClose * c.rangeHigh / c.baselineClose };
    });
    return [{ ...row, candles, windows, technical, risk: nearResistance ? 'NEAR_RESISTANCE' as const : anchorPrice < daily.ema60 ? 'BELOW_EMA60' as const : 'NORMAL' as const }];
  });
}
