import type { DailyAccuracyDirection, DailyAccuracyDirectionLabel } from "@/types/daily-accuracy";

export type WeeklyRollingDayStatus = "CLOSED" | "PENDING" | "VERIFIED";
export type WeeklyRollingDayMatch = "EXACT" | "PARTIAL" | "OPPOSITE" | "PENDING";
export type WeeklyRollingConfidence = "WAITING" | "EARLY" | "HIGH" | "MEDIUM" | "REVIEW";

export type WeeklyRollingDay = {
  date: string;
  marketClosed: boolean;
  predictedDirection: DailyAccuracyDirection | null;
  predictedLabel: DailyAccuracyDirectionLabel | null;
  predictionSource: "LOCKED_DAILY" | "WEEKLY_PLAN" | null;
  actualDirection: DailyAccuracyDirection | null;
  actualLabel: DailyAccuracyDirectionLabel | null;
  status: WeeklyRollingDayStatus;
  match: WeeklyRollingDayMatch;
  score: number | null;
};

export type WeeklyRollingVerification = {
  weeklyAnalysisId: string;
  assetId: string;
  assetName: string;
  symbol: string;
  weekStart: string;
  weekEnd: string;
  days: WeeklyRollingDay[];
  verifiedDays: number;
  exactDays: number;
  partialDays: number;
  oppositeDays: number;
  matchingPct: number | null;
  confidence: WeeklyRollingConfidence;
  conclusionZh: string;
  conclusionEn: string;
};
