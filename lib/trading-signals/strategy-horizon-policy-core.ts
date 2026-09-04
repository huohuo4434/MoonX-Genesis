import type { ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";
import type { PredictionStrategyPlan } from "@/types/prediction-auto-trader";
import type { AnnualForecastRoadmap } from "@/lib/research/annual-forecast-roadmap-2026";
import { isFormallyLockedForecast } from "@/lib/trading-signals/formal-forecast-lock-core";

export const STRATEGY_HOLDING_CAP_MINUTES = { INTRADAY: 90, SWING: 3 * 24 * 60, POSITION: 28 * 24 * 60 } as const;

export function positionContextEligibility(input: {
  strategy: ThreeHorizonStrategyType; direction: string;
  plan: PredictionStrategyPlan | null | undefined;
  roadmap: AnnualForecastRoadmap | null | undefined; nowMs: number;
}): { allowed: boolean; reason: string } {
  if (input.strategy !== "POSITION") return { allowed: true, reason: "" };
  const week = input.plan?.weeklyForecast;
  const start = Date.parse(`${week?.periodStart}T00:00:00+08:00`);
  const end = Date.parse(`${week?.periodEnd}T23:59:59+08:00`);
  if (!week || !Number.isFinite(input.nowMs) || ![start, end].every(Number.isFinite)
    || !isFormallyLockedForecast({ ...week, nowMs: input.nowMs })
    || start > input.nowMs || end <= input.nowMs
    || input.plan?.weeklyDirection !== input.direction || !["LONG", "SHORT"].includes(input.direction)) {
    return { allowed: false, reason: "长线等待有效周方向与月方向同向，不把短期逆向波动当成长线入场。" };
  }
  return annualPositionWindow(input);
}

export function cappedHoldingMinutes(strategy: ThreeHorizonStrategyType, configured: number): number {
  const cap = STRATEGY_HOLDING_CAP_MINUTES[strategy];
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, cap) : cap;
}

// This is only an additional veto. A matching annual month never grants a side,
// changes a forecast, or bypasses monthly authority / technical / account gates.
export function annualPositionWindow(input: {
  strategy: ThreeHorizonStrategyType;
  direction: string;
  roadmap: AnnualForecastRoadmap | null | undefined;
  nowMs: number;
}): { allowed: boolean; reason: string } {
  if (input.strategy !== "POSITION") return { allowed: true, reason: "" };
  const { roadmap, nowMs } = input;
  const published = Date.parse(roadmap?.publishedAt ?? "");
  if (!Number.isFinite(nowMs) || !roadmap?.locked || !Number.isFinite(published) || published > nowMs) {
    return { allowed: false, reason: "长线等待可核验的年度高低点窗口。" };
  }
  const month = new Date(nowMs + 8 * 60 * 60_000).toISOString().slice(0, 7);
  const windows = input.direction === "LONG" ? roadmap.lowMonthCandidates
    : input.direction === "SHORT" ? roadmap.highMonthCandidates : [];
  return roadmap.months.some((row) => row.month === month) && windows.includes(month)
    ? { allowed: true, reason: "年度候选月份匹配，仍须月方向、周节奏和入场风控确认。" }
    : { allowed: false, reason: `长线等待年度${input.direction === "LONG" ? "低位" : "高位"}候选月份；当前${month}不符合。` };
}

// Freeze at submission, never extend an existing position on a new forecast.
export function newPositionHoldingDeadline(input: {
  strategy: ThreeHorizonStrategyType;
  forecastValidUntil: string | null | undefined;
  configuredMinutes: number;
  nowMs: number;
}): number | null {
  // The caller must pass the exact approved plan, not recompute from a newer forecast.
  const end = Date.parse(input.forecastValidUntil ?? "");
  if (!Number.isFinite(input.nowMs) || !Number.isFinite(end) || end <= input.nowMs) return null;
  return Math.min(end, input.nowMs + cappedHoldingMinutes(input.strategy, input.configuredMinutes) * 60_000);
}
