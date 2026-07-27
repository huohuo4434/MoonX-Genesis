import type { LocalizedText } from "@/lib/i18n/config";

export const TECHNICAL_SIGNAL_TYPES = [
  "macd_bearish_divergence",
  "macd_bullish_divergence",
  "rsi_bearish_divergence",
  "rsi_bullish_divergence",
  "trend_breakout",
  "trend_breakdown",
  "support_test",
  "resistance_test",
  "multi_timeframe_bullish",
  "multi_timeframe_bearish",
  "volume_price_divergence",
  "momentum_weakening",
  "momentum_strengthening",
] as const;

export const TECHNICAL_SIGNAL_STATUSES = [
  "observing",
  "warning",
  "confirmed",
  "invalidated",
  "expired",
  "verified_hit",
  "verified_partial",
  "verified_miss",
] as const;

export const TECHNICAL_TIMEFRAMES = ["5m", "15m", "30m", "1h", "4h", "1d", "1w"] as const;
export const TECHNICAL_HORIZONS = ["short_term", "swing", "medium_term", "long_term"] as const;
export const TECHNICAL_OUTCOMES = ["hit", "partial", "miss", "invalidated"] as const;

export type TechnicalSignalType = (typeof TECHNICAL_SIGNAL_TYPES)[number];
export type TechnicalSignalStatus = (typeof TECHNICAL_SIGNAL_STATUSES)[number];
export type TechnicalTimeframe = (typeof TECHNICAL_TIMEFRAMES)[number];
export type TechnicalHorizon = (typeof TECHNICAL_HORIZONS)[number];
export type TechnicalOutcomeResult = (typeof TECHNICAL_OUTCOMES)[number];
export type TechnicalDirection = "bullish" | "bearish" | "neutral";

export interface TechnicalSignalStatusHistoryEntry {
  status: TechnicalSignalStatus;
  changedAt: string;
  note: LocalizedText;
}

export interface TechnicalSignalOutcome {
  verifiedAt?: string;
  result: TechnicalOutcomeResult;
  maxFavorableMovePercent?: number;
  maxAdverseMovePercent?: number;
  daysToResult?: number;
  notes?: LocalizedText;
}

export interface TechnicalSignal {
  id: string;
  assetId: string;
  symbol: string;
  signalType: TechnicalSignalType;
  direction: TechnicalDirection;
  timeframe: TechnicalTimeframe;
  horizon: TechnicalHorizon;
  detectedAt: string;
  observationStart?: string;
  confirmationDeadline?: string;
  verificationDate?: string;
  status: TechnicalSignalStatus;
  originalStatus: TechnicalSignalStatus;
  statusHistory: TechnicalSignalStatusHistoryEntry[];
  title: LocalizedText;
  summary: LocalizedText;
  evidence: LocalizedText[];
  priceStructure?: LocalizedText;
  indicatorStructure?: LocalizedText;
  supportLevels?: number[];
  resistanceLevels?: number[];
  targetLevels?: number[];
  confirmationConditions: LocalizedText[];
  invalidationConditions: LocalizedText[];
  riskNotes?: LocalizedText[];
  framework: "technical_structure";
  sourceType: "manual_research";
  sourceLabel?: LocalizedText;
  sourceRecordIds?: string[];
  evidenceScore?: number;
  timeframeWeight?: number;
  signalStrength?: number;
  outcome?: TechnicalSignalOutcome;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicalVerificationRecord {
  signalId: string;
  originalStatus: TechnicalSignalStatus;
  confirmationConditions: LocalizedText[];
  invalidationConditions: LocalizedText[];
  verificationDate: string;
  outcome: TechnicalSignalOutcome;
}

export interface TechnicalSignalStrengthInput {
  clarity: number;
  priceConfirmation: number;
  indicatorConfluence: number;
  timeframeConfluence: number;
  riskCompleteness: number;
  status: TechnicalSignalStatus;
  timeframe: TechnicalTimeframe;
  sameDirectionTimeframes?: number;
}

export interface TechnicalSignalAggregate {
  shortTermDirection: TechnicalDirection;
  swingDirection: TechnicalDirection;
  mediumTermDirection: TechnicalDirection;
  longTermDirection: TechnicalDirection;
  overallStrength: number;
  conflictLevel: "none" | "moderate" | "high";
  summary: LocalizedText;
  primaryRisk: LocalizedText;
  confirmationNeeded: LocalizedText;
}

export interface TechnicalVerificationStats {
  totalSignals: number;
  completedVerifications: number;
  hits: number;
  partials: number;
  misses: number;
  invalidated: number;
  byTimeframe: Partial<Record<TechnicalTimeframe, number>>;
  byType: Partial<Record<TechnicalSignalType, number>>;
}
