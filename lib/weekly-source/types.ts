export type WeeklySourceStatus = "DRAFT" | "PUBLISHED" | "LOCKED" | "ARCHIVED";
export type WeeklySourceType = "LIUYAO_WEEKLY" | "WEEKLY_ANALYSIS";

export type MarketProgressStatus =
  | "NOT_STARTED"
  | "ON_TRACK"
  | "AHEAD"
  | "DELAYED"
  | "INVALIDATED";

export type GeneratedDailyStatus = "DRAFT" | "PUBLISHED" | "LOCKED" | "ARCHIVED";

export type WeeklyForecastSourceRecord = {
  id: string;
  marketCode: string;
  periodStart: string;
  periodEnd: string;
  primaryHexagram: string | null;
  changedHexagram: string | null;
  movingLines: number[];
  specialPatterns: string[];
  weeklyDirection: string;
  weeklyPath: string;
  interpretation: string;
  riskSummary: string;
  /** Explicit teacher-authored daily path. Never derive or fabricate when absent. */
  dailyPath?: Array<{
    date: string;
    direction: string;
    summary: string;
    riskNote?: string | null;
  }>;
  sourceType: WeeklySourceType;
  version: number;
  status: WeeklySourceStatus;
  publishedAt: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEvidence = {
  calendarDateChina: string;
  dayStem: string;
  dayBranch: string;
  dayElement: string;
  ganzhiLabel: string;
  relationToWeekly: "增强" | "减弱" | "不变";
  note: string;
};

export type GeneratedDailyForecastRecord = {
  id: string;
  marketCode: string;
  forecastDate: string;
  sourceWeeklyForecastId: string;
  direction: string;
  upProbability: number;
  sidewaysProbability: number;
  downProbability: number;
  expectedPath: string;
  supportLevels: string[];
  resistanceLevels: string[];
  confirmationLevel: string | null;
  invalidationLevel: string | null;
  riskLevel: string | null;
  catalysts: string[];
  risks: string[];
  liuyaoEvidence: string | null;
  qimenEvidence: string | null;
  calendarEvidence: CalendarEvidence | null;
  technicalEvidence: string | null;
  newsEvidence: string | null;
  marketProgressStatus: MarketProgressStatus;
  revisionReason: string | null;
  previousVersionId: string | null;
  version: number;
  status: GeneratedDailyStatus;
  generatedAt: string;
  publishedAt: string | null;
  lockedAt: string | null;
  validatedAt: string | null;
  validationStatus: string | null;
};
