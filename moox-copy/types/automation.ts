/** Automation / review / learning types for MoonX daily cycle. */

import type { DailyAccuracyDirection, DailyVerdict } from "@/types/daily-accuracy";

export type AutomationSettings = {
  autoForecastEnabled: boolean;
  autoPublishEnabled: boolean;
  autoVerifyEnabled: boolean;
  autoReviewEnabled: boolean;
  autoLearningEnabled: boolean;
  updatedAt: string;
};

export type BiasCode =
  | "overweight_hexagram_name"
  | "wrong_use_god"
  | "ignored_world_response"
  | "ignored_month_day_strength"
  | "ignored_moving_line"
  | "misread_transformation"
  | "ignored_progress_regress"
  | "ignored_void_break_tomb"
  | "ignored_clash_combine"
  | "overprecise_daily_timing"
  | "macro_override"
  | "technical_structure_conflict"
  | "market_regime_mismatch"
  | "price_target_overreach"
  | "insufficient_evidence";

export const BIAS_LABELS: Record<BiasCode, string> = {
  overweight_hexagram_name: "过度依赖卦名和卦辞",
  wrong_use_god: "用神选择不准确",
  ignored_world_response: "忽略世应关系",
  ignored_month_day_strength: "忽略月建、日辰和旺衰",
  ignored_moving_line: "忽略关键动爻",
  misread_transformation: "动爻和变爻关系理解错误",
  ignored_progress_regress: "忽略化进、化退",
  ignored_void_break_tomb: "忽略旬空、月破、入墓",
  ignored_clash_combine: "忽略冲、合、刑和三合局",
  overprecise_daily_timing: "对逐日触发拆解过于精确",
  macro_override: "突发宏观事件覆盖原有节奏",
  technical_structure_conflict: "六爻方向与K线结构冲突时处理不当",
  market_regime_mismatch: "没有考虑趋势市、震荡市或极端波动环境",
  price_target_overreach: "价格目标推断过度",
  insufficient_evidence: "原始依据不足却给出强结论",
};

export type InterpretationBias = {
  code: BiasCode;
  severity: 1 | 2 | 3;
  evidence: string;
};

export type PathVerdict =
  | "FIRST_UP_THEN_DOWN"
  | "FIRST_DOWN_THEN_UP"
  | "TREND_UP"
  | "TREND_DOWN"
  | "WIDE_RANGE"
  | "NARROW_RANGE"
  | "INSUFFICIENT_DATA";

export type DailyReviewRecord = {
  id: string;
  forecastId: string;
  assetName: string;
  symbol: string;
  forecastDate: string;
  originalForecast: {
    direction: string;
    directionLabel?: string;
    confidence?: number;
    summary?: string;
    expectedPath?: string[];
  };
  actualResult: {
    returnPct: number;
    actualDirection: DailyAccuracyDirection;
    close: number;
    previousClose: number;
  };
  directionVerdict: DailyVerdict;
  pathVerdict: PathVerdict;
  pathVerdictLabel: string;
  whatWasCorrect: string;
  whatWasWrong: string;
  interpretationBiases: InterpretationBias[];
  marketOverrides: string[];
  lessonSummary: string;
  futureCaution: string;
  confidenceAdjustment: number;
  similarCaseKey: string;
  createdAt: string;
};

export type LearningCase = {
  id: string;
  assetClass: string;
  assetName: string;
  horizon: "daily" | "weekly" | "monthly" | "annual";
  primaryHexagram?: string;
  changedHexagram?: string;
  primaryUseGod?: string;
  worldLine?: string;
  responseLine?: string;
  movingLinePatterns?: string[];
  monthBranch?: string;
  dayBranch?: string;
  voidBranches?: string[];
  keyStructures?: string[];
  marketRegime?: string;
  forecastDirection: string;
  actualDirection: string;
  verdict: DailyVerdict;
  interpretationBiases: InterpretationBias[];
  lessonSummary: string;
  futureCaution: string;
  confidenceAdjustment: number;
  similarCaseKey: string;
  createdAt: string;
};

export type AutomationRun = {
  runKey: string;
  task: string;
  status: "success" | "skipped" | "failed";
  message?: string;
  startedAt: string;
  finishedAt: string;
  meta?: Record<string, unknown>;
};

export type LearningAdjustment = {
  similarCaseCount: number;
  historicalHitRate: number | null;
  commonBiases: string[];
  topCaution: string | null;
  confidenceDelta: number;
  notes: string[];
};

export type GeneratedForecastDraft = {
  id: string;
  forecastDate: string;
  assetName: string;
  symbol: string;
  market: "CRYPTO" | "US" | "CN" | "HK" | "US_FUTURES";
  direction: "UP" | "DOWN" | "FLAT" | "ABSTAIN";
  directionLabel: "上涨" | "下跌" | "震荡" | "暂无判断" | "观望";
  probabilities: { up: number; flat: number; down: number };
  confidence: number;
  headline: string;
  summary: string;
  expectedPath: string[];
  invalidation: string;
  sourceIds: string[];
  sourceType: "cycle_derivation" | "user_hexagram" | "teacher" | "technical" | "composite" | "insufficient";
  sourceLabel: string;
  generatedAt: string;
  cutoffAt: string;
  status: "published" | "abstain";
  visibility: "member" | "public";
  accuracyEligible: boolean;
  originalVersion: number;
  learningAdjustments: LearningAdjustment;
  quoteSymbol: string;
};

export const PATH_VERDICT_LABELS: Record<PathVerdict, string> = {
  FIRST_UP_THEN_DOWN: "先涨后跌",
  FIRST_DOWN_THEN_UP: "先跌后涨",
  TREND_UP: "单边上涨",
  TREND_DOWN: "单边下跌",
  WIDE_RANGE: "宽幅震荡",
  NARROW_RANGE: "窄幅震荡",
  INSUFFICIENT_DATA: "数据不足，待人工确认",
};
