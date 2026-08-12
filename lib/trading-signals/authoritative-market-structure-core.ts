export type AuthoritativeDirection = "LONG" | "SHORT" | "NEUTRAL";

export type StructureCandle = { high: number; low: number; close: number };

export type DirectionalMarketStructure = {
  structure: "CONVERGING" | "RANGE" | "UNAVAILABLE";
  lowerEdge: number | null;
  upperEdge: number | null;
  atDirectionalEdge: boolean;
  falseBreakReclaimed: boolean;
  breakoutConfirmed: boolean;
  currentEntryInvalidated: boolean;
  label: string;
};

export function resolveAuthoritativeForecastDirection(input: {
  weeklyDirection?: AuthoritativeDirection | null;
  fallbackDirection?: AuthoritativeDirection | null;
}): AuthoritativeDirection {
  const weekly = input.weeklyDirection ?? "NEUTRAL";
  return weekly !== "NEUTRAL" ? weekly : input.fallbackDirection ?? "NEUTRAL";
}

export function resolveWeeklyAuthoritySetup(input: {
  weeklyAvailable: boolean;
  weeklyDirection: AuthoritativeDirection;
  weeklyConfidence: number;
  minimumConfidence: number;
}): "BUY_DIP" | "SELL_RALLY" | "HOLD" | "MISSING_FORECAST" {
  if (!input.weeklyAvailable) return "MISSING_FORECAST";
  if (input.weeklyConfidence < input.minimumConfidence) return "HOLD";
  if (input.weeklyDirection === "LONG") return "BUY_DIP";
  if (input.weeklyDirection === "SHORT") return "SELL_RALLY";
  return "HOLD";
}

function emptyStructure(): DirectionalMarketStructure {
  return {
    structure: "UNAVAILABLE",
    lowerEdge: null,
    upperEdge: null,
    atDirectionalEdge: false,
    falseBreakReclaimed: false,
    breakoutConfirmed: false,
    currentEntryInvalidated: false,
    label: "结构样本不足，不推断形态",
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

/**
 * Auditable timing classifier. The authoritative direction is an input and no
 * direction is returned, so chart structure cannot manufacture or flip a side.
 * Head-and-shoulders is intentionally omitted because this small execution
 * window cannot prove pivots and neckline robustly without inventing evidence.
 */
export function classifyDirectionalMarketStructure(
  candles: StructureCandle[],
  direction: AuthoritativeDirection,
  lookback = 12
): DirectionalMarketStructure {
  if (direction === "NEUTRAL" || candles.length < 8) return emptyStructure();
  const window = candles.slice(-Math.max(8, lookback));
  const latest = window.at(-1)!;
  const previous = window.at(-2)!;
  const reference = window.slice(0, -2);
  if (reference.length < 6 || reference.some((row) => row.high <= 0 || row.low <= 0 || row.high < row.low)) return emptyStructure();

  const lowerEdge = Math.min(...reference.map((row) => row.low));
  const upperEdge = Math.max(...reference.map((row) => row.high));
  const width = upperEdge - lowerEdge;
  if (width <= 0) return emptyStructure();
  const edgeTolerance = Math.max(width * 0.12, latest.close * 0.0015);
  const firstHalf = reference.slice(0, Math.ceil(reference.length / 2));
  const secondHalf = reference.slice(Math.ceil(reference.length / 2));
  const firstRange = average(firstHalf.map((row) => row.high - row.low));
  const secondRange = average(secondHalf.map((row) => row.high - row.low));
  const structure = secondRange > 0 && secondRange <= firstRange * 0.78 ? "CONVERGING" : "RANGE";
  const long = direction === "LONG";
  const atDirectionalEdge = long
    ? latest.low <= lowerEdge + edgeTolerance && latest.close >= lowerEdge - edgeTolerance
    : latest.high >= upperEdge - edgeTolerance && latest.close <= upperEdge + edgeTolerance;
  const falseBreakReclaimed = long
    ? previous.close < lowerEdge && latest.close >= lowerEdge
    : previous.close > upperEdge && latest.close <= upperEdge;
  const breakoutConfirmed = long
    ? previous.close <= upperEdge && latest.close > upperEdge + edgeTolerance * 0.25
    : previous.close >= lowerEdge && latest.close < lowerEdge - edgeTolerance * 0.25;
  const currentEntryInvalidated = long
    ? previous.close < lowerEdge - edgeTolerance && latest.close < lowerEdge - edgeTolerance
    : previous.close > upperEdge + edgeTolerance && latest.close > upperEdge + edgeTolerance;
  const structureLabel = structure === "CONVERGING" ? "收敛/三角边沿" : "区间/中枢上下沿";
  const stateLabel = currentEntryInvalidated
    ? "方向对应的当前入场边沿已失效，等待新位置，不自动反手"
    : falseBreakReclaimed
      ? "假突破已收回，作为方向内确认"
      : breakoutConfirmed
        ? "顺周方向突破已确认"
        : atDirectionalEdge
          ? "价格到达方向对应关键边沿，可评估小风险探路"
          : "价格位于结构中部，等待边沿或确认";
  return { structure, lowerEdge, upperEdge, atDirectionalEdge, falseBreakReclaimed, breakoutConfirmed, currentEntryInvalidated, label: `${structureLabel}：${stateLabel}` };
}
