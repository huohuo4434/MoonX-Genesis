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

function directionFamily(pattern: string): "UP" | "DOWN" | "RANGE" {
  if (/先跌后涨|探底回升|震荡上涨|上涨/.test(pattern)) return "UP";
  if (/先涨后跌|冲高回落|震荡下跌|下跌/.test(pattern)) return "DOWN";
  return "RANGE";
}

export function scoreWeeklyVerification(predicted: WeeklyOverallDirection, actual: string) {
  if (predicted === actual) return { result: "FULL_HIT", directionScore: 50, pathScore: 40, totalScore: 90 } as const;
  if (directionFamily(predicted) === directionFamily(actual)) return { result: "PARTIAL_HIT", directionScore: 45, pathScore: 20, totalScore: 65 } as const;
  if (predicted === "震荡" && /震荡/.test(actual)) return { result: "PARTIAL_HIT", directionScore: 35, pathScore: 20, totalScore: 55 } as const;
  return { result: "MISS", directionScore: 0, pathScore: 0, totalScore: 0 } as const;
}
