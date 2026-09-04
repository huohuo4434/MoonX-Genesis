/** SMA-seeded EMA; unavailable warm-up values remain NaN. */
export function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let previous: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (previous == null) {
      if (i + 1 < period) { out.push(Number.NaN); continue; }
      previous = values.slice(i + 1 - period, i + 1).reduce((sum, value) => sum + value, 0) / period;
    } else previous = values[i]! * k + previous * (1 - k);
    out.push(previous);
  }
  return out;
}
