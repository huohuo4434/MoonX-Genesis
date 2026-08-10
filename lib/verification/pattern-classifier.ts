import type {
  DailyAccuracyDirection,
  DailyAccuracyPattern,
  DailyForecastRecord,
  DailyVerdict,
} from "@/types/daily-accuracy";
import { PATTERN_LABELS } from "@/types/daily-accuracy";

export type IntradayVerificationBar = {
  timestamp: number;
  localTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type PatternThresholds = {
  neutralPct: number;
  meaningfulMovePct: number;
  reversalPct: number;
  surgePct: number;
  atrPct?: number | null;
};

export type PatternClassification = {
  pattern: DailyAccuracyPattern;
  patternLabel: string;
  direction: DailyAccuracyDirection;
  mainHighTime: string | null;
  mainLowTime: string | null;
  sessionRangePct: number;
  closeLocation: number;
  closeReturnPct: number;
  highExcursionPct: number;
  lowExcursionPct: number;
  pullbackFromHighPct: number;
  recoveryFromLowPct: number;
  thresholds: PatternThresholds;
  explanation: string;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function derivePatternThresholds(input: {
  atrPct?: number | null;
  market?: DailyForecastRecord["market"];
  symbol?: string;
}): PatternThresholds {
  const baseByMarket: Record<DailyForecastRecord["market"], number> = {
    CRYPTO: 2.2,
    US: 1.15,
    CN: 1.35,
    HK: 1.75,
    US_FUTURES: 2.0,
  };
  const atr = input.atrPct && input.atrPct > 0 ? input.atrPct : baseByMarket[input.market ?? "US"];
  const symbolFloor = input.symbol === "BTC" ? 0.18 : input.symbol === "HSTECH" ? 0.16 : 0.1;
  return {
    neutralPct: Number(clamp(atr * 0.12, symbolFloor, 0.55).toFixed(4)),
    meaningfulMovePct: Number(clamp(atr * 0.32, 0.28, 1.6).toFixed(4)),
    reversalPct: Number(clamp(atr * 0.28, 0.24, 1.35).toFixed(4)),
    surgePct: Number(clamp(atr * 0.52, 0.45, 2.4).toFixed(4)),
    atrPct: input.atrPct ?? null,
  };
}

export function computeAtrPct(
  bars: Array<{ high: number; low: number; close: number }>,
  period = 14
): number | null {
  if (bars.length < 2) return null;
  const sorted = bars.slice(-Math.max(2, period + 1));
  const trs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    if (prev.close > 0 && Number.isFinite(tr)) trs.push((tr / prev.close) * 100);
  }
  if (!trs.length) return null;
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

function directionFromPattern(pattern: DailyAccuracyPattern): DailyAccuracyDirection {
  if (["UP", "RANGE_UP", "DOWN_THEN_UP", "DIP_THEN_RECOVERY"].includes(pattern)) return "UP";
  if (["DOWN", "RANGE_DOWN", "UP_THEN_DOWN", "SURGE_THEN_PULLBACK"].includes(pattern)) return "DOWN";
  return "FLAT";
}

function zigzagCount(bars: IntradayVerificationBar[], thresholdPct: number, baseline: number): number {
  let turns = 0;
  let lastSign = 0;
  for (let i = 1; i < bars.length; i++) {
    const deltaPct = ((bars[i]!.close - bars[i - 1]!.close) / baseline) * 100;
    const sign = Math.abs(deltaPct) < thresholdPct ? 0 : deltaPct > 0 ? 1 : -1;
    if (sign && lastSign && sign !== lastSign) turns += 1;
    if (sign) lastSign = sign;
  }
  return turns;
}

export function classifyIntradayPattern(input: {
  bars: IntradayVerificationBar[];
  previousClose: number;
  thresholds: PatternThresholds;
}): PatternClassification | null {
  const bars = input.bars.filter((b) =>
    [b.open, b.high, b.low, b.close].every((n) => Number.isFinite(n) && n > 0)
  );
  if (bars.length < 4 || !Number.isFinite(input.previousClose) || input.previousClose <= 0) return null;

  const previousClose = input.previousClose;
  let highIndex = 0;
  let lowIndex = 0;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i]!.high > bars[highIndex]!.high) highIndex = i;
    if (bars[i]!.low < bars[lowIndex]!.low) lowIndex = i;
  }

  const high = bars[highIndex]!.high;
  const low = bars[lowIndex]!.low;
  const close = bars.at(-1)!.close;
  const range = Math.max(1e-9, high - low);
  const closeLocation = clamp((close - low) / range, 0, 1);
  const highExcursionPct = ((high - previousClose) / previousClose) * 100;
  const lowExcursionPct = ((low - previousClose) / previousClose) * 100;
  const closeReturnPct = ((close - previousClose) / previousClose) * 100;
  const pullbackFromHighPct = ((high - close) / previousClose) * 100;
  const recoveryFromLowPct = ((close - low) / previousClose) * 100;
  const sessionRangePct = (range / previousClose) * 100;
  const t = input.thresholds;
  // V7.17.8: path verification is about sequence, not only end-of-day color.
  // Cap path thresholds by the realized session range so a real dip/recovery on a quiet
  // crypto day is not erased by a much larger trailing ATR from prior sessions.
  const sessionAwareMovePct = Math.max(0.25, sessionRangePct * 0.3);
  const sessionAwareSurgePct = Math.max(0.45, sessionRangePct * 0.55);
  const meaningfulMovePct = Math.min(t.meaningfulMovePct, sessionAwareMovePct);
  const reversalPct = Math.min(t.reversalPct, sessionAwareMovePct);
  const surgePct = Math.min(t.surgePct, sessionAwareSurgePct);
  const highEarlyEnough = highIndex < bars.length - 1;
  const lowEarlyEnough = lowIndex < bars.length - 1;
  const turns = zigzagCount(bars, Math.max(0.02, t.neutralPct / 4), previousClose);

  let pattern: DailyAccuracyPattern;
  let explanation: string;

  if (
    highEarlyEnough &&
    highIndex < lowIndex &&
    highExcursionPct >= surgePct &&
    pullbackFromHighPct >= reversalPct &&
    closeLocation <= 0.58
  ) {
    pattern = "SURGE_THEN_PULLBACK";
    explanation = "盘中先形成显著上冲，随后从高位明显回落，收盘远离最高区域。";
  } else if (
    lowEarlyEnough &&
    lowIndex < highIndex &&
    Math.abs(Math.min(0, lowExcursionPct)) >= surgePct &&
    recoveryFromLowPct >= reversalPct &&
    closeLocation >= 0.42
  ) {
    pattern = "DIP_THEN_RECOVERY";
    explanation = "盘中先显著下探，随后从低位明显回升，收盘远离最低区域。";
  } else if (
    highEarlyEnough &&
    highIndex < lowIndex &&
    highExcursionPct >= meaningfulMovePct &&
    pullbackFromHighPct >= reversalPct
  ) {
    pattern = "UP_THEN_DOWN";
    explanation = "主要高位先出现，后半段回落幅度达到反转阈值。";
  } else if (
    lowEarlyEnough &&
    lowIndex < highIndex &&
    Math.abs(Math.min(0, lowExcursionPct)) >= meaningfulMovePct &&
    recoveryFromLowPct >= reversalPct
  ) {
    pattern = "DOWN_THEN_UP";
    explanation = "主要低位先出现，后半段反弹幅度达到反转阈值。";
  } else if (Math.abs(closeReturnPct) <= t.neutralPct) {
    pattern = "RANGE";
    explanation = "收盘变化位于中性阈值内，且未形成更强的反转路径。";
  } else if (closeReturnPct > 0 && (turns >= 2 || closeReturnPct < t.meaningfulMovePct)) {
    pattern = "RANGE_UP";
    explanation = "盘中多次反复，最终收于基准价格上方。";
  } else if (closeReturnPct < 0 && (turns >= 2 || Math.abs(closeReturnPct) < t.meaningfulMovePct)) {
    pattern = "RANGE_DOWN";
    explanation = "盘中多次反复，最终收于基准价格下方。";
  } else if (closeReturnPct > t.neutralPct) {
    pattern = "UP";
    explanation = "主要运行方向向上，未形成更强的冲高回落路径。";
  } else {
    pattern = "DOWN";
    explanation = "主要运行方向向下，未形成更强的探底回升路径。";
  }

  return {
    pattern,
    patternLabel: PATTERN_LABELS[pattern],
    direction: directionFromPattern(pattern),
    mainHighTime: bars[highIndex]?.localTime ?? null,
    mainLowTime: bars[lowIndex]?.localTime ?? null,
    sessionRangePct: Number(sessionRangePct.toFixed(4)),
    closeLocation: Number(closeLocation.toFixed(4)),
    closeReturnPct: Number(closeReturnPct.toFixed(4)),
    highExcursionPct: Number(highExcursionPct.toFixed(4)),
    lowExcursionPct: Number(lowExcursionPct.toFixed(4)),
    pullbackFromHighPct: Number(pullbackFromHighPct.toFixed(4)),
    recoveryFromLowPct: Number(recoveryFromLowPct.toFixed(4)),
    thresholds: t,
    explanation,
  };
}

const patternWords: Array<[RegExp, DailyAccuracyPattern]> = [
  [/冲高回落/, "SURGE_THEN_PULLBACK"],
  [/探底回升/, "DIP_THEN_RECOVERY"],
  [/先涨后跌/, "UP_THEN_DOWN"],
  [/先跌后涨/, "DOWN_THEN_UP"],
  [/震荡上涨/, "RANGE_UP"],
  [/震荡下跌/, "RANGE_DOWN"],
  [/震荡/, "RANGE"],
  [/上涨/, "UP"],
  [/下跌/, "DOWN"],
];

export function patternFromText(
  text: string,
  fallbackDirection: DailyAccuracyDirection
): { pattern: DailyAccuracyPattern; mode: "FULL_PATH" | "LEGACY_DIRECTION_ONLY" } {
  for (const [re, pattern] of patternWords) {
    if (re.test(text)) {
      return {
        pattern,
        mode: re.source === "上涨" || re.source === "下跌" ? "LEGACY_DIRECTION_ONLY" : "FULL_PATH",
      };
    }
  }
  return {
    pattern: fallbackDirection === "UP" ? "UP" : fallbackDirection === "DOWN" ? "DOWN" : "RANGE",
    mode: "LEGACY_DIRECTION_ONLY",
  };
}

export function inferPredictedPattern(record: DailyForecastRecord): {
  pattern: DailyAccuracyPattern;
  mode: "FULL_PATH" | "LEGACY_DIRECTION_ONLY";
} {
  if (record.predictedPattern) return { pattern: record.predictedPattern, mode: "FULL_PATH" };
  const text = [record.predictedPatternLabel, record.directionLabel, ...(record.expectedPath ?? []), record.summary]
    .filter(Boolean)
    .join(" ");
  return patternFromText(text, record.direction);
}

export function patternFamily(pattern: DailyAccuracyPattern): "UP" | "DOWN" | "FLAT" {
  return directionFromPattern(pattern);
}

const adjacentPairs = new Set([
  "DOWN_THEN_UP|DIP_THEN_RECOVERY",
  "DIP_THEN_RECOVERY|DOWN_THEN_UP",
  "UP_THEN_DOWN|SURGE_THEN_PULLBACK",
  "SURGE_THEN_PULLBACK|UP_THEN_DOWN",
  "UP|RANGE_UP",
  "RANGE_UP|UP",
  "DOWN|RANGE_DOWN",
  "RANGE_DOWN|DOWN",
]);

export function comparePatterns(input: {
  predicted: DailyAccuracyPattern;
  actual: DailyAccuracyPattern;
  validationMode: "FULL_PATH" | "LEGACY_DIRECTION_ONLY";
}): {
  verdict: Extract<DailyVerdict, "FULL_HIT" | "PARTIAL_HIT" | "MISS">;
  patternScore: number;
  pathScore: number;
  explanation: string;
} {
  const predictedFamily = patternFamily(input.predicted);
  const actualFamily = patternFamily(input.actual);

  if (input.validationMode === "LEGACY_DIRECTION_ONLY") {
    if (predictedFamily === actualFamily) {
      return {
        verdict: "FULL_HIT",
        patternScore: 40,
        pathScore: 0,
        explanation: "早期记录仅保存方向；方向一致，但不计入完整路径命中率。",
      };
    }
    return {
      verdict: "MISS",
      patternScore: 0,
      pathScore: 0,
      explanation: "早期记录仅保存方向，实际方向与预测相反。",
    };
  }

  if (input.predicted === input.actual) {
    return {
      verdict: "FULL_HIT",
      patternScore: 40,
      pathScore: 25,
      explanation: "实际走势类型与盘中顺序均与预测一致。",
    };
  }

  if (adjacentPairs.has(`${input.predicted}|${input.actual}`)) {
    return {
      verdict: "PARTIAL_HIT",
      patternScore: 30,
      pathScore: 20,
      explanation: "主要方向和路径接近，但强弱程度或形态等级不完全一致。",
    };
  }

  if (predictedFamily === actualFamily) {
    return {
      verdict: "PARTIAL_HIT",
      patternScore: 24,
      pathScore: 10,
      explanation: "方向族一致，但实际盘中路径与原预测不同。",
    };
  }

  return {
    verdict: "MISS",
    patternScore: 0,
    pathScore: 0,
    explanation: "实际主要方向或运行顺序与预测明显相反。",
  };
}
