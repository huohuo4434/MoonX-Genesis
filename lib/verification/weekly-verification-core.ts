import type { DailyAccuracyMarket } from "@/types/daily-accuracy";

export const WEEKLY_SCORE_VERSION = "WEEKLY_SCORE_V3_BALANCED_PARTIAL";

export type WeeklyVerificationScore = {
  result: "FULL_HIT" | "PARTIAL_HIT" | "MISS" | "UNVERIFIABLE";
  directionScore: number;
  pathScore: number;
  totalScore: number;
};

type DirectionFamily = "UP" | "DOWN" | "RANGE";

const WAIT_PATTERNS = new Set(["暂无判断", "观望"]);
const UP_PATTERNS = new Set(["上涨", "震荡上涨", "先跌后涨", "探底回升"]);
const DOWN_PATTERNS = new Set(["下跌", "震荡下跌", "先涨后跌", "冲高回落"]);
const CHOPPY_PATTERNS = new Set(["震荡", "震荡上涨", "震荡下跌", "先跌后涨", "探底回升", "先涨后跌", "冲高回落"]);
const CHOPPY_DIRECTIONAL_PATTERNS = new Set(["震荡上涨", "震荡下跌"]);

export function resolveWeeklyVerificationMarket(symbol: string): DailyAccuracyMarket {
  if (["BTC", "ETH"].includes(symbol)) return "CRYPTO";
  if (["000001.SS", "SHCOMP"].includes(symbol)) return "CN";
  if (symbol === "HSTECH") return "HK";
  if (["WTI", "GOLD", "SILVER"].includes(symbol)) return "US_FUTURES";
  return "US";
}

export function classifyWeeklyPath(
  bars: ReadonlyArray<{ open: number; high: number; low: number; close: number }>
): string {
  if (!bars.length) return "UNVERIFIABLE";
  const first = bars[0]!;
  const last = bars.at(-1)!;
  const weekHigh = Math.max(...bars.map((bar) => bar.high));
  const weekLow = Math.min(...bars.map((bar) => bar.low));
  const highIndex = bars.findIndex((bar) => bar.high === weekHigh);
  const lowIndex = bars.findIndex((bar) => bar.low === weekLow);
  const change = (last.close - first.open) / Math.max(first.open, 1e-9);
  const range = (weekHigh - weekLow) / Math.max(first.open, 1e-9);

  if (range < 0.015) return "震荡";
  // Reversal labels are only emitted when the final weekly direction confirms the reversal.
  if (lowIndex < highIndex && change > 0.003) return "先跌后涨";
  if (highIndex < lowIndex && change < -0.003) return "先涨后跌";
  if (change > 0.012) return "上涨";
  if (change < -0.012) return "下跌";
  if (change > 0.003) return "震荡上涨";
  if (change < -0.003) return "震荡下跌";
  return "震荡";
}

function directionFamily(pattern: string): DirectionFamily {
  if (UP_PATTERNS.has(pattern)) return "UP";
  if (DOWN_PATTERNS.has(pattern)) return "DOWN";
  return "RANGE";
}

export function weeklyDirectionMatches(predicted: string, actual: string): boolean {
  if (WAIT_PATTERNS.has(predicted) || !actual || actual === "UNVERIFIABLE") return false;
  return directionFamily(predicted) === directionFamily(actual);
}

function isChoppy(pattern: string): boolean {
  return CHOPPY_PATTERNS.has(pattern);
}

function isPureTrend(pattern: string): boolean {
  return pattern === "上涨" || pattern === "下跌";
}

function isFullEquivalent(predicted: string, actual: string): boolean {
  if (predicted === actual) return true;
  if (["先跌后涨", "探底回升"].includes(predicted) && ["先跌后涨", "探底回升"].includes(actual)) return true;
  if (["先涨后跌", "冲高回落"].includes(predicted) && ["先涨后跌", "冲高回落"].includes(actual)) return true;
  return false;
}

/**
 * Weekly verification V3.
 *
 * Full hit is intentionally strict: the path itself must match (or be a true alias).
 * Partial hit is used when a meaningful component matched:
 * - same final weekly direction but a different path;
 * - a choppy directional forecast got the choppy/reversal character right but final direction wrong;
 * - a trend forecast finished flat/range instead of reversing against the forecast.
 *
 * This prevents both extremes:
 * - "same direction = full hit" is too generous;
 * - "not exact = miss" is too harsh.
 */
export function scoreWeeklyVerification(predicted: string, actual: string): WeeklyVerificationScore {
  if (WAIT_PATTERNS.has(predicted) || !actual || actual === "UNVERIFIABLE") {
    return { result: "UNVERIFIABLE", directionScore: 0, pathScore: 0, totalScore: 0 };
  }

  if (isFullEquivalent(predicted, actual)) {
    return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 };
  }

  const predictedFamily = directionFamily(predicted);
  const actualFamily = directionFamily(actual);

  // Final weekly direction matched, but the path did not.
  if (predictedFamily !== "RANGE" && predictedFamily === actualFamily) {
    return { result: "PARTIAL_HIT", directionScore: 45, pathScore: 20, totalScore: 65 };
  }

  // "震荡" is a structural forecast. A reversal/choppy week is partial, not full.
  if (predicted === "震荡" && isChoppy(actual)) {
    return { result: "PARTIAL_HIT", directionScore: 25, pathScore: 35, totalScore: 60 };
  }

  // A choppy directional forecast can partially match the week's swing character
  // even when the final direction finished the other way.
  if (CHOPPY_DIRECTIONAL_PATTERNS.has(predicted) && isChoppy(actual)) {
    return { result: "PARTIAL_HIT", directionScore: 10, pathScore: 35, totalScore: 45 };
  }

  // If the market only ranged, a directional/choppy forecast was not fully realized,
  // but it also did not finish in the opposite directional family.
  if (actual === "震荡" && (isPureTrend(predicted) || isChoppy(predicted))) {
    return { result: "PARTIAL_HIT", directionScore: 15, pathScore: 25, totalScore: 40 };
  }

  return { result: "MISS", directionScore: 0, pathScore: 0, totalScore: 0 };
}

export function explainWeeklyVerification(
  predicted: string,
  actual: string,
  score = scoreWeeklyVerification(predicted, actual)
): string {
  if (score.result === "FULL_HIT") {
    return `预测${predicted}，实际${actual}：最终方向和周内路径一致，完全命中。`;
  }
  if (score.result === "UNVERIFIABLE") {
    return `预测${predicted}，实际${actual || "数据不足"}：不进入准确率分母。`;
  }

  const predictedFamily = directionFamily(predicted);
  const actualFamily = directionFamily(actual);

  if (score.result === "PARTIAL_HIT") {
    if (predictedFamily !== "RANGE" && predictedFamily === actualFamily) {
      return `预测${predicted}，实际${actual}：最终方向一致，但周内路径不同，部分命中。`;
    }
    if (CHOPPY_DIRECTIONAL_PATTERNS.has(predicted) && isChoppy(actual)) {
      return `预测${predicted}，实际${actual}：震荡/反转特征出现，但最终方向不同，部分命中。`;
    }
    if (actual === "震荡") {
      return `预测${predicted}，实际震荡：方向没有完整兑现，但也未形成反向趋势，部分命中。`;
    }
    return `预测${predicted}，实际${actual}：震荡特征命中，但具体方向或路径不同，部分命中。`;
  }

  return `预测${predicted}，实际${actual}：最终方向相反，且路径没有达到部分命中条件，未命中。`;
}
