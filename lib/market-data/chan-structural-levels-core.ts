import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import type { ChanCandle, ChanTimeframe } from "@/types/chan-execution";

export type ChanLevelSource =
  | "CHAN_4H"
  | "SWING_4H"
  | "CHAN_1H"
  | "SWING_1H"
  | "FALLBACK"
  | "UNAVAILABLE";

export type DerivedChanLevels = {
  supportValue: number;
  resistanceValue: number;
  support: string;
  resistance: string;
  currentPrice: number;
  move24hPct: number | null;
  source: Exclude<ChanLevelSource, "FALLBACK" | "UNAVAILABLE">;
  sourceLabel: string;
  primaryTimeframe: Extract<ChanTimeframe, "4H" | "1H">;
  structureBasis: "ACTIVE_CENTER" | "CONFIRMED_STRUCTURE" | "SWING_RANGE";
};

type Candidate = {
  value: number;
  recency: number;
};

function validCandles(rows: ChanCandle[], limit: number): ChanCandle[] {
  return rows
    .filter((row) =>
      Number.isFinite(row.timestamp) &&
      row.open > 0 &&
      row.high >= row.low &&
      row.low > 0 &&
      row.close > 0
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-limit);
}

function trueRange(row: ChanCandle, previous?: ChanCandle): number {
  if (!previous) return row.high - row.low;
  return Math.max(
    row.high - row.low,
    Math.abs(row.high - previous.close),
    Math.abs(row.low - previous.close)
  );
}

function averageTrueRange(rows: ChanCandle[]): number {
  const sample = rows.slice(-14);
  if (!sample.length) return 0;
  return sample.reduce(
    (sum, row, index) => sum + trueRange(row, index ? sample[index - 1] : undefined),
    0
  ) / sample.length;
}

function decimals(price: number): number {
  if (price >= 10_000) return 0;
  if (price >= 1_000) return 1;
  if (price >= 1) return 2;
  if (price >= 0.01) return 4;
  return 6;
}

export function formatStructuralPrice(value: number): string {
  const places = decimals(Math.abs(value));
  return value.toLocaleString("en-US", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

function formatZone(base: number, width: number): string {
  const low = base - width;
  const high = base + width;
  const a = formatStructuralPrice(low);
  const b = formatStructuralPrice(high);
  return a === b ? a : `${a}—${b}`;
}

function uniqueCandidates(rows: Candidate[]): Candidate[] {
  const byRoundedValue = new Map<number, Candidate>();
  for (const row of rows) {
    if (!Number.isFinite(row.value) || row.value <= 0) continue;
    const key = Number(row.value.toPrecision(12));
    const previous = byRoundedValue.get(key);
    if (!previous || row.recency > previous.recency) byRoundedValue.set(key, row);
  }
  return [...byRoundedValue.values()];
}

function chooseStructuralBoundary(input: {
  candidates: Candidate[];
  price: number;
  side: "BELOW" | "ABOVE";
  minimumDistance: number;
}): number | null {
  const directional = uniqueCandidates(input.candidates).filter((row) =>
    input.side === "BELOW" ? row.value < input.price : row.value > input.price
  );
  if (!directional.length) return null;

  // A main 4H map must not collapse to the nearest candle wick. Ignore a
  // boundary that sits inside ordinary 4H noise when a confirmed, wider
  // structural boundary exists. Recency breaks near-equal ties.
  const structural = directional.filter(
    (row) => Math.abs(row.value - input.price) >= input.minimumDistance
  );
  const pool = structural.length ? structural : directional;
  return pool.sort((left, right) => {
    const distance = Math.abs(left.value - input.price) - Math.abs(right.value - input.price);
    if (Math.abs(distance) > input.minimumDistance * 0.12) return distance;
    return right.recency - left.recency;
  })[0]?.value ?? null;
}

function completedSegmentEndpoints(
  structure: ReturnType<typeof analyzeChanStructure>
): Candidate[] {
  return structure.segments.flatMap((segment) => {
    if (!segment.complete) return [];
    const start = structure.strokes[segment.startStroke];
    const end = structure.strokes[segment.endStroke];
    if (!start || !end) return [];
    return [
      { value: start.startPrice, recency: segment.endStroke },
      { value: end.endPrice, recency: segment.endStroke },
    ];
  });
}

function confirmedFiveBarSwings(candles: ChanCandle[]): Candidate[] {
  const output: Candidate[] = [];
  for (let index = 2; index < candles.length - 2; index += 1) {
    const row = candles[index]!;
    const neighbors = [
      candles[index - 2]!,
      candles[index - 1]!,
      candles[index + 1]!,
      candles[index + 2]!,
    ];
    if (neighbors.every((candidate) => row.low <= candidate.low)) {
      output.push({ value: row.low, recency: index });
    }
    if (neighbors.every((candidate) => row.high >= candidate.high)) {
      output.push({ value: row.high, recency: index });
    }
  }
  return output.slice(-20);
}

export function deriveChanStructuralLevels(input: {
  candles: ChanCandle[];
  timeframe: Extract<ChanTimeframe, "4H" | "1H">;
}): DerivedChanLevels | null {
  const candles = validCandles(input.candles, input.timeframe === "4H" ? 120 : 72);
  const last = candles.at(-1);
  if (!last || candles.length < 12) return null;

  const price = last.close;
  const referenceTarget = last.timestamp - 24 * 60 * 60 * 1_000;
  // Crypto has six 4H bars per calendar day, while equity sessions produce
  // one or two completed structural chunks. Select by elapsed time and require
  // at least a 12-hour separation so a Monday closing chunk cannot accidentally
  // compare against Monday morning instead of the prior market session.
  const reference24h = candles
    .slice(0, -1)
    .filter((row) => row.timestamp <= last.timestamp - 12 * 60 * 60 * 1_000)
    .sort((left, right) => Math.abs(left.timestamp - referenceTarget) - Math.abs(right.timestamp - referenceTarget))[0]?.close
    ?? candles[0]?.close
    ?? price;
  const move24hPct = reference24h > 0
    ? ((price - reference24h) / reference24h) * 100
    : null;
  const structure = analyzeChanStructure(candles);
  const volatility = Math.max(
    averageTrueRange(candles),
    price * (input.timeframe === "4H" ? 0.003 : 0.0015)
  );
  const minimumDistance = input.timeframe === "4H"
    ? Math.max(volatility * 0.4, price * 0.0035)
    : Math.max(volatility * 0.35, price * 0.0015);

  const activeCenter = [...structure.zones]
    .reverse()
    .find((zone) => zone.low < price && price < zone.high);

  const zoneCandidates: Candidate[] = structure.zones.slice(-5).flatMap((zone) => [
    { value: zone.low, recency: zone.endStroke },
    { value: zone.high, recency: zone.endStroke },
  ]);
  const fractalCandidates: Candidate[] = structure.fractals.slice(-16).map((fractal) => ({
    value: fractal.price,
    recency: fractal.index,
  }));
  const segmentCandidates = completedSegmentEndpoints(structure);
  const swingCandidates = confirmedFiveBarSwings(candles);
  const confirmedCandidates = [
    ...zoneCandidates,
    ...fractalCandidates,
    ...segmentCandidates,
    ...swingCandidates,
  ];

  let supportValue = activeCenter?.low ?? chooseStructuralBoundary({
    candidates: confirmedCandidates,
    price,
    side: "BELOW",
    minimumDistance,
  });
  let resistanceValue = activeCenter?.high ?? chooseStructuralBoundary({
    candidates: confirmedCandidates,
    price,
    side: "ABOVE",
    minimumDistance,
  });

  let structureBasis: DerivedChanLevels["structureBasis"] = activeCenter
    ? "ACTIVE_CENTER"
    : supportValue != null || resistanceValue != null
      ? "CONFIRMED_STRUCTURE"
      : "SWING_RANGE";

  // If price is outside every confirmed boundary (for example at a new high),
  // use a broad completed 4H range plus ATR projection. Raw nearest wicks are
  // deliberately not promoted to headline support/resistance.
  const structuralWindow = candles.slice(-(input.timeframe === "4H" ? 42 : 36));
  if (supportValue == null) {
    const low = Math.min(...structuralWindow.map((row) => row.low));
    supportValue = low < price ? low : price - Math.max(volatility, minimumDistance);
    structureBasis = "SWING_RANGE";
  }
  if (resistanceValue == null) {
    const high = Math.max(...structuralWindow.map((row) => row.high));
    resistanceValue = high > price ? high : price + Math.max(volatility, minimumDistance);
    structureBasis = "SWING_RANGE";
  }

  if (!(supportValue < price && resistanceValue > price)) return null;
  const width = Math.max(
    Math.min(volatility * 0.1, price * (input.timeframe === "4H" ? 0.004 : 0.0025)),
    price * (input.timeframe === "4H" ? 0.0008 : 0.0004)
  );
  const chan = structure.sufficient && structure.zones.length > 0;
  const source = input.timeframe === "4H"
    ? chan ? "CHAN_4H" as const : "SWING_4H" as const
    : chan ? "CHAN_1H" as const : "SWING_1H" as const;
  const sourceLabel = input.timeframe === "4H"
    ? structureBasis === "ACTIVE_CENTER"
      ? "高山缠论4H当前中枢边界"
      : chan
        ? "高山缠论4H中枢/线段结构"
        : "4H确认分形/摆动结构"
    : chan
      ? "1H战术中枢（4H不可用时降级）"
      : "1H战术摆动（4H不可用时降级）";

  return {
    supportValue,
    resistanceValue,
    support: formatZone(supportValue, width),
    resistance: formatZone(resistanceValue, width),
    currentPrice: price,
    move24hPct,
    source,
    sourceLabel,
    primaryTimeframe: input.timeframe,
    structureBasis,
  };
}
