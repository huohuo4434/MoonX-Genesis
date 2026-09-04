import { ema } from "@/lib/market-data/ema-core";
import { filterClosedCandles, intervalMs, isValidChanCandle } from "@/lib/market-data/chan-market-data-core";
import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import type { ChanCandle } from "@/types/chan-execution";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";

export type ReviewFrame = "1H" | "4H" | "1D";
export type TechnicalReview = {
  timeframe: ReviewFrame; available: boolean; reason: string; closedAt: string | null;
  pressure: boolean; resistance: number | null; ema60: number | null;
  dif: number | null; dea: number | null; histogram: number | null;
  penalty: number;
};
const label = { "1H": "1小时", "4H": "4小时", "1D": "日线" } as const;
const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 4 });

export function reviewClosedTechnicalFrame(input: {
  timeframe: ReviewFrame; candles: ChanCandle[]; cutoffMs: number; maxAgeMs: number;
}): TechnicalReview {
  const empty: TechnicalReview = { timeframe: input.timeframe, available: false, reason: `${label[input.timeframe]}数据不足或过期`,
    closedAt: null, pressure: false, resistance: null, ema60: null, dif: null, dea: null, histogram: null, penalty: 0 };
  if (!Number.isFinite(input.cutoffMs)) return empty;
  const byTime = new Map<number, ChanCandle>();
  for (const bar of filterClosedCandles(input.candles.filter(isValidChanCandle), input.timeframe, input.cutoffMs)) {
    const prior = byTime.get(bar.timestamp);
    if (prior && ["open", "high", "low", "close"].some((key) => prior[key as keyof ChanCandle] !== bar[key as keyof ChanCandle])) return empty;
    byTime.set(bar.timestamp, bar);
  }
  const bars = [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-160);
  const last = bars.at(-1);
  if (bars.length < 65 || !last) return empty;
  const closedMs = last.timestamp + intervalMs(input.timeframe);
  if (!Number.isFinite(input.maxAgeMs) || input.maxAgeMs < 0 || input.cutoffMs - closedMs > input.maxAgeMs) return empty;
  const closes = bars.map((bar) => bar.close);
  const fast = ema(closes, 12), slow = ema(closes, 26);
  // Seed the signal only after DIF exists; never substitute zero for missing DIF.
  const difs = closes.map((_, i) => fast[i]! - slow[i]!).slice(25);
  const signals = ema(difs, 9);
  const dif = difs.at(-1)!, dea = signals.at(-1)!;
  const histogram = dif - dea, previousHistogram = difs.at(-2)! - signals.at(-2)!;
  const average = ema(closes, 60).at(-1)!;
  const atr = bars.slice(-14).reduce((sum, bar, i) => {
    const previous = bars[bars.length - 15 + i]!.close;
    return sum + Math.max(bar.high - bar.low, Math.abs(bar.high - previous), Math.abs(bar.low - previous));
  }, 0) / 14;
  const tolerance = Math.max(atr * 0.25, last.close * 0.001);
  // Two latest closes test the prior structure, not a moving target including themselves.
  const priorHigh = Math.max(...bars.slice(-62, -2).map((bar) => bar.high));
  const brokenOut = bars.slice(-2).every((bar) => bar.close > priorHigh + tolerance);
  const chan = analyzeChanStructure(bars);
  const zoneHigh = chan.sufficient ? chan.zones.at(-1)?.high : undefined;
  const candidates = [priorHigh, average, zoneHigh].filter((value): value is number =>
    value != null && Number.isFinite(value) && value >= last.close - tolerance && Math.abs(last.close - value) <= tolerance);
  const resistance = candidates.sort((a, b) => Math.abs(a - last.close) - Math.abs(b - last.close))[0] ?? null;
  const pressure = resistance !== null && !(brokenOut && resistance === priorHigh);
  const fading = histogram < previousHistogram;
  const weak = last.close < average && dif < 0 && histogram < 0;
  const penalty = pressure ? ({ "1H": 4, "4H": 6, "1D": 8 }[input.timeframe]) + (fading ? 2 : 0)
    : weak ? ({ "1H": 2, "4H": 3, "1D": 4 }[input.timeframe]) : 0;
  const axis = Math.abs(dif) <= atr * 0.05 ? "零轴附近" : dif > 0 ? "零轴上方" : "零轴下方";
  return { timeframe: input.timeframe, available: true, closedAt: new Date(closedMs).toISOString(),
    pressure, resistance, ema60: average, dif, dea, histogram, penalty,
    reason: `${label[input.timeframe]}：${pressure ? `已到压力区${number(resistance!)}，未确认有效突破` : brokenOut ? "连续两根收盘突破此前结构高点" : "未触及已识别压力区"}；MACD DIF在${axis}，柱体${fading ? "回落" : "回升"}；EMA60 ${number(average)}，收盘在其${last.close >= average ? "上" : "下"}方；缠论${chan.sufficient ? `结构已识别${chan.divergence ? "，有背驰候选" : ""}` : "结构未完整"}` };
}

export function applyDailyTechnicalReview(record: GeneratedDailyForecastRecord, frames: TechnicalReview[], quoteLabel: string): GeneratedDailyForecastRecord {
  const available = frames.filter((frame) => frame.available);
  const penalty = Math.min(15, available.reduce((sum, frame) => sum + frame.penalty, 0));
  const bullish = /上涨|先跌后涨|探底回升|先涨后跌|冲高回落/.test(record.direction);
  const reduction = bullish ? Math.min(penalty, Math.max(0, record.upProbability - 5)) : 0;
  const header = `技术复核：${available.some((frame) => frame.pressure) ? `已到压力区，${reduction > 0 ? "继续上涨信心下调，" : ""}先等突破站稳` : available.length ? "结合动能与均线评估，不机械追涨" : "行情不足，暂不能确认技术位置"}（${quoteLabel}）`;
  return { ...record, upProbability: record.upProbability - reduction,
    sidewaysProbability: record.sidewaysProbability + reduction,
    risks: [...record.risks.filter((risk) => !risk.startsWith("技术复核：")), header],
    technicalEvidence: [record.technicalEvidence, ...frames.map((frame) => `${frame.reason}${frame.closedAt ? `；闭合至${frame.closedAt}` : ""}`),
      `继续上涨情景分下调${reduction}点；这是规则分，不是经回测校准的胜率。`].filter(Boolean).join("。") };
}
