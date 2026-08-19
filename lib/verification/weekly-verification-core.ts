import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import type { WeeklyOverallDirection } from "@/types/weekly-analysis";

export function resolveWeeklyVerificationMarket(symbol: string): DailyAccuracyMarket {
  if (["BTC", "ETH"].includes(symbol)) return "CRYPTO";
  if (["000001.SS", "SHCOMP"].includes(symbol)) return "CN";
  if (symbol === "HSTECH") return "HK";
  if (["WTI", "GOLD", "SILVER"].includes(symbol)) return "US_FUTURES";
  return "US";
}

export function classifyWeeklyPath(bars: ReadonlyArray<{ open: number; high: number; low: number; close: number }>): string {
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
  if (lowIndex < highIndex && change > 0.003) return "先跌后涨";
  if (highIndex < lowIndex && change < -0.003) return "先涨后跌";
  if (change > 0.012) return "上涨";
  if (change < -0.012) return "下跌";
  if (change > 0.003) return "震荡上涨";
  if (change < -0.003) return "震荡下跌";
  return "震荡";
}

// MOOX_V72066_WEEKLY_END_DIRECTION_FIRST
function directionFamily(pattern: string): "UP" | "DOWN" | "RANGE" {
  if (/先跌后涨|探底回升|震荡上涨|上涨/.test(pattern)) return "UP";
  if (/先涨后跌|冲高回落|震荡下跌|下跌/.test(pattern)) return "DOWN";
  return "RANGE";
}

function isSwingUp(pattern: string): boolean {
  return /震荡上涨|先跌后涨|探底回升/.test(pattern);
}

function isSwingDown(pattern: string): boolean {
  return /震荡下跌|先涨后跌|冲高回落/.test(pattern);
}

/**
 * Weekly verification V2:
 * 1) End-of-week net direction is the primary contract for 上涨/下跌/震荡上涨/震荡下跌.
 * 2) "震荡上涨" does not require one specific intrawweek order. 先跌后涨/探底回升 with a net-up close
 *    is a full hit because it is a volatile week that ultimately finished higher.
 * 3) Exact path order is only a hard requirement when the forecast explicitly says 先跌后涨/探底回升
 *    or 先涨后跌/冲高回落.
 */
export function scoreWeeklyVerification(predicted: WeeklyOverallDirection, actual: string) {
  if (predicted === "暂无判断" || predicted === "观望") {
    return { result: "UNVERIFIABLE", directionScore: 0, pathScore: 0, totalScore: 0 } as const;
  }

  if (predicted === actual) {
    return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
  }

  const actualFamily = directionFamily(actual);

  // Generic direction forecasts do not impose an intrawweek path requirement.
  if (predicted === "上涨" && actualFamily === "UP") {
    return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
  }
  if (predicted === "下跌" && actualFamily === "DOWN") {
    return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
  }

  // A choppy forecast is about both net direction and the presence of intrawweek swings,
  // not one mandatory order of the high/low. This is the key V2 correction.
  if (predicted === "震荡上涨") {
    if (isSwingUp(actual)) {
      return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
    }
    if (actualFamily === "UP") {
      return { result: "PARTIAL_HIT", directionScore: 50, pathScore: 25, totalScore: 75 } as const;
    }
  }
  if (predicted === "震荡下跌") {
    if (isSwingDown(actual)) {
      return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
    }
    if (actualFamily === "DOWN") {
      return { result: "PARTIAL_HIT", directionScore: 50, pathScore: 25, totalScore: 75 } as const;
    }
  }

  if (predicted === "震荡") {
    if (actual === "震荡") {
      return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
    }
    if (/震荡上涨|震荡下跌/.test(actual)) {
      return { result: "PARTIAL_HIT", directionScore: 35, pathScore: 35, totalScore: 70 } as const;
    }
    if (/先跌后涨|探底回升|先涨后跌|冲高回落/.test(actual)) {
      return { result: "PARTIAL_HIT", directionScore: 30, pathScore: 30, totalScore: 60 } as const;
    }
  }

  // Explicit sequence forecasts still need the predicted reversal order for a full hit.
  if (predicted === "先跌后涨" || predicted === "探底回升") {
    if (/先跌后涨|探底回升/.test(actual)) {
      return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
    }
    if (actualFamily === "UP") {
      return { result: "PARTIAL_HIT", directionScore: 45, pathScore: 20, totalScore: 65 } as const;
    }
  }
  if (predicted === "先涨后跌" || predicted === "冲高回落") {
    if (/先涨后跌|冲高回落/.test(actual)) {
      return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
    }
    if (actualFamily === "DOWN") {
      return { result: "PARTIAL_HIT", directionScore: 45, pathScore: 20, totalScore: 65 } as const;
    }
  }

  return { result: "MISS", directionScore: 0, pathScore: 0, totalScore: 0 } as const;
}
