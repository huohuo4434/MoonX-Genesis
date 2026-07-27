import type {
  TechnicalDirection,
  TechnicalSignal,
  TechnicalSignalAggregate,
  TechnicalSignalStrengthInput,
  TechnicalSignalStatus,
  TechnicalTimeframe,
  TechnicalVerificationStats,
} from "@/types/technical-signal";

const TIMEFRAME_WEIGHTS: Record<TechnicalTimeframe, number> = {
  "5m": 0.35,
  "15m": 0.45,
  "30m": 0.55,
  "1h": 0.65,
  "4h": 0.8,
  "1d": 1,
  "1w": 1.1,
};

const STATUS_CAPS: Partial<Record<TechnicalSignalStatus, number>> = {
  observing: 55,
  warning: 70,
  confirmed: 85,
};

export function getTechnicalTimeframeWeight(timeframe: TechnicalTimeframe): number {
  return TIMEFRAME_WEIGHTS[timeframe];
}

export function calculateTechnicalSignalStrength(input: TechnicalSignalStrengthInput): number {
  const raw =
    Math.min(25, Math.max(0, input.clarity)) +
    getTechnicalTimeframeWeight(input.timeframe) / 1.1 * 20 +
    Math.min(20, Math.max(0, input.priceConfirmation)) +
    Math.min(15, Math.max(0, input.indicatorConfluence)) +
    Math.min(10, Math.max(0, input.timeframeConfluence)) +
    Math.min(10, Math.max(0, input.riskCompleteness));
  const multiTimeframeCap = (input.sameDirectionTimeframes ?? 0) >= 2 ? 95 : 85;
  const statusCap = STATUS_CAPS[input.status] ?? multiTimeframeCap;
  return Math.round(Math.min(raw, statusCap, multiTimeframeCap));
}

function localized(zhCN: string, en: string, zhTW = zhCN): TechnicalSignalAggregate["summary"] {
  return { zhCN, zhTW, en };
}

function directionFor(signals: TechnicalSignal[]): TechnicalDirection {
  const active = signals.filter((signal) => !["invalidated", "expired", "verified_miss"].includes(signal.status));
  if (active.length === 0) return "neutral";
  const total = active.reduce((score, signal) => {
    const strength = signal.signalStrength ?? 0;
    const sign = signal.direction === "bullish" ? 1 : signal.direction === "bearish" ? -1 : 0;
    return score + sign * strength * getTechnicalTimeframeWeight(signal.timeframe);
  }, 0);
  return total > 0 ? "bullish" : total < 0 ? "bearish" : "neutral";
}

export function aggregateTechnicalSignals(signals: TechnicalSignal[]): TechnicalSignalAggregate {
  const shortTerm = signals.filter((signal) => signal.horizon === "short_term");
  const swing = signals.filter((signal) => signal.horizon === "swing");
  const mediumTerm = signals.filter((signal) => signal.horizon === "medium_term");
  const longTerm = signals.filter((signal) => signal.horizon === "long_term");
  const shortTermDirection = directionFor(shortTerm);
  const swingDirection = directionFor(swing);
  const mediumTermDirection = directionFor(mediumTerm);
  const longTermDirection = directionFor(longTerm);
  const directions = [shortTermDirection, swingDirection, mediumTermDirection, longTermDirection].filter(
    (direction) => direction !== "neutral"
  );
  const conflictLevel =
    directions.includes("bullish") && directions.includes("bearish")
      ? (shortTerm.length > 0 && (mediumTerm.length > 0 || longTerm.length > 0) ? "high" : "moderate")
      : "none";
  const strength = signals.length
    ? Math.round(signals.reduce((total, signal) => total + (signal.signalStrength ?? 0), 0) / signals.length)
    : 0;

  return {
    shortTermDirection,
    swingDirection,
    mediumTermDirection,
    longTermDirection,
    overallStrength: strength,
    conflictLevel,
    summary:
      conflictLevel === "high"
        ? localized(
            "小周期与中长期周期存在方向冲突；应将当前信号视为结构观察，而非单独确认趋势反转。",
            "Lower and higher timeframes conflict; treat the signal as structural observation, not a standalone trend-reversal confirmation."
          )
        : localized("当前仅汇总人工录入的技术结构研究，不代表实时行情判断。", "This summary only aggregates manually curated technical-structure research, not live market data."),
    primaryRisk: localized("需等待已录入的确认条件或失效条件触发。", "Wait for the recorded confirmation or invalidation conditions."),
    confirmationNeeded: localized("以原始研究记录中的确认条件为准。", "Use the confirmation conditions recorded with the original research signal."),
  };
}

export function calculateTechnicalVerificationStats(signals: TechnicalSignal[]): TechnicalVerificationStats {
  const completed = signals.filter((signal) => Boolean(signal.outcome));
  return {
    totalSignals: signals.length,
    completedVerifications: completed.length,
    hits: completed.filter((signal) => signal.outcome?.result === "hit").length,
    partials: completed.filter((signal) => signal.outcome?.result === "partial").length,
    misses: completed.filter((signal) => signal.outcome?.result === "miss").length,
    invalidated: completed.filter((signal) => signal.outcome?.result === "invalidated").length,
    byTimeframe: signals.reduce<TechnicalVerificationStats["byTimeframe"]>((result, signal) => {
      result[signal.timeframe] = (result[signal.timeframe] ?? 0) + 1;
      return result;
    }, {}),
    byType: signals.reduce<TechnicalVerificationStats["byType"]>((result, signal) => {
      result[signal.signalType] = (result[signal.signalType] ?? 0) + 1;
      return result;
    }, {}),
  };
}
