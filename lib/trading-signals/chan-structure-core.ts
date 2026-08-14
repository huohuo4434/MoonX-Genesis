import type { ChanCandle, ChanDirection, ChanFractal, ChanSegment, ChanStroke, ChanStructure, ChanZone } from "@/types/chan-execution";

export function buildChanChartAnnotations(structure: ChanStructure, direction: ChanDirection): {
  marker: { side: "BUY" | "SELL"; label: string } | null;
  risk: ChanStructure["riskLevels"]["long"] | null;
} {
  const marker = structure.buyPoint !== "NONE"
    ? { side: "BUY" as const, label: structure.buyPoint === "SECOND" ? "二买" : structure.buyPoint === "THIRD" ? "三买" : "一买研究" }
    : structure.sellPoint !== "NONE"
      ? { side: "SELL" as const, label: structure.sellPoint === "SECOND" ? "二卖" : structure.sellPoint === "THIRD" ? "三卖" : "一卖" }
      : null;
  const risk = direction === "BULL"
    ? structure.riskLevels.long
    : direction === "BEAR"
      ? structure.riskLevels.short
      : null;
  return { marker, risk };
}

export function normalizeChanInclusions(candles: ChanCandle[]): ChanCandle[] {
  const result: ChanCandle[] = [];
  for (const row of candles) {
    const previous = result.at(-1);
    if (!previous) { result.push({ ...row }); continue; }
    const included = (row.high <= previous.high && row.low >= previous.low) || (row.high >= previous.high && row.low <= previous.low);
    if (!included) { result.push({ ...row }); continue; }
    const rising = result.length < 2 || previous.close >= result[result.length - 2]!.close;
    const open = previous.open;
    const close = row.close;
    const structuralHigh = rising ? Math.max(previous.high, row.high) : Math.min(previous.high, row.high);
    const structuralLow = rising ? Math.max(previous.low, row.low) : Math.min(previous.low, row.low);
    result[result.length - 1] = { ...row, open, close, high: Math.max(structuralHigh, open, close), low: Math.min(structuralLow, open, close), volume: null };
  }
  return result;
}

function fractals(rows: ChanCandle[]): ChanFractal[] {
  const found: ChanFractal[] = [];
  for (let i = 1; i < rows.length - 1; i += 1) {
    const a = rows[i - 1]!, b = rows[i]!, c = rows[i + 1]!;
    const kind = b.high > a.high && b.high > c.high && b.low > a.low && b.low > c.low ? "TOP" : b.low < a.low && b.low < c.low && b.high < a.high && b.high < c.high ? "BOTTOM" : null;
    if (!kind) continue;
    const prior = found.at(-1);
    if (prior && (kind === prior.kind || i - prior.index < 3)) {
      const stronger = kind === "TOP" ? b.high > prior.price : b.low < prior.price;
      if (stronger && kind === prior.kind) found[found.length - 1] = { index: i, timestamp: b.timestamp, kind, price: kind === "TOP" ? b.high : b.low };
      continue;
    }
    found.push({ index: i, timestamp: b.timestamp, kind, price: kind === "TOP" ? b.high : b.low });
  }
  return found;
}

function strokes(points: ChanFractal[]): ChanStroke[] {
  return points.slice(1).flatMap((end, index) => {
    const start = points[index]!;
    if (end.index - start.index < 3 || end.kind === start.kind) return [];
    return [{ startIndex: start.index, endIndex: end.index, startPrice: start.price, endPrice: end.price, direction: end.price > start.price ? "UP" as const : "DOWN" as const, complete: true }];
  });
}

export function buildChanSegments(lines: ChanStroke[]): ChanSegment[] {
  const result: ChanSegment[] = [];
  // V1 requires at least five alternating strokes plus a same-direction extreme
  // break. Three strokes alone are explicitly insufficient.
  for (let start = 0; start + 4 < lines.length; start += 2) {
    const window = lines.slice(start, start + 5);
    if (!window.every((row, i) => i === 0 || row.direction !== window[i - 1]!.direction)) continue;
    const direction = window[0]!.direction;
    const same = window.filter((row) => row.direction === direction);
    const complete = direction === "UP" ? same.at(-1)!.endPrice > same[0]!.endPrice : same.at(-1)!.endPrice < same[0]!.endPrice;
    if (complete) result.push({ startStroke: start, endStroke: start + 4, direction, complete: true });
  }
  return result;
}

export function detectChanZones(lines: ChanStroke[]): ChanZone[] {
  const result: ChanZone[] = [];
  for (let i = 0; i + 2 < lines.length; i += 1) {
    const group = lines.slice(i, i + 3);
    const low = Math.max(...group.map((row) => Math.min(row.startPrice, row.endPrice)));
    const high = Math.min(...group.map((row) => Math.max(row.startPrice, row.endPrice)));
    if (low < high) result.push({ startStroke: i, endStroke: i + 2, low, high });
  }
  return result;
}

export function classifyChanBuySellPoints(lines: ChanStroke[], detectedZones: ChanZone[]): { buyPoint: ChanStructure["buyPoint"]; sellPoint: ChanStructure["sellPoint"] } {
  const breakoutStrokeIndex = lines.length - 3;
  const zone = detectedZones.reduce<ChanZone | undefined>((selected, candidate) => {
    if (candidate.endStroke >= breakoutStrokeIndex) return selected;
    if (!selected || candidate.endStroke > selected.endStroke || (candidate.endStroke === selected.endStroke && candidate.startStroke > selected.startStroke)) return candidate;
    return selected;
  }, undefined);
  const recent = lines.slice(-4);
  let buyPoint: ChanStructure["buyPoint"] = "NONE";
  let sellPoint: ChanStructure["sellPoint"] = "NONE";
  if (recent.length === 4 && recent.every((row) => row.complete)) {
    const [a, b, c, confirm] = recent;
    if (a!.direction === "DOWN" && b!.direction === "UP" && c!.direction === "DOWN" && confirm!.direction === "UP" && c!.endPrice > a!.endPrice && confirm!.endPrice > c!.startPrice) buyPoint = "SECOND";
    if (a!.direction === "UP" && b!.direction === "DOWN" && c!.direction === "UP" && confirm!.direction === "DOWN" && c!.endPrice < a!.endPrice && confirm!.endPrice < c!.startPrice) sellPoint = "SECOND";
  }
  const last3 = lines.slice(-3);
  if (zone && last3.length === 3 && last3.every((row) => row.complete)) {
    const [breakout, pullback, confirm] = last3;
    const bullishBreakoutAttempt = breakout!.direction === "UP" && breakout!.endPrice > zone.high && pullback!.direction === "DOWN" && confirm!.direction === "UP";
    const bearishBreakoutAttempt = breakout!.direction === "DOWN" && breakout!.endPrice < zone.low && pullback!.direction === "UP" && confirm!.direction === "DOWN";
    if (bullishBreakoutAttempt) buyPoint = Math.min(pullback!.startPrice, pullback!.endPrice) > zone.high && confirm!.endPrice > pullback!.startPrice ? "THIRD" : "NONE";
    if (bearishBreakoutAttempt) sellPoint = Math.max(pullback!.startPrice, pullback!.endPrice) < zone.low && confirm!.endPrice < pullback!.startPrice ? "THIRD" : "NONE";
  }
  return { buyPoint, sellPoint };
}

export function buildDivergenceEvidence(lines: ChanStroke[], completedSegments: ChanSegment[], detectedZones: ChanZone[]): ChanStructure["divergenceEvidence"] {
  const last = lines.at(-1);
  const lastIndex = lines.length - 1;
  let priorIndex = -1;
  for (let index = lastIndex - 1; index >= 0; index -= 1) if (lines[index]!.direction === last?.direction) { priorIndex = index; break; }
  const priorSame = priorIndex >= 0 ? lines[priorIndex] : undefined;
  const lastMagnitude = last ? Math.abs(last.endPrice - last.startPrice) : 0;
  const priorMagnitude = priorSame ? Math.abs(priorSame.endPrice - priorSame.startPrice) : 0;
  return {
    priceExtended: Boolean(last && priorSame && (last.direction === "UP" ? last.endPrice > priorSame.endPrice : last.endPrice < priorSame.endPrice)),
    momentumContracted: Boolean(priorMagnitude > 0 && lastMagnitude < priorMagnitude * 0.8),
    zoneConfirmed: detectedZones.some((zone) => zone.endStroke >= priorIndex && zone.endStroke < lastIndex),
    segmentComplete: Boolean(completedSegments.some((segment) => segment.complete && segment.endStroke === lines.length - 1) && last?.complete && priorSame?.complete),
  };
}

export function classifyChanTrendState(lines: ChanStroke[], completedSegments: ChanSegment[]): ChanStructure["trendState"] {
  const currentCovered = completedSegments.some((segment) => segment.complete && segment.endStroke === lines.length - 1);
  if (currentCovered) return "COMPLETE";
  return lines.length >= 4 ? "NEAR_COMPLETE" : "INCOMPLETE";
}

export function deriveDirectionalRiskLevels(zone: ChanZone | undefined): ChanStructure["riskLevels"] {
  if (!zone) return { long: null, short: null };
  const width = zone.high - zone.low;
  return {
    long: { invalidation: zone.low, tp1: zone.high + width, tp2: zone.high + width * 2, breakevenTrigger: zone.high + width },
    short: { invalidation: zone.high, tp1: zone.low - width, tp2: zone.low - width * 2, breakevenTrigger: zone.low - width },
  };
}

export function analyzeChanStructure(candles: ChanCandle[]): ChanStructure {
  const valid = candles.filter((row) => Number.isFinite(row.timestamp) && row.open > 0 && row.close > 0 && row.low > 0 && row.high >= Math.max(row.open, row.close) && row.low <= Math.min(row.open, row.close)).sort((a, b) => a.timestamp - b.timestamp);
  const normalizedCandles = normalizeChanInclusions(valid);
  const fs = fractals(normalizedCandles);
  const bs = strokes(fs);
  const ss = buildChanSegments(bs);
  const zs = detectChanZones(bs);
  const sufficient = normalizedCandles.length >= 20 && bs.length >= 3;
  const divergenceEvidence = buildDivergenceEvidence(bs, ss, zs);
  const divergence = Object.values(divergenceEvidence).every(Boolean);
  const trendState = classifyChanTrendState(bs, ss);
  const zone = zs.at(-1);
  const points = classifyChanBuySellPoints(bs, zs);
  const riskLevels = deriveDirectionalRiskLevels(zone);
  return { sufficient, normalizedCandles, fractals: fs, strokes: bs, segments: ss, zones: zs, trendState, divergence, divergenceEvidence, ...points, riskLevels };
}
