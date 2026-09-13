import { ema } from "@/lib/market-data/ema-core";
import type { ChartBar } from "@/lib/presentation/key-date-chart";

/** Display-only, closed-bar indicators. No future scenario input or trade authority. */
export function technicalChartContext(bars: ChartBar[]) {
  const closes = bars.map(b => b.close);
  const fast = ema(closes, 12), slow = ema(closes, 26), ema60 = ema(closes, 60);
  const dif = closes.map((_, i) => fast[i]! - slow[i]!);
  // Seed DEA with nine actual DIF observations; never fill warm-up with zero.
  const ready = dif.findIndex(Number.isFinite);
  const dea = ready < 0 ? [] : ema(dif.slice(ready), 9);
  const points = bars.flatMap((bar, i) => {
    const signal = dea[i - ready];
    return Number.isFinite(dif[i]) && Number.isFinite(signal)
      ? [{ date: bar.date, dif: dif[i]!, dea: signal!, histogram: 2 * (dif[i]! - signal!) }] : [];
  });
  const last = points.at(-1), previous = points.at(-2);
  const mean = ema60.at(-1);
  return {
    points,
    ema60: Number.isFinite(mean) ? mean! : null,
    ema60DistancePct: Number.isFinite(mean) && mean! > 0 ? (closes.at(-1)! / mean! - 1) * 100 : null,
    zeroAxis: !last ? "UNAVAILABLE" : last.dif > 0 && last.dea > 0 ? "ABOVE"
      : last.dif < 0 && last.dea < 0 ? "BELOW" : "CROSSING",
    // This is histogram change, NOT a complete Chan divergence assertion.
    momentum: !last || !previous ? "UNAVAILABLE" : last.histogram === 0 ? "FLAT"
      : Math.sign(last.histogram) !== Math.sign(previous.histogram) ? "FLIP"
      : Math.abs(last.histogram) > Math.abs(previous.histogram) ? "EXPANDING"
      : Math.abs(last.histogram) < Math.abs(previous.histogram) ? "CONTRACTING" : "FLAT",
    side: !last || last.histogram === 0 ? "NEUTRAL" : last.histogram > 0 ? "BULL" : "BEAR",
  } as const;
}
