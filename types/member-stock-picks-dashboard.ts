import type { ChanCandle } from "@/types/chan-execution";

export type StockPickSourcePriority = "TEACHER" | "USER_INTERPRETED" | "MISSING";

export type StockPickPeriodView = {
  direction: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  summary: string;
  expectedPath: string | null;
  sourcePriority: StockPickSourcePriority;
  sourceLabel: string;
  version: number | null;
  authority: "INDEPENDENT_PERIOD" | "HIGHER_HORIZON_DERIVED" | "MISSING";
};

export type StockPickDailyMethodRow = {
  date: string;
  state: "OCCURRED" | "TODAY" | "PENDING" | "MISSING";
  derivedDirection: string | null;
  derivedSummary: string;
  qimenDirection: string | null;
  qimenSummary: string;
  relation: "RESONANCE" | "DIVERGENCE" | "LIUYAO_MISSING" | "NOT_COMPARABLE";
  relationLabel: string;
};

export type StockPickAnnualView = {
  direction: string | null;
  summary: string;
  remainingYearPath: string | null;
  highMonthCandidates: readonly string[];
  lowMonthCandidates: readonly string[];
  months: ReadonlyArray<{ month: string; direction: string; note: string }>;
};

export type MemberStockPickResearchRow = {
  slug: string;
  nameZh: string;
  nameEn: string;
  symbol: string;
  detailHref: string;
  rating: string;
  riskLevel: string;
  annual: StockPickAnnualView;
  monthly: StockPickPeriodView;
  weekly: StockPickPeriodView;
  currentStage: {
    label: string;
    note: string;
    progressPct: number | null;
  };
  hierarchy: {
    officialDirection: string;
    authority: "WEEK" | "MONTH" | "YEAR" | "MISSING";
    confidence: "HIGH" | "MEDIUM" | "LOW";
    confidenceLabel: string;
    note: string;
  };
  dailyMethods: StockPickDailyMethodRow[];
  technicalKey: string;
  forecastShapeBasis: "DAILY_PATH" | "WEEK_DIRECTION" | "MONTH_DIRECTION" | "MISSING";
  forecastPath: Array<{ date: string; direction: string; summary: string }>;
  dataCompleteness: "READY" | "PARTIAL" | "MISSING";
};

export type MemberStockPathSnapshot = {
  key: string;
  symbol: string;
  capturedAt: string;
  dailyCandles: ChanCandle[];
  chan4h: {
    labelZh: string;
    direction: "BULL" | "BEAR" | "NEUTRAL";
    confirmation: number | null;
    invalidation: number | null;
    waitingFor: string;
  } | null;
  error: string | null;
};
