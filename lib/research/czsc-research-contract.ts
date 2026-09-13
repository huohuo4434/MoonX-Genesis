import { z } from "zod";
import type { KeyDateChartData } from "@/lib/presentation/key-date-chart";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const price = z.number().finite().positive();
const stroke = z.object({ start: date, end: date, startPrice: price, endPrice: price,
  observedOn: date, direction: z.enum(["UP", "DOWN"]) });
export const czscSnapshotSchema = z.object({
  schema: z.literal("moox-czsc-v1"), engine: z.literal("czsc-1.0.1"),
  authority: z.literal("RESEARCH_ONLY"), tradingEligible: z.literal(false),
  symbol: z.string().max(100), timeframe: z.literal("1D"), asOf: date,
  inputHash: z.string().regex(/^[a-f0-9]{64}$/), minBiLen: z.literal(6),
  strokes: z.array(stroke).max(1000),
  zones: z.array(z.object({ start: date, end: date, low: price, high: price, observedOn: date })).max(1000),
  replay: z.object({ bars: z.number().int().min(20).max(2000), additions: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(), profitBacktested: z.literal(false) }),
});
export type CzscSnapshot = z.infer<typeof czscSnapshotSchema>;

/** Exact input string is hashed in Python and browser; no float re-serialization drift. */
export function czscInput(data: KeyDateChartData) {
  if (data.stale || data.bars.length < 20) throw new Error("CZSC_INPUT_NOT_READY");
  const barsJson = JSON.stringify(data.bars.map(({ date, timestamp, open, high, low, close, volume }) =>
    ({ date, timestamp, open, high, low, close, volume })));
  return { schema: "moox-czsc-input-v1", symbol: data.quoteSymbol, timeframe: "1D", asOf: data.asOf,
    timeZone: data.timeZone, closedOnly: true, barsJson };
}

export async function validateCzscSnapshot(raw: unknown, data: KeyDateChartData): Promise<CzscSnapshot> {
  const report = czscSnapshotSchema.parse(raw);
  const input = czscInput(data);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.barsJson));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  if (report.inputHash !== hash || report.symbol !== input.symbol || report.asOf !== input.asOf
      || report.replay.bars !== data.bars.length) throw new Error("CZSC_DATASET_MISMATCH");
  const days = new Map(data.bars.map(b => [b.date, b]));
  const max = Math.max(...data.bars.map(b => b.high)), min = Math.min(...data.bars.map(b => b.low));
  let previousEnd = "";
  for (const s of report.strokes) {
    const a = days.get(s.start), b = days.get(s.end);
    if (!a || !b || !days.has(s.observedOn) || s.start >= s.end || s.end > s.observedOn
      || s.end <= previousEnd || s.startPrice > max || s.startPrice < min || s.endPrice > max || s.endPrice < min
      || (s.direction === "UP" ? s.endPrice <= s.startPrice : s.endPrice >= s.startPrice)) throw new Error("CZSC_INVALID_STROKE");
    previousEnd = s.end;
  }
  for (const zone of report.zones) {
    if (!days.has(zone.start) || !days.has(zone.end) || !days.has(zone.observedOn)
      || zone.start >= zone.end || zone.end > zone.observedOn || zone.low >= zone.high
      || zone.low < min || zone.high > max) throw new Error("CZSC_INVALID_ZONE");
  }
  return report;
}
