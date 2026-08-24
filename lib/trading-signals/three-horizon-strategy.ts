import "server-only";

import { LIVE_COMMISSIONING_MAX_HOLDING_MINUTES, LIVE_COMMISSIONING_RISK_PCT } from "@/lib/trading-signals/live-commissioning-safety";
import {
  beginLiveScanRound,
  LiveScanReadDeadlineError,
  readWithinLiveScanDeadline,
  runLiveScanSymbolStep,
  selectOpportunityBatchWithinDeadline,
} from "@/lib/trading-signals/live-scan-rotation-core";
import { isRecoverableLegacyTimeExit } from "@/lib/trading-signals/legacy-time-exit-recovery-core";
import {
  createStrategyProgressReporter,
  type ThreeHorizonProgress,
} from "@/lib/trading-signals/strategy-runtime-progress-core";
import { postPlanDecisionRequiresSync } from "@/lib/trading-signals/ai-plan-dynamic-sync-core";
import {
  runTp1ProtectionTransition,
  shouldRunTp1ProtectionTransition,
} from "@/lib/trading-signals/tp1-protection-transition-core";
import { randomUUID } from "crypto";
import { runNewEntryBeforeCutoff } from "@/lib/bitget/runtime-deadline-core";
import {
  applyWeeklyTimingToEntryEligibility,
  evaluateNewExposureSafety,
  evaluateWeeklyLongEntryTiming,
  isExposureLedgerConsistent,
  type NewExposureAction,
} from "@/lib/trading-signals/weekly-long-entry-timing-core";
import { resolveFormalExternalOverlayDirection } from "@/lib/trading-signals/external-analyst-aggregation-core";
import {
  applyAuxiliaryDirectionConflictGuard,
  isActivityPromotionEligible,
  resolveIntradayExecutionDirection,
} from "@/lib/trading-signals/intraday-direction-authority-core";
import { isUnifiedLiveActiveExecutionEnabled } from "@/lib/trading-signals/unified-live-config";
import { protectExecutionLifecycleStatus } from "@/lib/trading-signals/decision-status-transition-core";
import { prisma } from "@/lib/prisma";
import {
  cancelBitgetDemoStrategyOrder,
  getBitgetDemoCandles,
  getBitgetDemoClosedPositions,
  getBitgetDemoCurrentPositions,
  getBitgetDemoEnvironment,
  getBitgetDemoPendingStrategyOrders,
  getContractConfig,
  normalizeOrderSize,
  normalizeOrderSizeUp,
  placeBitgetDemoMarketOrder,
  placeBitgetDemoProtectionOrder,
  testBitgetDemoConnection,
  type BitgetCandleInterval,
  type BitgetDemoCandle,
  type BitgetDemoClosedPosition,
  type BitgetDemoMarketQuote,
  type BitgetDemoPosition,
  type BitgetDemoStrategyOrder,
  type BitgetSupportedSymbol,
} from "@/lib/bitget/demo-client";
import { getBitgetMirrorSettings } from "@/lib/bitget/demo-connector";
import { getTradingReliabilityOpeningGate } from "@/lib/trading-signals/trading-reliability";
import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import { calculateUnifiedLivePositionSize } from "@/lib/trading-signals/unified-live-position-sizing";
import {
  getUnifiedLiveSetting,
  registerUnifiedLiveStrategySlice,
} from "@/lib/trading-signals/unified-live-store";
import { prioritizeAllowedCommissioningSymbols } from "@/lib/trading-signals/ai-plan-renewal-core";
import { classifyLiveOrderFailure } from "@/lib/trading-signals/live-order-preflight-core";
import { LiveTradeExecutionError } from "@/lib/bitget/live-execution-core";
import { evaluateMarketSessionExposureSafety } from "@/lib/trading-signals/market-session-exposure-core";
import {
  getLiveScanOpportunityHints,
  prepareAiTradePlanBeforeExecution,
  syncAiTradePlanFromDecision,
  syncAiTradePlansFromRecentDecisions,
} from "@/lib/trading-signals/ai-trade-plans";
import {
  getPredictionAutoTraderSettings,
  resolvePredictionStrategyPlans,
} from "@/lib/trading-signals/prediction-auto-trader";
import { applyExternalAnalystOverlay } from "@/lib/trading-signals/external-analyst-overlay";
import {
  aiTradingFocusPriority,
  buildAiTradingFocusPredictionPlan,
  getAiTradingExecutionFocus,
} from "@/lib/trading-signals/ai-trading-focus";
import { getHexagramDirectionPrior, type HexagramDirectionPrior } from "@/lib/trading-signals/hexagram-direction-priors";
import { getMarketBaziRegimePrior } from "@/lib/trading-signals/market-bazi-regime";
import { evaluateCryptoCrossAssetGuard } from "@/lib/trading-signals/crypto-cross-asset-policy";
import { applyOctober2026LongRiskScale, getOctober2026AssetRisk } from "@/lib/research/october-2026-flash-crash-risk";
import { getExternalAnalystOverlay } from "@/lib/trading-signals/external-analyst-signals";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { buildXIntelligenceTradeUniverseBoost } from "@/lib/trading-signals/market-environment";
import type { PredictionStrategyPlan } from "@/types/prediction-auto-trader";
import type {
  ThreeHorizonCondition,
  ThreeHorizonDecisionStatus,
  ThreeHorizonDirection,
  ThreeHorizonPublicStrategy,
  ThreeHorizonRiskSnapshot,
  ThreeHorizonRunReport,
  ThreeHorizonStrategyDashboard,
  ThreeHorizonStrategyDecision,
  ThreeHorizonStrategyMode,
  ThreeHorizonStrategyProfile,
  ThreeHorizonStrategyStats,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";
import {
  classifyDirectionalMarketStructure,
  resolveAuthoritativeForecastDirection,
} from "@/lib/trading-signals/authoritative-market-structure-core";

// MOOX_V720101_BAZI_DIVERGENCE_GUARD: asset-Bazi regime prior + BTC/ETH independent execution guard.
// MOOX_V72010_1000U_LIVE_EXECUTION: formal direction + three-horizon execution with hard live risk caps.
// V7.9: profiles are no longer code-limited to one fixed group of ten.
// The live allow-list in demo-client remains authoritative; V7.9.1 adds the explicitly approved SNDK/MSFT stock perps, then dynamically selects only currently available contracts.
const LIVE_EXPERIMENT_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/;
const LIVE_FULL_UNIVERSE_SYMBOLS: BitgetSupportedSymbol[] = [
  "BTCUSDT", "ETHUSDT", "HYPEUSDT", "MUUSDT", "QQQUSDT",
  "XAUTUSDT", "XAGUSDT", "GOOGLUSDT", "CLUSDT", "SPYUSDT",
  "SNDKUSDT", "MSFTUSDT",
];
const LIVE_COMMISSIONING_PREFERRED_SYMBOLS: BitgetSupportedSymbol[] = ["BTCUSDT", "ETHUSDT"];
const LIVE_COMMISSIONING_QUOTE_MAX_AGE_SECONDS = 30;
// MOOX_TRADING_CONTROL_MODE is the single operational control. Legacy
// MOOX_LIVE_ACTIVE_EXECUTION_V641 remains compatibility-only when it is absent.
const LIVE_COMMISSIONING_ENABLED =
  process.env.BITGET_LIVE_COMMISSIONING_ENABLED?.toLowerCase() === "true";
const LIVE_ACTIVE_EXECUTION_ENABLED =
  isUnifiedLiveActiveExecutionEnabled();
// Legacy quantity-driven promotion is permanently disabled. A desired cadence
// is a monitoring/capacity objective, never a reason to make a real order READY.
const LIVE_ACTIVITY_ENABLED = false;
const LIVE_ACTIVITY_TARGET = Math.floor(envNumber(
  "MOOX_LIVE_ACTIVITY_TARGET_V641", 0, 0, 4
));
const LIVE_ACTIVITY_START_HOUR_BJ = Math.floor(envNumber(
  "MOOX_LIVE_ACTIVITY_START_HOUR_BJ_V641",
  envNumber("BITGET_LIVE_DAILY_MINIMUM_START_HOUR_BJ", 0, 0, 23),
  0,
  23
));
const LIVE_ACTIVITY_MIN_CONFIDENCE = envNumber(
  "MOOX_LIVE_ACTIVITY_MIN_CONFIDENCE_V641",
  envNumber("BITGET_LIVE_DAILY_MINIMUM_MIN_CONFIDENCE", 38, 38, 70),
  38,
  70
);
const LIVE_ACTIVITY_PROBE_RISK_PCT = envNumber(
  "MOOX_LIVE_ACTIVITY_PROBE_RISK_PCT_V641",
  envNumber("BITGET_LIVE_DAILY_MINIMUM_RISK_PCT", 0.08, 0.05, 0.15),
  0.05,
  0.15
);
const LIVE_SYMBOL_TRADE_CAP = Math.floor(envNumber(
  "MOOX_LIVE_SYMBOL_TRADE_CAP_V641", 2, 1, 4
));

// MOOX_ACTIVE_EXECUTION_V64
// Demo execution remains separately controllable and cannot affect live credentials.
const DEMO_ACTIVE_EXECUTION_ENABLED =
  process.env.MOOX_DEMO_ACTIVE_EXECUTION_V64?.toLowerCase() !== "false";
const DEMO_ACTIVITY_TARGET = 0;
const DEMO_ACTIVITY_START_HOUR_BJ = Math.floor(envNumber(
  "MOOX_DEMO_ACTIVITY_START_HOUR_BJ_V64", 10, 0, 23
));
const DEMO_ACTIVITY_PROBE_RISK_PCT = envNumber(
  "MOOX_DEMO_ACTIVITY_PROBE_RISK_PCT_V64", 0.12, 0.05, 0.2
);
const DEMO_GLOBAL_TRADE_CAP = Math.floor(envNumber(
  "MOOX_DEMO_GLOBAL_TRADE_CAP_V64", 8, 2, 12
));
const DEMO_SYMBOL_TRADE_CAP = Math.floor(envNumber(
  "MOOX_DEMO_SYMBOL_TRADE_CAP_V64", 2, 1, 4
));
const PROBE_RISK_SCALE = envNumber("MOOX_PROBE_RISK_SCALE_V64", 0.45, 0.25, 0.6);
const SCALE_IN_MIN_AGE_MINUTES = Math.floor(envNumber(
  "MOOX_SCALE_IN_MIN_AGE_MINUTES_V64", 5, 3, 30
));
// MOOX owns the directional thesis; the market confirms the actual turn.
// These thresholds govern timing confirmation only and never create an order to hit a quantity target.
const INTRADAY_PATH_MIN_MOVE_PCT = envNumber(
  "MOOX_INTRADAY_PATH_MIN_MOVE_PCT", 0.35, 0.1, 2
);
const INTRADAY_PATH_CONFIRM_PCT = envNumber(
  "MOOX_INTRADAY_PATH_CONFIRM_PCT", 0.15, 0.05, 1
);

const PROFILE_DEFINITIONS: Record<
  ThreeHorizonStrategyType,
  Omit<ThreeHorizonStrategyProfile, "enabled" | "mode" | "lastScanAt" | "updatedAt">
> = {
  INTRADAY: {
    strategyType: "INTRADAY",
    label: "短线",
    description: "30分钟至8小时，4小时看环境、30分钟定主线段、5分钟确认结构、1分钟只微调成交时机，原则上当日结束。",
    symbols: [...LIVE_FULL_UNIVERSE_SYMBOLS],
    environmentTimeframe: "4H",
    directionTimeframe: "30m",
    entryTimeframe: "5m/1m",
    scanIntervalMinutes: 1,
    riskPerTradePct: 0.2,
    maxHoldingMinutes: 8 * 60,
    planningMinConfidence: 42,
    minConfidence: 52,
    maxTradesPerDay: 5,
  },
  SWING: {
    strategyType: "SWING",
    label: "波段",
    description: "1至7天，周/日方向、4小时结构、1小时入场，不把短线亏损被动变成波段。",
    symbols: [...LIVE_FULL_UNIVERSE_SYMBOLS],
    environmentTimeframe: "1D/1W",
    directionTimeframe: "4H",
    entryTimeframe: "1H",
    scanIntervalMinutes: 15,
    riskPerTradePct: 0.3,
    maxHoldingMinutes: 7 * 24 * 60,
    planningMinConfidence: 44,
    minConfidence: 54,
    maxTradesPerDay: 5,
  },
  POSITION: {
    strategyType: "POSITION",
    label: "中长期",
    description: "1至4周，月/周主方向、日线与4小时入场，低杠杆、小风险、固定期限复核。",
    symbols: [...LIVE_FULL_UNIVERSE_SYMBOLS],
    environmentTimeframe: "1M/1W",
    directionTimeframe: "1D",
    entryTimeframe: "4H",
    scanIntervalMinutes: 60,
    riskPerTradePct: 0.25,
    maxHoldingMinutes: 28 * 24 * 60,
    planningMinConfidence: 46,
    minConfidence: 56,
    maxTradesPerDay: 5,
  },
};

const STRATEGY_ORDER: ThreeHorizonStrategyType[] = ["INTRADAY", "SWING", "POSITION"];
const DAILY_LOSS_LIMIT_PCT = envNumber("THREE_HORIZON_DAILY_LOSS_LIMIT_PCT", 1, 0.25, 5);
const WEEKLY_LOSS_LIMIT_PCT = envNumber("THREE_HORIZON_WEEKLY_LOSS_LIMIT_PCT", 2.5, 0.5, 10);
const OPEN_RISK_LIMIT_PCT = envNumber("MOOX_THREE_HORIZON_OPEN_RISK_LIMIT_PCT_V72010", 1.25, 0.5, 5);
const CRYPTO_GROUP_RISK_LIMIT_PCT = envNumber("MOOX_THREE_HORIZON_CRYPTO_GROUP_RISK_LIMIT_PCT_V72010", 1, 0.5, 4);
const MAX_POSITION_NOTIONAL_PCT = envNumber("THREE_HORIZON_MAX_POSITION_NOTIONAL_PCT", 10, 1, 25);

interface ProfileRow {
  strategy_type: ThreeHorizonStrategyType;
  enabled: boolean;
  mode: ThreeHorizonStrategyMode;
  symbols: unknown;
  scan_interval_minutes: number;
  risk_per_trade_pct: number;
  max_holding_minutes: number;
  planning_min_confidence: number;
  min_confidence: number;
  max_trades_per_day: number;
  last_scan_at: Date | string | null;
  updated_at: Date | string;
}

interface DecisionRow {
  id: string;
  run_id: string;
  decision_key: string;
  plan_id: string | null;
  strategy_type: ThreeHorizonStrategyType;
  mode: ThreeHorizonStrategyMode;
  symbol: string;
  status: ThreeHorizonDecisionStatus;
  direction: ThreeHorizonDirection;
  confidence: number;
  technical_score: number;
  forecast_score: number;
  conditions: unknown;
  rejection_code: string;
  rejection_reason: string;
  current_price: number | null;
  entry_price: number | null;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  quantity: number | null;
  risk_amount_usdt: number | null;
  risk_pct: number | null;
  max_holding_until: Date | string | null;
  expires_at: Date | string | null;
  client_oid: string | null;
  bitget_order_id: string | null;
  protection_order_id: string | null;
  tp1_done: boolean;
  entry_stage: number;
  max_entry_stages: number;
  scale_in_order_id: string | null;
  opened_at: Date | string | null;
  closed_at: Date | string | null;
  realized_pnl_usdt: number | null;
  raw_payload: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

interface EvaluationResult {
  direction: ThreeHorizonDirection;
  confidence: number;
  technicalScore: number;
  forecastScore: number;
  conditions: ThreeHorizonCondition[];
  currentPrice: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  ready: boolean;
  rejectionCode: string;
  rejectionReason: string;
  executionTier: "FULL" | "PROBE" | "OBSERVE";
  riskScale: number;
  directionStrength: number;
  raw: Record<string, unknown>;
}

interface CandleSet {
  "1m": BitgetDemoCandle[];
  "5m": BitgetDemoCandle[];
  "15m": BitgetDemoCandle[];
  "30m": BitgetDemoCandle[];
  "1H": BitgetDemoCandle[];
  "4H": BitgetDemoCandle[];
  "1D": BitgetDemoCandle[];
}

function envNumber(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function round(value: number, digits = 4): number {
  if (!Number.isFinite(value)) return 0;
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function last<T>(rows: T[]): T | undefined {
  return rows[rows.length - 1];
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const multiplier = 2 / (period + 1);
  const result: number[] = [values[0] ?? 0];
  for (let index = 1; index < values.length; index += 1) {
    const previous = result[index - 1] ?? values[index] ?? 0;
    const current = values[index] ?? previous;
    result.push(current * multiplier + previous * (1 - multiplier));
  }
  return result;
}

function rsi(candles: BitgetDemoCandle[], period = 14): number {
  if (candles.length <= period) return 50;
  const closes = candles.map((row) => row.close);
  let gains = 0;
  let losses = 0;
  const start = Math.max(1, closes.length - period);
  for (let index = start; index < closes.length; index += 1) {
    const change = (closes[index] ?? 0) - (closes[index - 1] ?? 0);
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function atr(candles: BitgetDemoCandle[], period = 14): number {
  if (candles.length < 2) return 0;
  const ranges: number[] = [];
  for (let index = 1; index < candles.length; index += 1) {
    const row = candles[index];
    const previous = candles[index - 1];
    if (!row || !previous) continue;
    ranges.push(
      Math.max(
        row.high - row.low,
        Math.abs(row.high - previous.close),
        Math.abs(row.low - previous.close)
      )
    );
  }
  return average(ranges.slice(-period));
}

function intervalMs(interval: BitgetCandleInterval): number {
  const map: Record<BitgetCandleInterval, number> = {
    "1m": 60_000,
    "3m": 3 * 60_000,
    "5m": 5 * 60_000,
    "15m": 15 * 60_000,
    "30m": 30 * 60_000,
    "1H": 60 * 60_000,
    "4H": 4 * 60 * 60_000,
    "6H": 6 * 60 * 60_000,
    "12H": 12 * 60 * 60_000,
    "1D": 24 * 60 * 60_000,
  };
  return map[interval];
}

function closedCandles(
  candles: BitgetDemoCandle[],
  interval: BitgetCandleInterval,
  now: Date
): BitgetDemoCandle[] {
  if (!candles.length) return [];
  const latest = last(candles);
  if (latest && latest.timestamp + intervalMs(interval) > now.getTime()) {
    return candles.slice(0, -1);
  }
  return candles;
}

type DirectionSignal = {
  direction: ThreeHorizonDirection;
  score: number;
  label: string;
};

function directionValue(direction: ThreeHorizonDirection): number {
  return direction === "LONG" ? 1 : direction === "SHORT" ? -1 : 0;
}

function technicalDirectionSignal(
  candles: BitgetDemoCandle[],
  fastPeriod: number,
  slowPeriod: number,
  returnLookback = 6
): DirectionSignal {
  if (candles.length < Math.max(fastPeriod + 4, returnLookback + 2)) {
    return { direction: "NEUTRAL", score: 0, label: "K线样本不足" };
  }
  const closes = candles.map((row) => row.close);
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, Math.min(slowPeriod, Math.max(fastPeriod + 2, candles.length - 1)));
  const price = last(closes) ?? 0;
  const fastNow = last(fast) ?? price;
  const slowNow = last(slow) ?? price;
  const fastEarlier = fast[Math.max(0, fast.length - 4)] ?? fastNow;
  const earlierPrice = closes[Math.max(0, closes.length - 1 - returnLookback)] ?? price;
  const latestRsi = rsi(candles);
  const scale = price > 0 ? price : 1;
  const spreadPct = (fastNow - slowNow) / scale * 100;
  const slopePct = (fastNow - fastEarlier) / scale * 100;
  const returnPct = earlierPrice > 0 ? (price - earlierPrice) / earlierPrice * 100 : 0;
  const priceVsFastPct = (price - fastNow) / scale * 100;
  const rawScore =
    clamp(spreadPct * 18, -28, 28) +
    clamp(slopePct * 28, -24, 24) +
    clamp(returnPct * 5, -22, 22) +
    clamp(priceVsFastPct * 12, -12, 12) +
    clamp((latestRsi - 50) * 0.28, -14, 14);
  const score = round(clamp(rawScore, -100, 100), 1);
  const direction: ThreeHorizonDirection = score >= 8 ? "LONG" : score <= -8 ? "SHORT" : "NEUTRAL";
  return {
    direction,
    score,
    label: `趋势分${score}（均线差${round(spreadPct, 2)}%，斜率${round(slopePct, 2)}%，RSI ${round(latestRsi, 1)}）`,
  };
}

function forecastDirectionalScore(plan: PredictionStrategyPlan | undefined): number {
  const direction = forecastDirection(plan);
  if (direction === "NEUTRAL") return 0;
  return directionValue(direction) * clamp(plan?.confidence ?? 50, 35, 85);
}

function priorDirectionalScore(prior: HexagramDirectionPrior | null): number {
  if (!prior) return 0;
  return directionValue(prior.direction) * clamp(prior.confidence, 40, 85);
}

/**
 * Official MOOX side selector. Metaphysical/canonical research owns direction.
 * Technical signals never enter this vote; they are evaluated later only for
 * timing, entry quality and hard risk controls. When formal sources disagree,
 * the direction is explicitly NEUTRAL rather than letting price action break the tie.
 */
function resolveOfficialMooxDirection(input: {
  plan?: PredictionStrategyPlan;
  prior: HexagramDirectionPrior | null;
  strategyType: ThreeHorizonStrategyType;
  focusDirection?: ThreeHorizonDirection;
}): { direction: ThreeHorizonDirection; strength: number; label: string } {
  const planDirection = forecastDirectionForStrategy(input.plan, input.strategyType);
  if (planDirection !== "NEUTRAL") {
    const confidence = clamp(input.plan?.confidence ?? 55, 35, 85);
    return {
      direction: planDirection,
      strength: confidence * directionValue(planDirection),
      label: `${planDirection === "LONG" ? "看涨" : "看跌"}；正式周预测锁定方向，日线与技术只负责路径和位置`,
    };
  }
  const candidates: Array<{ source: string; direction: ThreeHorizonDirection; confidence: number }> = [];
  const focusDirection = input.focusDirection ?? "NEUTRAL";
  if (focusDirection !== "NEUTRAL") {
    candidates.push({ source: "研究总控", direction: focusDirection, confidence: 68 });
  }
  if (input.prior) {
    candidates.push({ source: "六爻先验", direction: input.prior.direction, confidence: clamp(input.prior.confidence, 40, 85) });
  }
  if (!candidates.length) {
    return { direction: "NEUTRAL", strength: 0, label: "未找到锁定的玄学/正式预测方向" };
  }
  const unique = new Set(candidates.map((item) => item.direction));
  if (unique.size > 1) {
    return {
      direction: "NEUTRAL",
      strength: 0,
      label: `正式方向冲突：${candidates.map((item) => `${item.source}${item.direction === "LONG" ? "看涨" : "看跌"}`).join(" / ")}`,
    };
  }
  const direction = candidates[0]!.direction;
  const confidence = Math.max(...candidates.map((item) => item.confidence));
  return {
    direction,
    strength: confidence * directionValue(direction),
    label: `${direction === "LONG" ? "看涨" : "看跌"}；${candidates.map((item) => item.source).join(" + ")}同向`,
  };
}

function resolveActiveDirection(input: {
  primary: DirectionSignal;
  secondary?: DirectionSignal;
  plan?: PredictionStrategyPlan;
  prior: HexagramDirectionPrior | null;
  primaryWeight?: number;
  secondaryWeight?: number;
}): { direction: ThreeHorizonDirection; strength: number; label: string } {
  const primaryWeight = input.primaryWeight ?? 0.62;
  const secondaryWeight = input.secondary ? (input.secondaryWeight ?? 0.18) : 0;
  const forecastWeight = input.plan ? 0.12 : 0;
  const priorWeight = input.prior ? 0.18 : 0;
  const normalizer = primaryWeight + secondaryWeight + forecastWeight + priorWeight || 1;
  const composite = (
    input.primary.score * primaryWeight +
    (input.secondary?.score ?? 0) * secondaryWeight +
    forecastDirectionalScore(input.plan) * forecastWeight +
    priorDirectionalScore(input.prior) * priorWeight
  ) / normalizer;
  const strength = round(clamp(composite, -100, 100), 1);
  let direction: ThreeHorizonDirection = strength >= 7 ? "LONG" : strength <= -7 ? "SHORT" : "NEUTRAL";
  // When fresh technical evidence is indecisive, a high-confidence locked prior may break the tie,
  // but never if the primary chart is already strongly moving the opposite way.
  if (
    direction === "NEUTRAL" &&
    input.prior &&
    input.prior.confidence >= 62 &&
    Math.abs(input.primary.score) < 24
  ) {
    direction = input.prior.direction;
  }
  const priorLabel = input.prior
    ? `；六爻先验${input.prior.direction === "LONG" ? "偏多" : "偏空"}${input.prior.confidence}%（±${input.prior.phaseShiftToleranceDays}日）`
    : "；六爻先验缺失";
  return {
    direction,
    strength,
    label: `${input.primary.label}${input.secondary ? `；次级${input.secondary.label}` : ""}${priorLabel}`,
  };
}

function slopeDirection(
  candles: BitgetDemoCandle[],
  lookback = 3
): ThreeHorizonDirection {
  if (candles.length < lookback + 1) return "NEUTRAL";
  const recent = candles.slice(-(lookback + 1));
  const first = recent[0]?.close ?? 0;
  const latest = last(recent)?.close ?? 0;
  const middle = average(recent.slice(0, -1).map((row) => row.close));
  if (first <= 0 || latest <= 0 || middle <= 0) return "NEUTRAL";
  const changePct = (latest - first) / first * 100;
  if (latest > middle && changePct >= 1) return "LONG";
  if (latest < middle && changePct <= -1) return "SHORT";
  return "NEUTRAL";
}

function aggregateCandles(
  candles: BitgetDemoCandle[],
  keyFor: (date: Date) => string
): BitgetDemoCandle[] {
  const buckets = new Map<string, BitgetDemoCandle[]>();
  for (const candle of candles) {
    const key = keyFor(new Date(candle.timestamp));
    const bucket = buckets.get(key) ?? [];
    bucket.push(candle);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values())
    .map((rows) => ({
      timestamp: rows[0]?.timestamp ?? 0,
      open: rows[0]?.open ?? 0,
      high: Math.max(...rows.map((row) => row.high)),
      low: Math.min(...rows.map((row) => row.low)),
      close: last(rows)?.close ?? 0,
      volume: rows.reduce((sum, row) => sum + row.volume, 0),
      turnover: rows.reduce((sum, row) => sum + row.turnover, 0),
      capturedAt: last(rows)?.capturedAt ?? new Date().toISOString(),
    }))
    .filter((row) => row.timestamp > 0 && row.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function weekKey(date: Date): string {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function completedAggregateCandles(
  candles: BitgetDemoCandle[],
  keyFor: (date: Date) => string,
  now: Date
): BitgetDemoCandle[] {
  const currentBucket = keyFor(now);
  return aggregateCandles(candles, keyFor).filter(
    (row) => keyFor(new Date(row.timestamp)) !== currentBucket
  );
}

function forecastDirection(plan: PredictionStrategyPlan | undefined): ThreeHorizonDirection {
  if (!plan) return "NEUTRAL";
  return resolveAuthoritativeForecastDirection({
    weeklyDirection: plan.weeklyDirection,
    fallbackDirection: plan.setup === "BUY_DIP" ? "LONG" : plan.setup === "SELL_RALLY" ? "SHORT" : "NEUTRAL",
  });
}

function forecastDirectionForStrategy(
  plan: PredictionStrategyPlan | undefined,
  strategyType: ThreeHorizonStrategyType
): ThreeHorizonDirection {
  if (!plan) return "NEUTRAL";
  // Formal weekly research owns trade direction across execution horizons.
  // Daily is path/timing only; position may fall back to monthly when no weekly side exists.
  return resolveAuthoritativeForecastDirection({
    weeklyDirection: plan.weeklyDirection,
    fallbackDirection: strategyType === "POSITION" ? plan.monthlyDirection : "NEUTRAL",
  });
}

function lockedLiuyaoDirection(
  plan: PredictionStrategyPlan | null | undefined,
  strategyType: ThreeHorizonStrategyType,
): "LONG" | "SHORT" | null {
  if (!plan) return null;
  const useMonthly = strategyType === "POSITION" && Boolean(plan.monthlyForecast);
  const leg = useMonthly ? plan.monthlyForecast : plan.weeklyForecast;
  const direction = useMonthly ? plan.monthlyDirection : plan.weeklyDirection;
  const traceableLiuyao = /六爻|liu[\s_-]*yao|six[\s_-]*yao/i.test(leg?.sourceLabel ?? "");
  if (!leg?.publishedAt || !leg.lockedAt || !traceableLiuyao || !["LONG", "SHORT"].includes(direction)) return null;
  return direction as "LONG" | "SHORT";
}

function formalForecastDirectionForExternalOverlay(
  plan: PredictionStrategyPlan | undefined,
  strategyType: ThreeHorizonStrategyType,
  nowMs: number
): ThreeHorizonDirection {
  if (!plan) return "NEUTRAL";
  const leg = (forecast: typeof plan.weeklyForecast, direction: ThreeHorizonDirection) => forecast
    ? { status: forecast.status, publishedAt: forecast.publishedAt, lockedAt: forecast.lockedAt, direction }
    : null;
  return resolveFormalExternalOverlayDirection({ strategyType, nowMs, weekly: leg(plan.weeklyForecast, plan.weeklyDirection), monthly: leg(plan.monthlyForecast, plan.monthlyDirection) });
}

function forecastCompatibility(
  direction: ThreeHorizonDirection,
  plan: PredictionStrategyPlan | undefined,
  strategyType: ThreeHorizonStrategyType
): { score: number; label: string; compatible: boolean } {
  const forecast = forecastDirectionForStrategy(plan, strategyType);
  const confidence = clamp(plan?.confidence ?? 50, 0, 100);
  if (forecast === "NEUTRAL") {
    return { score: 50, label: "预测暂未形成明确方向，仅作中性权重", compatible: true };
  }
  if (direction === forecast) {
    return { score: Math.max(55, confidence), label: `正式预测方向与策略方向一致（情景置信${confidence}%）`, compatible: true };
  }
  return {
    score: Math.max(0, 100 - confidence),
    label: `当前策略方向与正式预测冲突（正式预测${forecast === "LONG" ? "看涨" : "看跌"}）`,
    compatible: false,
  };
}

function volatilityCondition(
  candles: BitgetDemoCandle[],
  atrValue: number,
  maxAtrPct: number
): { met: boolean; value: string } {
  const price = last(candles)?.close ?? 0;
  const atrPct = price > 0 ? (atrValue / price) * 100 : 0;
  return {
    met: atrPct > 0.05 && atrPct <= maxAtrPct,
    value: `ATR约${round(atrPct, 2)}%，上限${maxAtrPct}%`,
  };
}

function pricePlan(input: {
  strategyType: ThreeHorizonStrategyType;
  direction: ThreeHorizonDirection;
  entry: number;
  atrValue: number;
  swingLow: number;
  swingHigh: number;
}): { stopLoss: number; target1: number; target2: number } | null {
  if (input.direction === "NEUTRAL" || input.entry <= 0 || input.atrValue <= 0) return null;
  const config = input.strategyType === "INTRADAY"
    ? { atrMultiple: 1.8, minPct: 0.9, maxPct: 4.5, target1R: 1, target2R: 2 }
    : input.strategyType === "SWING"
      ? { atrMultiple: 2.1, minPct: 1.5, maxPct: 7, target1R: 1.1, target2R: 2.4 }
      : { atrMultiple: 2.5, minPct: 2.5, maxPct: 12, target1R: 1.5, target2R: 3 };
  let distance = input.atrValue * config.atrMultiple;
  if (input.direction === "LONG" && input.swingLow > 0 && input.swingLow < input.entry) {
    distance = Math.max(distance, input.entry - input.swingLow);
  }
  if (input.direction === "SHORT" && input.swingHigh > input.entry) {
    distance = Math.max(distance, input.swingHigh - input.entry);
  }
  distance = clamp(
    distance,
    input.entry * config.minPct / 100,
    input.entry * config.maxPct / 100
  );
  if (input.direction === "LONG") {
    return {
      stopLoss: round(input.entry - distance, 8),
      target1: round(input.entry + distance * config.target1R, 8),
      target2: round(input.entry + distance * config.target2R, 8),
    };
  }
  return {
    stopLoss: round(input.entry + distance, 8),
    target1: round(input.entry - distance * config.target1R, 8),
    target2: round(input.entry - distance * config.target2R, 8),
  };
}

function evaluateIntraday(
  profile: ThreeHorizonStrategyProfile,
  symbol: BitgetSupportedSymbol,
  candles: CandleSet,
  plan: PredictionStrategyPlan | undefined,
  now: Date,
  livePrice?: number
): EvaluationResult {
  const h4 = closedCandles(candles["4H"], "4H", now);
  const m30 = closedCandles(candles["30m"], "30m", now);
  const m5 = closedCandles(candles["5m"], "5m", now);
  const m1 = closedCandles(candles["1m"], "1m", now);
  const prior = getHexagramDirectionPrior(symbol, profile.strategyType, now);
  const marketBaziRegime = getMarketBaziRegimePrior(symbol, profile.strategyType, now);
  const h4Signal = technicalDirectionSignal(h4, 8, 20, 5);
  const m30Signal = technicalDirectionSignal(m30, 8, 21, 6);
  const chan30 = analyzeChanStructure(m30);
  const chan5 = analyzeChanStructure(m5);
  const chan1 = analyzeChanStructure(m1);
  const executionFocus = getAiTradingExecutionFocus(symbol, now);
  const focusMainDirection = executionFocus?.day?.mainDirection ?? executionFocus?.weeklyDirection ?? "NEUTRAL";
  const focusTacticalDirection = executionFocus?.day?.tacticalDirection ?? "NEUTRAL";
  const formalPlanDirection = forecastDirectionForStrategy(plan, profile.strategyType);
  const focusCountertrend = Boolean(
    forecastDirection(plan) === "NEUTRAL" &&
    profile.strategyType === "INTRADAY" &&
    executionFocus?.countertrendPolicy === "STRONG_ONLY" &&
    executionFocus.countertrendConfluence >= 70 &&
    focusMainDirection !== "NEUTRAL" &&
    focusTacticalDirection !== "NEUTRAL" &&
    focusTacticalDirection !== focusMainDirection &&
    h4Signal.direction === focusTacticalDirection &&
    m30Signal.direction === focusTacticalDirection &&
    Math.abs(h4Signal.score) >= 8 &&
    Math.abs(m30Signal.score) >= 8
  );
  const baziCountertrend = Boolean(
    profile.strategyType === "INTRADAY" &&
    marketBaziRegime?.countertrendEligible &&
    formalPlanDirection !== "NEUTRAL" &&
    marketBaziRegime.direction !== formalPlanDirection &&
    h4Signal.direction === marketBaziRegime.direction &&
    m30Signal.direction === marketBaziRegime.direction &&
    Math.abs(h4Signal.score) >= 12 &&
    Math.abs(m30Signal.score) >= 12
  );
  const strongCountertrend = focusCountertrend;
  const activeDirection = resolveActiveDirection({
    primary: h4Signal,
    secondary: m30Signal,
    plan: undefined,
    prior: null,
    primaryWeight: 0.62,
    secondaryWeight: 0.38,
  });
  // Direction is owned by formal MOOX research. 4H/30m/5m only decide whether
  // the current node is executable; they may delay/block but never flip the side.
  const officialDirection = resolveOfficialMooxDirection({
    plan,
    prior,
    strategyType: profile.strategyType,
    focusDirection: focusMainDirection,
  });
  const mooxDirection = officialDirection.direction;
  const direction = resolveIntradayExecutionDirection({
    officialDirection: mooxDirection,
    focusCountertrend,
    focusTacticalDirection,
  });

  const latest30 = last(m30);
  const previous30 = m30[m30.length - 2];
  const latest5 = last(m5);
  const previous5 = m5[m5.length - 2];
  const ema30 = last(ema(m30.map((row) => row.close), 20)) ?? 0;
  const ema5Series = ema(m5.map((row) => row.close), 9);
  const ema5 = last(ema5Series) ?? 0;
  const previousEma5 = ema5Series[Math.max(0, ema5Series.length - 2)] ?? ema5;
  const latest1 = last(m1);
  const previous1 = m1[m1.length - 2];
  const ema1Series = ema(m1.map((row) => row.close), 9);
  const ema1 = last(ema1Series) ?? 0;
  const previousEma1 = ema1Series[Math.max(0, ema1Series.length - 2)] ?? ema1;
  const rsi30 = rsi(m30);
  const atr30 = atr(m30);
  const forecast = focusCountertrend && executionFocus
    ? {
        score: executionFocus.countertrendConfluence,
        label: `周内反向段已预先标记，4H/30m同向共振${executionFocus.countertrendConfluence}%；仅允许小风险探路仓`,
        compatible: true,
      }
    : forecastCompatibility(direction, plan, profile.strategyType);

  const chan30Aligned = direction === "LONG"
    ? chan30.buyPoint !== "NONE" || chan30.strokes.at(-1)?.direction === "UP"
    : direction === "SHORT"
      ? chan30.sellPoint !== "NONE" || chan30.strokes.at(-1)?.direction === "DOWN"
      : false;
  const structureMet = direction === "LONG"
    ? Boolean(latest30 && latest30.close >= ema30 * 0.995 && rsi30 >= 40 && m30Signal.score >= -6 && (!chan30.sufficient || chan30Aligned))
    : direction === "SHORT"
      ? Boolean(latest30 && latest30.close <= ema30 * 1.005 && rsi30 <= 60 && m30Signal.score <= 6 && (!chan30.sufficient || chan30Aligned))
      : false;

  const strictChanTrigger = direction === "LONG"
    ? chan5.buyPoint === "SECOND" || chan5.buyPoint === "THIRD"
    : direction === "SHORT"
      ? chan5.sellPoint === "SECOND" || chan5.sellPoint === "THIRD"
      : false;
  const exactCross = direction === "LONG"
    ? Boolean(latest5 && previous5 && latest5.close > ema5 && previous5.close <= previousEma5 && latest5.close > latest5.open)
    : direction === "SHORT"
      ? Boolean(latest5 && previous5 && latest5.close < ema5 && previous5.close >= previousEma5 && latest5.close < latest5.open)
      : false;
  const reclaimTrigger = direction === "LONG"
    ? Boolean(latest5 && previous5 && previous5.low <= previousEma5 * 1.0015 && latest5.close > ema5 && latest5.close > previous5.close)
    : direction === "SHORT"
      ? Boolean(latest5 && previous5 && previous5.high >= previousEma5 * 0.9985 && latest5.close < ema5 && latest5.close < previous5.close)
      : false;
  const continuationTrigger = direction === "LONG"
    ? Boolean(latest5 && previous5 && latest5.close > ema5 && latest5.close >= latest5.open && latest5.close >= previous5.close && m30Signal.score >= 4)
    : direction === "SHORT"
      ? Boolean(latest5 && previous5 && latest5.close < ema5 && latest5.close <= latest5.open && latest5.close <= previous5.close && m30Signal.score <= -4)
      : false;
  const microTrigger = direction === "LONG"
    ? Boolean(latest1 && previous1 && latest1.close > ema1 && (previous1.close <= previousEma1 || chan1.buyPoint !== "NONE"))
    : direction === "SHORT"
      ? Boolean(latest1 && previous1 && latest1.close < ema1 && (previous1.close >= previousEma1 || chan1.sellPoint !== "NONE"))
      : false;

  const pathRows = m30.slice(-12);
  const pathHigh = pathRows.length ? Math.max(...pathRows.map((row) => row.high)) : 0;
  const pathLow = pathRows.length ? Math.min(...pathRows.map((row) => row.low)) : 0;
  const dipPct = pathHigh > 0 ? Math.max(0, (pathHigh - pathLow) / pathHigh * 100) : 0;
  const reboundPct = pathLow > 0 && latest30 ? Math.max(0, (latest30.close - pathLow) / pathLow * 100) : 0;
  const rallyPct = pathLow > 0 ? Math.max(0, (pathHigh - pathLow) / pathLow * 100) : 0;
  const reversalPct = pathHigh > 0 && latest30 ? Math.max(0, (pathHigh - latest30.close) / pathHigh * 100) : 0;
  const pathTurnTrigger = !strongCountertrend && plan?.setup === "BUY_DIP" && direction === "LONG"
    ? Boolean(
        latest30 && previous30 &&
        dipPct >= INTRADAY_PATH_MIN_MOVE_PCT &&
        reboundPct >= INTRADAY_PATH_CONFIRM_PCT &&
        latest30.close > previous30.close &&
        (exactCross || reclaimTrigger)
      )
    : !strongCountertrend && plan?.setup === "SELL_RALLY" && direction === "SHORT"
      ? Boolean(
          latest30 && previous30 &&
          rallyPct >= INTRADAY_PATH_MIN_MOVE_PCT &&
          reversalPct >= INTRADAY_PATH_CONFIRM_PCT &&
          latest30.close < previous30.close &&
          (exactCross || reclaimTrigger)
        )
      : false;
  // Highshan-style execution: the strict 5m Chan 2nd/3rd buy/sell is preferred.
  // A closed-candle right-side reclaim/continuation may also trigger when 30m is
  // aligned, so the system does not stay permanently idle waiting for a rare
  // textbook pattern.
  const rightSideTrigger = structureMet && (exactCross || reclaimTrigger || continuationTrigger || pathTurnTrigger);
  const entryMet = strictChanTrigger || rightSideTrigger;
  const entryTriggerLabel = strictChanTrigger
    ? direction === "LONG"
      ? `5分钟${chan5.buyPoint === "SECOND" ? "二买" : "三买"}确认`
      : `5分钟${chan5.sellPoint === "SECOND" ? "二卖" : "三卖"}确认`
    : pathTurnTrigger
      ? plan?.setup === "BUY_DIP" ? "30分钟下探后5分钟右侧收回" : "30分钟冲高后5分钟右侧转弱"
      : reclaimTrigger
        ? "5分钟回踩/反抽后重新收回执行均线"
        : exactCross
          ? "5分钟收盘穿越执行均线"
          : continuationTrigger
            ? "5分钟顺势延续确认"
            : "等待5分钟二/三买卖或右侧确认";

  const volumeAverage = average(m5.slice(-20).map((row) => row.volume));
  const volumeMet = Boolean(latest5 && (volumeAverage <= 0 || latest5.volume >= volumeAverage * 0.55));
  const volatility = volatilityCondition(m30, atr30, 5.5);
  const priorCompatible = strongCountertrend || !prior || prior.direction === direction;
  const environmentAligned = strongCountertrend || activeDirection.direction === direction;
  const environmentSoft = mooxDirection !== "NEUTRAL" && activeDirection.direction === "NEUTRAL" && Math.abs(activeDirection.strength) < 14;
  const conditions: ThreeHorizonCondition[] = [
    {
      key: "environment",
      label: "4小时大结构",
      met: direction !== "NEUTRAL" && (environmentAligned || environmentSoft),
      value: `${activeDirection.label}；MOOX主方向${mooxDirection === "NEUTRAL" ? "未锁定" : mooxDirection === "LONG" ? "偏多" : "偏空"}${focusCountertrend ? "；当前执行预设周内反向段" : baziCountertrend && marketBaziRegime ? `；资产八字${marketBaziRegime.direction === "LONG" ? "偏多" : "偏空"}与4H/30m共振，仅小仓反向` : ""}`,
      weight: 20,
    },
    {
      key: "direction",
      label: "30分钟主操作线段",
      met: structureMet,
      value: `收盘${latest30?.close ?? 0}，EMA20 ${round(ema30, 2)}，RSI ${round(rsi30, 1)}，趋势分${m30Signal.score}；缠论${chan30.sufficient ? `${chan30.trendState}/${chan30.buyPoint}/${chan30.sellPoint}` : "样本不足"}`,
      weight: 25,
    },
    {
      key: "entry",
      label: "5分钟精确买卖点",
      met: entryMet,
      value: `${entryTriggerLabel}；二/三买=${chan5.buyPoint}，二/三卖=${chan5.sellPoint}`,
      weight: 25,
    },
    {
      key: "micro",
      label: "1分钟成交微调",
      met: microTrigger,
      value: m1.length ? `${microTrigger ? "微周期同向" : "微周期等待"}；EMA9 ${round(ema1, 4)}；1m买点=${chan1.buyPoint}，卖点=${chan1.sellPoint}` : "1分钟数据暂不可用；不替代5分钟确认，也不改变正式方向",
      weight: 0,
    },
    { key: "forecast", label: "站内预测方向", met: forecast.compatible, value: forecast.label, weight: 10 },
    { key: "hexagram", label: "六爻时序先验", met: priorCompatible, value: prior ? `${prior.sourceSummary}；${prior.riskNote}` : "当前没有锁定六爻时序；技术结构不能自行决定多空", weight: 10 },
    { key: "risk", label: "波动与成交过滤", met: volatility.met && volumeMet, value: `${volatility.value}；成交量${volumeMet ? "可执行" : "过弱"}`, weight: 10 },
  ];
  const strength = focusCountertrend && executionFocus
    ? executionFocus.countertrendConfluence * directionValue(direction)
    : officialDirection.strength;
  const baseResult = finalizeEvaluation(profile, direction, conditions, forecast.score, m30, atr30, plan, livePrice, {
    directionStrength: strength,
    prior: focusCountertrend ? null : prior,
  });
  const result = applyAuxiliaryDirectionConflictGuard(baseResult, baziCountertrend);
  const withChan = {
    ...result,
    raw: {
      ...result.raw,
      chanExecution: {
        environment: "4H",
        operation: "30m",
        entry: "5m",
        microTiming: "1m",
        thirtyMinuteTrendState: chan30.trendState,
        thirtyMinuteBuyPoint: chan30.buyPoint,
        thirtyMinuteSellPoint: chan30.sellPoint,
        fiveMinuteTrendState: chan5.trendState,
        fiveMinuteBuyPoint: chan5.buyPoint,
        fiveMinuteSellPoint: chan5.sellPoint,
        fiveMinuteDivergence: chan5.divergence,
        oneMinuteAvailable: m1.length > 0,
        oneMinuteTrigger: microTrigger,
        oneMinuteBuyPoint: chan1.buyPoint,
        oneMinuteSellPoint: chan1.sellPoint,
        trigger: entryTriggerLabel,
      },
      marketBaziRegime,
      marketBaziRelation: marketBaziRegime
        ? marketBaziRegime.direction === mooxDirection ? "ALIGN" : "CONFLICT"
        : "NO_SIGNAL",
    },
  };
  if (!strongCountertrend) return withChan;
  const countertrendSource = "WEEKLY_TACTICAL";
  const countertrendRiskScale = executionFocus?.countertrendRiskScale ?? PROBE_RISK_SCALE;
  const countertrendConfluence = executionFocus?.countertrendConfluence ?? 0;
  if (!withChan.ready) return {
    ...withChan,
    raw: {
      ...withChan.raw,
      countertrendSource,
      focusCountertrend,
      baziCountertrend,
      focusMainDirection,
      focusTacticalDirection,
      countertrendConfluence,
      countertrendRiskScale,
    },
  };
  return {
    ...withChan,
    executionTier: "PROBE",
    riskScale: Math.min(withChan.riskScale || PROBE_RISK_SCALE, countertrendRiskScale),
    rejectionCode: "FOCUS_COUNTERTREND_PROBE",
    rejectionReason: `周内反向段与4H/30m形成强共振，只执行小仓探路；风险缩放至${Math.round(countertrendRiskScale * 100)}%，主趋势条件出现后立即停止反向。`,
    raw: {
      ...withChan.raw,
      countertrendSource,
      focusCountertrend,
      baziCountertrend,
      focusMainDirection,
      focusTacticalDirection,
      countertrendConfluence,
      countertrendRiskScale,
    },
  };
}

function weeklyTimingForNewExposure(input: {
  direction: ThreeHorizonDirection;
  plan: PredictionStrategyPlan | null | undefined;
  now: Date;
}) {
  return evaluateWeeklyLongEntryTiming({
    strategyType: "SWING",
    direction: input.direction,
    weeklyPath: input.plan?.weeklyForecast?.path ?? null,
    weeklyStatus: input.plan?.weeklyForecast?.status ?? null,
    weeklyPublishedAt: input.plan?.weeklyForecast?.publishedAt ?? null,
    weeklyLockedAt: input.plan?.weeklyForecast?.lockedAt ?? null,
    weeklyPeriodStart: input.plan?.weeklyForecast?.periodStart ?? null,
    weeklyPeriodEnd: input.plan?.weeklyForecast?.periodEnd ?? null,
    nowMs: input.now.getTime(),
    atDirectionalEdge: false,
    falseBreakReclaimed: false,
  });
}

function evaluateSwing(
  profile: ThreeHorizonStrategyProfile,
  symbol: BitgetSupportedSymbol,
  candles: CandleSet,
  plan: PredictionStrategyPlan | undefined,
  now: Date,
  livePrice?: number
): EvaluationResult {
  const d1 = closedCandles(candles["1D"], "1D", now);
  const h4 = closedCandles(candles["4H"], "4H", now);
  const h1 = closedCandles(candles["1H"], "1H", now);
  const weeks = completedAggregateCandles(d1, weekKey, now);
  const prior = getHexagramDirectionPrior(symbol, profile.strategyType, now);
  const weeklySignal = technicalDirectionSignal(weeks, 3, 6, 3);
  const dailySignal = technicalDirectionSignal(d1, 10, 30, 5);
  const h4Signal = technicalDirectionSignal(h4, 8, 20, 6);
  const primaryScore = weeklySignal.score * 0.38 + dailySignal.score * 0.62;
  const primarySignal: DirectionSignal = {
    direction: primaryScore >= 7 ? "LONG" : primaryScore <= -7 ? "SHORT" : "NEUTRAL",
    score: round(primaryScore, 1),
    label: `周线${weeklySignal.score}/日线${dailySignal.score}合成${round(primaryScore, 1)}`,
  };
  const activeDirection = resolveActiveDirection({
    primary: primarySignal,
    secondary: h4Signal,
    plan: undefined,
    prior: null,
    primaryWeight: 0.75,
    secondaryWeight: 0.25,
  });
  const officialDirection = resolveOfficialMooxDirection({ plan, prior, strategyType: profile.strategyType });
  const direction = officialDirection.direction;
  const marketStructure = classifyDirectionalMarketStructure(h1, direction);
  const latest1h = last(h1);
  const previous1h = h1[h1.length - 2];
  const ema1h = last(ema(h1.map((row) => row.close), 12)) ?? 0;
  const structureMet = direction !== "NEUTRAL" && !marketStructure.currentEntryInvalidated;
  const breakoutTrigger = direction === "LONG"
    ? Boolean(latest1h && previous1h && latest1h.close > ema1h && latest1h.close > previous1h.high)
    : direction === "SHORT"
      ? Boolean(latest1h && previous1h && latest1h.close < ema1h && latest1h.close < previous1h.low)
      : false;
  const continuationTrigger = direction === "LONG"
    ? Boolean(latest1h && latest1h.close > ema1h && h4Signal.score >= 10)
    : direction === "SHORT"
      ? Boolean(latest1h && latest1h.close < ema1h && h4Signal.score <= -10)
      : false;
  const confirmationTrigger = breakoutTrigger || continuationTrigger || marketStructure.falseBreakReclaimed || marketStructure.breakoutConfirmed;
  const directionalEdgeProbe = marketStructure.atDirectionalEdge && !marketStructure.currentEntryInvalidated;
  const weeklyLongTiming = weeklyTimingForNewExposure({ direction, plan, now });
  const triggerMet = confirmationTrigger || directionalEdgeProbe;
  const forecast = forecastCompatibility(direction, plan, profile.strategyType);
  const atr4h = atr(h4);
  const volatility = volatilityCondition(h4, atr4h, 8);
  const priorCompatible = !prior || prior.direction === direction;
  const conditions: ThreeHorizonCondition[] = [
    { key: "weekly", label: "正式周方向", met: direction !== "NEUTRAL", value: `${officialDirection.label}；周线技术仅作路径备注：${weeklySignal.label}`, weight: 15 },
    { key: "daily", label: "日线路径", met: direction !== "NEUTRAL", value: `${activeDirection.label}；日内反向只描述回撤路径，不否决或翻转周方向`, weight: 20 },
    { key: "structure", label: "关键结构边沿", met: structureMet, value: `${marketStructure.label}；边沿${marketStructure.lowerEdge ?? "—"}-${marketStructure.upperEdge ?? "—"}`, weight: 20 },
    { key: "entry", label: "1小时入场", met: triggerMet, value: confirmationTrigger ? "收回/突破确认" : directionalEdgeProbe ? "到达周方向对应边沿，仅允许小风险左侧探路" : "结构中部，等待关键边沿", weight: 15 },
    { key: "forecast", label: "周日预测加权", met: forecast.compatible, value: forecast.label, weight: 10 },
    { key: "hexagram", label: "六爻时序先验", met: priorCompatible, value: prior ? `${prior.sourceSummary}；${prior.riskNote}` : "当前无锁定六爻时序", weight: 10 },
    { key: "risk", label: "4小时波动过滤", met: volatility.met, value: volatility.value, weight: 10 },
  ];
  return finalizeEvaluation(profile, direction, conditions, forecast.score, h4, atr4h, plan, livePrice, {
    directionStrength: officialDirection.strength,
    prior,
    probeOnly: directionalEdgeProbe && !confirmationTrigger,
    currentEntryInvalidated: marketStructure.currentEntryInvalidated,
    timingBlockReason: weeklyLongTiming.blocked ? weeklyLongTiming.reason : null,
  });
}

function evaluatePosition(
  profile: ThreeHorizonStrategyProfile,
  symbol: BitgetSupportedSymbol,
  candles: CandleSet,
  plan: PredictionStrategyPlan | undefined,
  now: Date,
  livePrice?: number
): EvaluationResult {
  const d1 = closedCandles(candles["1D"], "1D", now);
  const h4 = closedCandles(candles["4H"], "4H", now);
  const weeks = completedAggregateCandles(d1, weekKey, now);
  const months = completedAggregateCandles(d1, monthKey, now);
  const prior = getHexagramDirectionPrior(symbol, profile.strategyType, now);
  const monthlyFallbackDirection = slopeDirection(months, 2);
  const monthlySignal: DirectionSignal = months.length >= 4
    ? technicalDirectionSignal(months, 2, 3, 2)
    : {
        direction: monthlyFallbackDirection,
        score: directionValue(monthlyFallbackDirection) * 32,
        label: "月线斜率替代",
      };
  const weeklySignal = technicalDirectionSignal(weeks, 3, 6, 3);
  const dailySignal = technicalDirectionSignal(d1, 10, 30, 8);
  const officialDirection = resolveOfficialMooxDirection({ plan, prior, strategyType: profile.strategyType });
  const direction = officialDirection.direction;
  const marketStructure = classifyDirectionalMarketStructure(h4, direction);
  const latest4h = last(h4);
  const previous4h = h4[h4.length - 2];
  const ema4h = last(ema(h4.map((row) => row.close), 20)) ?? 0;
  const directionMet = direction !== "NEUTRAL" && !marketStructure.currentEntryInvalidated;
  const continuationTrigger = direction === "LONG"
    ? Boolean(latest4h && previous4h && latest4h.close > ema4h && latest4h.close > previous4h.close)
    : direction === "SHORT"
      ? Boolean(latest4h && previous4h && latest4h.close < ema4h && latest4h.close < previous4h.close)
      : false;
  const confirmationTrigger = continuationTrigger || marketStructure.falseBreakReclaimed || marketStructure.breakoutConfirmed;
  const directionalEdgeProbe = marketStructure.atDirectionalEdge && !marketStructure.currentEntryInvalidated;
  const triggerMet = confirmationTrigger || directionalEdgeProbe;
  const forecast = forecastCompatibility(direction, plan, profile.strategyType);
  const atrDaily = atr(d1);
  const volatility = volatilityCondition(d1, atrDaily, 12);
  const priorCompatible = !prior || prior.direction === direction;
  const conditions: ThreeHorizonCondition[] = [
    { key: "monthly", label: "月度环境", met: monthlySignal.direction !== "NEUTRAL", value: monthlySignal.label, weight: 15 },
    { key: "weekly", label: "正式周方向", met: direction !== "NEUTRAL", value: `${officialDirection.label}；周度技术仅作路径备注：${weeklySignal.label}`, weight: 20 },
    { key: "daily", label: "日线路径与入场有效性", met: directionMet, value: `${marketStructure.label}；日线技术分${dailySignal.score}不参与方向投票`, weight: 20 },
    { key: "entry", label: "4小时入场", met: triggerMet, value: confirmationTrigger ? "收回/突破确认" : directionalEdgeProbe ? "到达周方向对应边沿，仅允许小风险探路" : "等待关键边沿或确认", weight: 15 },
    { key: "forecast", label: "长期预测加权", met: forecast.compatible, value: forecast.label, weight: 10 },
    { key: "hexagram", label: "六爻周期先验", met: priorCompatible, value: prior ? `${prior.sourceSummary}；${prior.riskNote}` : "当前无锁定六爻周期", weight: 10 },
    { key: "risk", label: "日线波动过滤", met: volatility.met, value: volatility.value, weight: 10 },
  ];
  return finalizeEvaluation(profile, direction, conditions, forecast.score, d1, atrDaily, plan, livePrice, {
    directionStrength: officialDirection.strength,
    prior,
    probeOnly: directionalEdgeProbe && !confirmationTrigger,
    currentEntryInvalidated: marketStructure.currentEntryInvalidated,
  });
}

function finalizeEvaluation(
  profile: ThreeHorizonStrategyProfile,
  direction: ThreeHorizonDirection,
  conditions: ThreeHorizonCondition[],
  forecastScore: number,
  priceCandles: BitgetDemoCandle[],
  atrValue: number,
  plan: PredictionStrategyPlan | undefined,
  livePrice?: number,
  context: { directionStrength: number; prior: HexagramDirectionPrior | null; probeOnly?: boolean; currentEntryInvalidated?: boolean; timingBlockReason?: string | null } = {
    directionStrength: 0,
    prior: null,
  }
): EvaluationResult {
  const candlePrice = last(priceCandles)?.close ?? null;
  const currentPrice = livePrice && Number.isFinite(livePrice) && livePrice > 0 ? livePrice : candlePrice;
  const technicalConditions = conditions.filter((row) => !["forecast", "hexagram"].includes(row.key));
  const technicalWeight = technicalConditions.reduce((sum, row) => sum + row.weight, 0) || 1;
  const technicalScore = Math.round(
    technicalConditions.reduce((sum, row) => sum + (row.met ? row.weight : 0), 0) /
      technicalWeight * 100
  );
  const priorCompatible = !context.prior || context.prior.direction === direction;
  const priorScore = context.prior
    ? priorCompatible ? context.prior.confidence : Math.max(0, 100 - context.prior.confidence)
    : 50;
  const weight = profile.strategyType === "INTRADAY"
    ? { technical: 0.68, forecast: 0.12, prior: 0.2 }
    : profile.strategyType === "SWING"
      ? { technical: 0.55, forecast: 0.15, prior: 0.3 }
      : { technical: 0.45, forecast: 0.15, prior: 0.4 };
  const confidence = Math.round(
    technicalScore * weight.technical +
    forecastScore * weight.forecast +
    priorScore * weight.prior
  );
  const swingRows = priceCandles.slice(-12);
  const swingLow = swingRows.length ? Math.min(...swingRows.map((row) => row.low)) : 0;
  const swingHigh = swingRows.length ? Math.max(...swingRows.map((row) => row.high)) : 0;
  const prices = currentPrice
    ? pricePlan({
        strategyType: profile.strategyType,
        direction,
        entry: currentPrice,
        atrValue,
        swingLow,
        swingHigh,
      })
    : null;
  const riskMet = conditions.find((row) => row.key === "risk")?.met === true;
  const entryMet = conditions.find((row) => row.key === "entry")?.met === true;
  const directionEvidenceKeys = profile.strategyType === "INTRADAY"
    ? ["environment", "direction"]
    : profile.strategyType === "SWING"
      ? ["weekly", "daily", "structure"]
      : ["monthly", "weekly", "daily"];
  const directionEvidenceMet = conditions.filter(
    (row) => directionEvidenceKeys.includes(row.key) && row.met
  ).length;
  const minimumEvidence = profile.strategyType === "INTRADAY" ? 1 : 2;
  const entryEligibility = applyWeeklyTimingToEntryEligibility({
    otherwiseEligible: Boolean(direction !== "NEUTRAL" && currentPrice && prices && riskMet && !context.currentEntryInvalidated),
    timing: {
      blocked: Boolean(context.timingBlockReason),
      riskMatched: null,
      reason: context.timingBlockReason ?? "",
    },
  });
  const baseValid = entryEligibility.eligible;
  // V7.7: live execution uses MOOX for side selection and the market for timing.
  // The old 48/38 technical floors were calibrated like a confirmation-only system;
  // with a directional prior they rejected too many otherwise valid probe entries.
  // LIVE keeps the same hard risk filters but allows smaller staged entries earlier.
  const fullTechnicalFloor = profile.mode === "LIVE" ? 44 : 48;
  const probeTechnicalFloor = profile.mode === "LIVE" ? 34 : 38;
  const fullReady = Boolean(
    baseValid &&
    !context.probeOnly &&
    entryMet &&
    directionEvidenceMet >= minimumEvidence &&
    technicalScore >= fullTechnicalFloor &&
    confidence >= profile.minConfidence
  );
  const probeThreshold = Math.max(profile.planningMinConfidence, profile.minConfidence - 8);
  const probeReady = Boolean(
    profile.strategyType !== "POSITION" &&
    baseValid &&
    !fullReady &&
    entryMet &&
    directionEvidenceMet >= minimumEvidence &&
    technicalScore >= probeTechnicalFloor &&
    confidence >= probeThreshold &&
    Math.abs(context.directionStrength) >= 7 &&
    (priorCompatible || forecastScore >= 42)
  );
  const executionTier: EvaluationResult["executionTier"] = fullReady
    ? "FULL"
    : probeReady
      ? "PROBE"
      : "OBSERVE";
  const riskScale = fullReady ? 1 : probeReady ? PROBE_RISK_SCALE : 0;
  const ready = fullReady || probeReady;
  let rejectionCode = "";
  let rejectionReason = fullReady
    ? "方向、风险和收盘触发已满足，允许按完整风险预算执行。"
    : probeReady
      ? `方向已形成但精确入场尚未全部满足，按${Math.round(PROBE_RISK_SCALE * 100)}%风险预算先开第一批探路仓。`
      : "等待方向、风险或最小结构证据。";
  if (direction === "NEUTRAL") {
    rejectionCode = "NO_DIRECTION";
    rejectionReason = "玄学/正式预测来源没有形成唯一方向；技术分析不得替它决定多空。";
  } else if (!riskMet) {
    rejectionCode = "RISK_FILTER";
    rejectionReason = "行情数据、波动或成交过滤未通过。";
  } else if (!prices) {
    rejectionCode = "RISK_PLAN_INVALID";
    rejectionReason = "无法根据结构和ATR生成有效宽止损。";
  } else if (context.currentEntryInvalidated) {
    rejectionCode = "ENTRY_STRUCTURE_INVALID";
    rejectionReason = "价格已连续有效越过当前入场边沿；仅取消本次入场并等待新位置，不自动反手。";
  } else if (entryEligibility.rejectionCode) {
    rejectionCode = entryEligibility.rejectionCode;
    rejectionReason = context.timingBlockReason ?? "正式锁定周预测的时序门禁禁止本次新波段多仓。";
  } else if (directionEvidenceMet < minimumEvidence) {
    rejectionCode = "DIRECTION_EVIDENCE_LOW";
    rejectionReason = `执行结构证据仅${directionEvidenceMet}/${directionEvidenceKeys.length}项，未达到最小要求${minimumEvidence}项。`;
  } else if (confidence < probeThreshold || technicalScore < probeTechnicalFloor) {
    rejectionCode = "CONFIDENCE_LOW";
    rejectionReason = `综合置信度${confidence}%或技术分${technicalScore}%低于探路仓门槛。`;
  } else if (probeReady) {
    rejectionCode = "PROBE_ENTRY";
  }
  return {
    direction,
    confidence,
    technicalScore,
    forecastScore: Math.round(forecastScore),
    conditions,
    currentPrice,
    entryPrice: currentPrice,
    stopLoss: prices?.stopLoss ?? null,
    target1: prices?.target1 ?? null,
    target2: prices?.target2 ?? null,
    ready,
    rejectionCode,
    rejectionReason,
    executionTier,
    riskScale,
    directionStrength: context.directionStrength,
    raw: {
      forecastSetup: plan?.setup ?? "MISSING",
      forecastConfidence: plan?.confidence ?? null,
      executionTier,
      riskScale,
      directionStrength: context.directionStrength,
      atr: atrValue,
      swingLow,
      swingHigh,
      hexagramPrior: context.prior,
      phaseShiftToleranceDays: context.prior?.phaseShiftToleranceDays ?? 0,
    },
  };
}

let ensured = false;
export async function ensureThreeHorizonStrategyTables(): Promise<boolean> {
  if (!prisma) return false;
  if (ensured) return true;
  try {
    const catalogReady = await prisma.$queryRawUnsafe<Array<{ ready: boolean }>>(`
        SELECT to_regclass('trade_three_horizon_profiles') IS NOT NULL
          AND to_regclass('trade_three_horizon_decisions') IS NOT NULL
          AND to_regclass('trade_three_horizon_decisions_strategy_time_idx') IS NOT NULL
          AND to_regclass('trade_three_horizon_decisions_active_idx') IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema=current_schema() AND table_name='trade_three_horizon_profiles'
              AND column_name='planning_min_confidence'
          )
          AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema=current_schema() AND table_name='trade_three_horizon_decisions'
              AND column_name='plan_id'
          )
          AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema=current_schema() AND table_name='trade_three_horizon_decisions'
              AND column_name='scale_in_order_id'
          ) AS ready
      `).then((rows) => rows[0]?.ready === true).catch(() => false);
    if (catalogReady) {
      ensured = true;
      return true;
    }
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_three_horizon_profiles (
        strategy_type TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        mode TEXT NOT NULL DEFAULT 'SHADOW',
        symbols JSONB NOT NULL DEFAULT '["BTCUSDT","ETHUSDT"]'::jsonb,
        scan_interval_minutes INTEGER NOT NULL,
        risk_per_trade_pct DOUBLE PRECISION NOT NULL,
        max_holding_minutes INTEGER NOT NULL,
        planning_min_confidence INTEGER NOT NULL DEFAULT 45,
        min_confidence INTEGER NOT NULL,
        max_trades_per_day INTEGER NOT NULL,
        last_scan_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_three_horizon_decisions (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        decision_key TEXT NOT NULL UNIQUE,
        plan_id TEXT,
        strategy_type TEXT NOT NULL,
        mode TEXT NOT NULL,
        symbol TEXT NOT NULL,
        status TEXT NOT NULL,
        direction TEXT NOT NULL,
        confidence INTEGER NOT NULL DEFAULT 0,
        technical_score INTEGER NOT NULL DEFAULT 0,
        forecast_score INTEGER NOT NULL DEFAULT 0,
        conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
        rejection_code TEXT NOT NULL DEFAULT '',
        rejection_reason TEXT NOT NULL DEFAULT '',
        current_price DOUBLE PRECISION,
        entry_price DOUBLE PRECISION,
        stop_loss DOUBLE PRECISION,
        target_1 DOUBLE PRECISION,
        target_2 DOUBLE PRECISION,
        quantity DOUBLE PRECISION,
        risk_amount_usdt DOUBLE PRECISION,
        risk_pct DOUBLE PRECISION,
        max_holding_until TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        client_oid TEXT,
        bitget_order_id TEXT,
        protection_order_id TEXT,
        tp1_done BOOLEAN NOT NULL DEFAULT FALSE,
        entry_stage INTEGER NOT NULL DEFAULT 0,
        max_entry_stages INTEGER NOT NULL DEFAULT 2,
        scale_in_order_id TEXT,
        opened_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        realized_pnl_usdt DOUBLE PRECISION,
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_three_horizon_profiles
      ADD COLUMN IF NOT EXISTS planning_min_confidence INTEGER NOT NULL DEFAULT 45
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_three_horizon_decisions
      ADD COLUMN IF NOT EXISTS plan_id TEXT
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_three_horizon_decisions
      ADD COLUMN IF NOT EXISTS entry_stage INTEGER NOT NULL DEFAULT 0
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_three_horizon_decisions
      ADD COLUMN IF NOT EXISTS max_entry_stages INTEGER NOT NULL DEFAULT 2
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_three_horizon_decisions
      ADD COLUMN IF NOT EXISTS scale_in_order_id TEXT
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_three_horizon_decisions_strategy_time_idx
      ON trade_three_horizon_decisions(strategy_type, created_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_three_horizon_decisions_active_idx
      ON trade_three_horizon_decisions(status, symbol, updated_at DESC)
    `);
    for (const strategyType of STRATEGY_ORDER) {
      const definition = PROFILE_DEFINITIONS[strategyType];
      await prisma.$executeRaw`
        INSERT INTO trade_three_horizon_profiles (
          strategy_type, enabled, mode, symbols, scan_interval_minutes,
          risk_per_trade_pct, max_holding_minutes, planning_min_confidence,
          min_confidence, max_trades_per_day, updated_at
        ) VALUES (
          ${strategyType}, TRUE, 'SHADOW', ${JSON.stringify(definition.symbols)}::jsonb,
          ${definition.scanIntervalMinutes}, ${definition.riskPerTradePct},
          ${definition.maxHoldingMinutes}, ${definition.planningMinConfidence},
          ${definition.minConfidence}, ${definition.maxTradesPerDay}, NOW()
        ) ON CONFLICT (strategy_type) DO NOTHING
      `;
    }
    const environment = getBitgetDemoEnvironment();
    if (environment.mode === "LIVE_EXPERIMENT") {
      await prisma.$executeRawUnsafe(`
        UPDATE trade_three_horizon_profiles SET
          enabled = TRUE,
          mode = 'LIVE',
          symbols = '["BTCUSDT","ETHUSDT","HYPEUSDT","MUUSDT","QQQUSDT","XAUTUSDT","XAGUSDT","GOOGLUSDT","CLUSDT","SPYUSDT","SNDKUSDT","MSFTUSDT"]'::jsonb,
          scan_interval_minutes = CASE
            WHEN strategy_type='INTRADAY' THEN 1
            WHEN strategy_type='SWING' THEN 15
            ELSE 60 END,
          risk_per_trade_pct = CASE
            WHEN strategy_type='INTRADAY' THEN 0.18
            WHEN strategy_type='SWING' THEN 0.25
            ELSE 0.20 END,
          max_holding_minutes = CASE
            WHEN strategy_type='INTRADAY' THEN 480
            WHEN strategy_type='SWING' THEN 10080
            ELSE 40320 END,
          planning_min_confidence = CASE
            WHEN strategy_type='INTRADAY' THEN 40
            WHEN strategy_type='SWING' THEN 42
            ELSE 44 END,
          min_confidence = CASE
            WHEN strategy_type='INTRADAY' THEN 48
            WHEN strategy_type='SWING' THEN 50
            ELSE 52 END,
          max_trades_per_day = 5,
          updated_at = NOW()
      `);
    }
    if (
      environment.mode === "DEMO" &&
      environment.executionAllowed &&
      DEMO_ACTIVE_EXECUTION_ENABLED
    ) {
      await prisma.$executeRawUnsafe(`
        UPDATE trade_three_horizon_profiles SET
          enabled = TRUE,
          mode = 'DEMO',
          symbols = '["BTCUSDT","ETHUSDT","HYPEUSDT","MUUSDT","QQQUSDT","XAUTUSDT","XAGUSDT","GOOGLUSDT","CLUSDT","SPYUSDT","SNDKUSDT","MSFTUSDT"]'::jsonb,
          scan_interval_minutes = CASE
            WHEN strategy_type='INTRADAY' THEN 5
            WHEN strategy_type='SWING' THEN 15
            ELSE 60 END,
          risk_per_trade_pct = CASE
            WHEN strategy_type='INTRADAY' THEN 0.20
            WHEN strategy_type='SWING' THEN 0.30
            ELSE 0.25 END,
          planning_min_confidence = CASE
            WHEN strategy_type='INTRADAY' THEN 42
            WHEN strategy_type='SWING' THEN 44
            ELSE 46 END,
          min_confidence = CASE
            WHEN strategy_type='INTRADAY' THEN 52
            WHEN strategy_type='SWING' THEN 54
            ELSE 56 END,
          max_trades_per_day = CASE
            WHEN strategy_type='INTRADAY' THEN 4
            WHEN strategy_type='SWING' THEN 3
            ELSE 2 END,
          updated_at = NOW()
      `);
    }
    ensured = true;
    return true;
  } catch (error) {
    console.error("Three-horizon strategy tables unavailable", error);
    return false;
  }
}

function mapProfile(row: ProfileRow): ThreeHorizonStrategyProfile {
  const definition = PROFILE_DEFINITIONS[row.strategy_type];
  const symbols = parseJson<string[]>(row.symbols, definition.symbols)
    .map((value) => String(value).toUpperCase())
    .filter((value) => LIVE_EXPERIMENT_SYMBOL_PATTERN.test(value));
  return {
    ...definition,
    enabled: Boolean(row.enabled),
    mode: row.mode === "LIVE" ? "LIVE" : row.mode === "DEMO" ? "DEMO" : "SHADOW",
    symbols: symbols.length ? symbols : definition.symbols,
    scanIntervalMinutes: Math.max(1, Number(row.scan_interval_minutes || definition.scanIntervalMinutes)),
    riskPerTradePct: clamp(Number(row.risk_per_trade_pct || definition.riskPerTradePct), 0.1, 0.5),
    maxHoldingMinutes: Math.max(30, Number(row.max_holding_minutes || definition.maxHoldingMinutes)),
    planningMinConfidence: Math.round(clamp(Number(row.planning_min_confidence || definition.planningMinConfidence), 40, 80)),
    minConfidence: Math.round(clamp(Number(row.min_confidence || definition.minConfidence), 50, 90)),
    maxTradesPerDay: Math.max(0, Math.min(10, Number(row.max_trades_per_day || definition.maxTradesPerDay))),
    lastScanAt: iso(row.last_scan_at),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapDecision(row: DecisionRow): ThreeHorizonStrategyDecision {
  const conditions = parseJson<ThreeHorizonCondition[]>(row.conditions, []);
  return {
    id: row.id,
    runId: row.run_id,
    planId: row.plan_id,
    strategyType: row.strategy_type,
    strategyLabel: PROFILE_DEFINITIONS[row.strategy_type].label,
    mode: row.mode === "LIVE" ? "LIVE" : row.mode === "DEMO" ? "DEMO" : "SHADOW",
    symbol: row.symbol,
    status: row.status,
    direction: row.direction,
    confidence: Number(row.confidence || 0),
    technicalScore: Number(row.technical_score || 0),
    forecastScore: Number(row.forecast_score || 0),
    conditionsMet: conditions.filter((condition) => condition.met).length,
    conditionsTotal: conditions.length,
    conditions,
    rejectionCode: row.rejection_code,
    rejectionReason: row.rejection_reason,
    currentPrice: row.current_price == null ? null : Number(row.current_price),
    entryPrice: row.entry_price == null ? null : Number(row.entry_price),
    stopLoss: row.stop_loss == null ? null : Number(row.stop_loss),
    target1: row.target_1 == null ? null : Number(row.target_1),
    target2: row.target_2 == null ? null : Number(row.target_2),
    quantity: row.quantity == null ? null : Number(row.quantity),
    riskAmountUsdt: row.risk_amount_usdt == null ? null : Number(row.risk_amount_usdt),
    riskPct: row.risk_pct == null ? null : Number(row.risk_pct),
    maxHoldingUntil: iso(row.max_holding_until),
    expiresAt: iso(row.expires_at),
    clientOid: row.client_oid,
    bitgetOrderId: row.bitget_order_id,
    protectionOrderId: row.protection_order_id,
    tp1Done: Boolean(row.tp1_done),
    entryStage: Number(row.entry_stage ?? 0),
    maxEntryStages: Number(row.max_entry_stages ?? 2),
    scaleInOrderId: row.scale_in_order_id,
    openedAt: iso(row.opened_at),
    closedAt: iso(row.closed_at),
    realizedPnlUsdt: row.realized_pnl_usdt == null ? null : Number(row.realized_pnl_usdt),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

export async function getThreeHorizonProfiles(): Promise<ThreeHorizonStrategyProfile[]> {
  if (!(await ensureThreeHorizonStrategyTables()) || !prisma) return [];
  const rows = await prisma.$queryRawUnsafe<ProfileRow[]>(`
    SELECT * FROM trade_three_horizon_profiles
    ORDER BY CASE strategy_type WHEN 'INTRADAY' THEN 1 WHEN 'SWING' THEN 2 ELSE 3 END
  `);
  const environment = getBitgetDemoEnvironment();
  return rows.map((row) => {
    const mapped = mapProfile(row);
    if (environment.mode !== "LIVE_EXPERIMENT") return mapped;
    // Always expose the complete ten-market universe in live mode, even when an old
    // warm server instance still has legacy BTC/ETH profile rows cached.
    const liveThresholds = mapped.strategyType === "INTRADAY"
      ? { scanIntervalMinutes: 1, riskPerTradePct: 0.18, planningMinConfidence: 40, minConfidence: 48 }
      : mapped.strategyType === "SWING"
        ? { scanIntervalMinutes: 15, riskPerTradePct: 0.25, planningMinConfidence: 42, minConfidence: 50 }
        : { scanIntervalMinutes: 60, riskPerTradePct: 0.20, planningMinConfidence: 44, minConfidence: 52 };
    return {
      ...mapped,
      ...liveThresholds,
      enabled: true,
      mode: "LIVE" as const,
      symbols: [...LIVE_FULL_UNIVERSE_SYMBOLS],
      maxTradesPerDay: Math.min(5, environment.liveMaxTradesPerDay),
    };
  });
}

export async function updateThreeHorizonProfile(input: {
  strategyType: ThreeHorizonStrategyType;
  enabled?: boolean;
  mode?: ThreeHorizonStrategyMode;
  riskPerTradePct?: number;
  planningMinConfidence?: number;
  minConfidence?: number;
  maxTradesPerDay?: number;
}): Promise<ThreeHorizonStrategyProfile> {
  if (!(await ensureThreeHorizonStrategyTables()) || !prisma) {
    throw new Error("三周期策略数据库未连接");
  }
  const current = (await getThreeHorizonProfiles()).find(
    (profile) => profile.strategyType === input.strategyType
  );
  if (!current) throw new Error("策略不存在");
  const enabled = input.enabled ?? current.enabled;
  const mode = input.mode ?? current.mode;
  const risk = input.riskPerTradePct == null
    ? current.riskPerTradePct
    : clamp(input.riskPerTradePct, 0.1, 0.5);
  const planningMinConfidence = input.planningMinConfidence == null
    ? current.planningMinConfidence
    : Math.round(clamp(input.planningMinConfidence, 40, 80));
  const minConfidence = input.minConfidence == null
    ? current.minConfidence
    : Math.round(clamp(input.minConfidence, 50, 90));
  if (planningMinConfidence >= minConfidence) {
    throw new Error("计划发布门槛必须低于模拟执行门槛");
  }
  const maxTrades = input.maxTradesPerDay == null
    ? current.maxTradesPerDay
    : Math.max(0, Math.min(10, Math.floor(input.maxTradesPerDay)));
  await prisma.$executeRaw`
    UPDATE trade_three_horizon_profiles SET
      enabled = ${enabled},
      mode = ${mode},
      risk_per_trade_pct = ${risk},
      planning_min_confidence = ${planningMinConfidence},
      min_confidence = ${minConfidence},
      max_trades_per_day = ${maxTrades},
      updated_at = NOW()
    WHERE strategy_type = ${input.strategyType}
  `;
  const updated = (await getThreeHorizonProfiles()).find(
    (profile) => profile.strategyType === input.strategyType
  );
  if (!updated) throw new Error("策略更新后读取失败");
  return updated;
}

async function listDecisionRows(limit = 60): Promise<DecisionRow[]> {
  if (!(await ensureThreeHorizonStrategyTables()) || !prisma) return [];
  return prisma.$queryRawUnsafe<DecisionRow[]>(
    `SELECT * FROM trade_three_horizon_decisions ORDER BY created_at DESC LIMIT $1`,
    Math.max(1, Math.min(300, Math.floor(limit)))
  );
}

async function listActiveDecisionRows(): Promise<DecisionRow[]> {
  if (!(await ensureThreeHorizonStrategyTables()) || !prisma) return [];
  const [active, legacy] = await Promise.all([
    prisma.$queryRawUnsafe<DecisionRow[]>(`
      SELECT * FROM trade_three_horizon_decisions
      WHERE status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING')
      ORDER BY created_at ASC
    `),
    prisma.$queryRawUnsafe<Array<DecisionRow & {
      outbox_decision_id: string | null;
      outbox_symbol: string | null;
      outbox_action: string | null;
      outbox_status: string | null;
      outbox_last_error: string | null;
      failure_stage: string | null;
      remote_submission_attempted: string | null;
    }>>(`
      SELECT d.*,
             o.decision_id AS outbox_decision_id,
             o.symbol AS outbox_symbol,
             o.action_type AS outbox_action,
             o.status AS outbox_status,
             o.last_error AS outbox_last_error,
             o.payload->'executionFailure'->>'stage' AS failure_stage,
             o.payload->'executionFailure'->>'remoteSubmissionAttempted' AS remote_submission_attempted
      FROM trade_three_horizon_decisions d
      JOIN LATERAL (
        SELECT * FROM trade_execution_outbox
        WHERE decision_id=d.id AND action_type='CLOSE_MARKET'
        ORDER BY created_at DESC LIMIT 1
      ) o ON TRUE
      WHERE d.status='ERROR' AND d.rejection_code='TIME_EXIT_FAILED'
      ORDER BY d.created_at ASC
    `),
  ]);
  const recoverable = legacy.filter((row) => isRecoverableLegacyTimeExit({
    decisionId: row.id,
    decisionSymbol: row.symbol,
    decisionStatus: row.status,
    rejectionCode: row.rejection_code,
    outboxDecisionId: row.outbox_decision_id,
    outboxSymbol: row.outbox_symbol,
    outboxAction: row.outbox_action,
    outboxStatus: row.outbox_status,
    outboxLastError: row.outbox_last_error,
    failureStage: row.failure_stage,
    remoteSubmissionAttempted: row.remote_submission_attempted,
  }));
  return [...active, ...recoverable];
}

function beijingStartOfDay(now: Date): Date {
  const shifted = new Date(now.getTime() + 8 * 60 * 60_000);
  const utc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(utc - 8 * 60 * 60_000);
}

function beijingHour(now: Date): number {
  return new Date(now.getTime() + 8 * 60 * 60_000).getUTCHours();
}

async function executedOrderCountToday(now: Date, mode: "LIVE" | "DEMO"): Promise<number> {
  if (!prisma) return 0;
  const start = beijingStartOfDay(now);
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
    `SELECT COUNT(*)::bigint AS count
     FROM trade_three_horizon_decisions
     WHERE created_at >= $1 AND mode = $2
       AND (bitget_order_id IS NOT NULL OR client_oid IS NOT NULL OR status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING','CLOSED'))`,
    start,
    mode,
  );
  const value = Number(rows[0]?.count ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function symbolExecutedOrderCountToday(symbol: string, now: Date, mode: "LIVE" | "DEMO"): Promise<number> {
  if (!prisma) return 0;
  const start = beijingStartOfDay(now);
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
    `SELECT COUNT(*)::bigint AS count
     FROM trade_three_horizon_decisions
     WHERE created_at >= $1 AND symbol = $2 AND mode = $3
       AND (bitget_order_id IS NOT NULL OR client_oid IS NOT NULL OR status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING','CLOSED'))`,
    start,
    symbol,
    mode,
  );
  const value = Number(rows[0]?.count ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function decisionRewardRisk(decision: ThreeHorizonStrategyDecision): number {
  if (!decision.entryPrice || !decision.stopLoss || !decision.target2) return 0;
  const riskDistance = Math.abs(decision.entryPrice - decision.stopLoss);
  if (!Number.isFinite(riskDistance) || riskDistance <= 0) return 0;
  return Math.abs(decision.target2 - decision.entryPrice) / riskDistance;
}

function dailyMinimumCandidateScore(decision: ThreeHorizonStrategyDecision, now = new Date()): number {
  const completion = decision.conditionsTotal > 0
    ? decision.conditionsMet / decision.conditionsTotal
    : 0;
  return aiTradingFocusPriority(decision.symbol, now) * 1.5
    + decision.confidence * 2
    + decision.technicalScore
    + decision.forecastScore * 0.5
    + completion * 50
    + decisionRewardRisk(decision) * 10;
}

async function selectDynamicTradeUniverse(
  allowedSymbols: BitgetSupportedSymbol[],
  forecastBySymbol: Map<string, PredictionStrategyPlan>,
  now: Date
): Promise<BitgetSupportedSymbol[]> {
  const allowed = Array.from(new Set(allowedSymbols))
    .map((value) => String(value).toUpperCase() as BitgetSupportedSymbol)
    .filter((value) => LIVE_EXPERIMENT_SYMBOL_PATTERN.test(value));
  // V7.9.1: stock-perp availability can differ by account/product state.
  // Keep the user-approved symbols in the pool, but only score contracts that Bitget reports online now.
  const contractRows = await Promise.all(
    allowed.map(async (symbol) => ({ symbol, contract: await getContractConfig(symbol).catch(() => null) }))
  );
  const tradable = contractRows
    .filter((row) => row.contract?.available)
    .map((row) => row.symbol);
  const recentRows = await listDecisionRows(300).catch(() => []);
  const latestBySymbol = new Map<string, DecisionRow>();
  for (const row of recentRows) {
    const symbol = String(row.symbol).toUpperCase();
    if (!latestBySymbol.has(symbol)) latestBySymbol.set(symbol, row);
  }
  // MOOX_MARKET_ENVIRONMENT_V711: capital-flow context is a bounded ranking input only.
  // It never sets direction, entry, readiness or bypasses hard risk gates.
  const xSnapshot = await getXIntelligenceSnapshot().catch(() => null);
  const xSummaries = xSnapshot?.aggregate.summaries ?? [];

  return tradable
    .map((symbol, index) => {
      const forecast = forecastBySymbol.get(symbol);
      const recent = latestBySymbol.get(symbol);
      const statusBonus = recent?.status === "READY" || recent?.status === "SHADOW_READY"
        ? 18
        : recent?.status === "OBSERVING"
          ? 6
          : 0;
      const xEnvironmentBoost = buildXIntelligenceTradeUniverseBoost(xSummaries, symbol).score;
      const score = aiTradingFocusPriority(symbol, now) * 2
        + (forecast?.confidence ?? 0) * 0.55
        + (recent?.confidence ?? 0) * 0.45
        + (recent?.technical_score ?? 0) * 0.35
        + (recent?.forecast_score ?? 0) * 0.2
        + statusBonus
        + xEnvironmentBoost
        - index * 0.01;
      return { symbol, score };
    })
    .sort((a, b) => b.score - a.score)
    // Every tradable liveAllowedSymbol must enter the Cron decision/plan renewal pass.
    // UI may still display Top10, but plan renewal must not silently omit lower-ranked allowed symbols.
    .map((row) => row.symbol);
}

function beijingStartOfWeek(now: Date): Date {
  const day = beijingStartOfDay(now);
  const shifted = new Date(day.getTime() + 8 * 60 * 60_000);
  const weekday = shifted.getUTCDay() || 7;
  return new Date(day.getTime() - (weekday - 1) * 24 * 60 * 60_000);
}

function pnlInWindow(rows: BitgetDemoClosedPosition[], start: Date): number {
  return rows
    .filter((row) => {
      const timestamp = Date.parse(row.updatedAt ?? row.createdAt ?? "");
      return Number.isFinite(timestamp) && timestamp >= start.getTime();
    })
    .reduce((sum, row) => sum + row.netProfit, 0);
}

async function consecutiveStrategyLosses(): Promise<number> {
  if (!(await ensureThreeHorizonStrategyTables()) || !prisma) return 0;
  const rows = await prisma.$queryRawUnsafe<Array<{ realized_pnl_usdt: number | null }>>(`
    SELECT realized_pnl_usdt
    FROM trade_three_horizon_decisions
    WHERE status = 'CLOSED' AND realized_pnl_usdt IS NOT NULL
    ORDER BY closed_at DESC NULLS LAST, updated_at DESC
    LIMIT 20
  `);
  let losses = 0;
  for (const row of rows) {
    const pnl = Number(row.realized_pnl_usdt ?? 0);
    if (pnl < 0) losses += 1;
    else break;
  }
  return losses;
}

async function buildRiskSnapshot(now: Date): Promise<ThreeHorizonRiskSnapshot> {
  const environment = getBitgetDemoEnvironment();
  if (!environment.configured) {
    return {
      equityUsdt: null,
      availableUsdt: null,
      dailyNetPnlUsdt: 0,
      weeklyNetPnlUsdt: 0,
      dailyLossPct: 0,
      weeklyLossPct: 0,
      openRiskPct: 0,
      cryptoGroupRiskPct: 0,
      consecutiveLosses: 0,
      dailyLossLimitPct: DAILY_LOSS_LIMIT_PCT,
      weeklyLossLimitPct: WEEKLY_LOSS_LIMIT_PCT,
      openRiskLimitPct: OPEN_RISK_LIMIT_PCT,
      cryptoGroupRiskLimitPct: CRYPTO_GROUP_RISK_LIMIT_PCT,
      blocked: true,
      blockReason: environment.mode === "LIVE_EXPERIMENT" ? "Bitget实盘密钥尚未配置完整。" : "Bitget Demo密钥尚未配置完整。",
    };
  }
  try {
    const [account, closed, active, consecutiveLosses] = await Promise.all([
      testBitgetDemoConnection(),
      getBitgetDemoClosedPositions(100),
      listActiveDecisionRows(),
      consecutiveStrategyLosses(),
    ]);
    const rawEquity = account.detectedUsdt || account.equityUsdt || account.availableUsdt || 0;
    const equity = environment.mode === "LIVE_EXPERIMENT"
      ? Math.min(rawEquity, environment.liveInitialCapitalUsdt, 1000)
      : rawEquity;
    const rawAvailable = Number(account.availableUsdt);
    const availableUsdt = Number.isFinite(rawAvailable)
      ? Math.max(0, Math.min(rawAvailable, equity))
      : equity;
    const dailyNet = pnlInWindow(closed, beijingStartOfDay(now));
    const weeklyNet = pnlInWindow(closed, beijingStartOfWeek(now));
    const dailyLossPct = equity > 0 && dailyNet < 0 ? Math.abs(dailyNet) / equity * 100 : 0;
    const weeklyLossPct = equity > 0 && weeklyNet < 0 ? Math.abs(weeklyNet) / equity * 100 : 0;
    const openRiskAmount = active.reduce((sum, row) => sum + Number(row.risk_amount_usdt ?? 0), 0);
    const cryptoRiskAmount = active
      .filter((row) => ["BTCUSDT", "ETHUSDT", "HYPEUSDT"].includes(row.symbol))
      .reduce((sum, row) => sum + Number(row.risk_amount_usdt ?? 0), 0);
    const openRiskPct = equity > 0 ? openRiskAmount / equity * 100 : 0;
    const cryptoGroupRiskPct = equity > 0 ? cryptoRiskAmount / equity * 100 : 0;
    let blockReason = "";
    if (equity <= 0) blockReason = environment.mode === "LIVE_EXPERIMENT" ? "未检测到实盘实验资金。" : "未检测到可用于Demo交易的模拟资金。";
    // V7.20.10.0: the 1000U experiment uses the same percentage loss limits in
    // live and demo. The lower Bitget live-experiment absolute stops remain a
    // second independent kill switch, not a substitute for this portfolio gate.
    else if (dailyLossPct >= DAILY_LOSS_LIMIT_PCT) blockReason = `当日亏损达到${round(dailyLossPct, 2)}%，触发${DAILY_LOSS_LIMIT_PCT}%暂停线。`;
    else if (weeklyLossPct >= WEEKLY_LOSS_LIMIT_PCT) blockReason = `本周亏损达到${round(weeklyLossPct, 2)}%，触发${WEEKLY_LOSS_LIMIT_PCT}%暂停线。`;
    else if (openRiskPct >= OPEN_RISK_LIMIT_PCT) blockReason = `开放风险达到${round(openRiskPct, 2)}%，超过${OPEN_RISK_LIMIT_PCT}%上限。`;
    else if (cryptoGroupRiskPct >= CRYPTO_GROUP_RISK_LIMIT_PCT) blockReason = `加密货币风险组达到${round(cryptoGroupRiskPct, 2)}%，超过${CRYPTO_GROUP_RISK_LIMIT_PCT}%上限。`;
    else if (consecutiveLosses >= 3) blockReason = "三周期策略连续亏损3单，已禁止新开仓。";
    return {
      equityUsdt: equity || null,
      availableUsdt: availableUsdt || null,
      dailyNetPnlUsdt: round(dailyNet, 2),
      weeklyNetPnlUsdt: round(weeklyNet, 2),
      dailyLossPct: round(dailyLossPct, 3),
      weeklyLossPct: round(weeklyLossPct, 3),
      openRiskPct: round(openRiskPct, 3),
      cryptoGroupRiskPct: round(cryptoGroupRiskPct, 3),
      consecutiveLosses,
      dailyLossLimitPct: DAILY_LOSS_LIMIT_PCT,
      weeklyLossLimitPct: WEEKLY_LOSS_LIMIT_PCT,
      openRiskLimitPct: OPEN_RISK_LIMIT_PCT,
      cryptoGroupRiskLimitPct: CRYPTO_GROUP_RISK_LIMIT_PCT,
      blocked: Boolean(blockReason),
      blockReason,
    };
  } catch (error) {
    return {
      equityUsdt: null,
      availableUsdt: null,
      dailyNetPnlUsdt: 0,
      weeklyNetPnlUsdt: 0,
      dailyLossPct: 0,
      weeklyLossPct: 0,
      openRiskPct: 0,
      cryptoGroupRiskPct: 0,
      consecutiveLosses: 0,
      dailyLossLimitPct: DAILY_LOSS_LIMIT_PCT,
      weeklyLossLimitPct: WEEKLY_LOSS_LIMIT_PCT,
      openRiskLimitPct: OPEN_RISK_LIMIT_PCT,
      cryptoGroupRiskLimitPct: CRYPTO_GROUP_RISK_LIMIT_PCT,
      blocked: true,
      blockReason: error instanceof Error ? error.message : "Bitget风险数据读取失败。",
    };
  }
}

function profileDue(profile: ThreeHorizonStrategyProfile, now: Date): boolean {
  if (!profile.lastScanAt) return true;
  const previous = Date.parse(profile.lastScanAt);
  if (!Number.isFinite(previous)) return true;
  return now.getTime() - previous >= profile.scanIntervalMinutes * 60_000;
}

async function markProfileScanned(profile: ThreeHorizonStrategyProfile, now: Date): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRaw`
    UPDATE trade_three_horizon_profiles
    SET last_scan_at = ${now}, updated_at = NOW()
    WHERE strategy_type = ${profile.strategyType}
  `;
}

function decisionKey(
  profile: ThreeHorizonStrategyProfile,
  symbol: string,
  direction: ThreeHorizonDirection,
  now: Date
): string {
  const bucketMs = profile.scanIntervalMinutes * 60_000;
  const bucket = Math.floor(now.getTime() / bucketMs) * bucketMs;
  return `${profile.strategyType}:${symbol}:${direction}:${new Date(bucket).toISOString()}`;
}

function decisionExpiry(profile: ThreeHorizonStrategyProfile, now: Date): Date {
  const minutes = profile.strategyType === "INTRADAY"
    ? Math.max(15, profile.scanIntervalMinutes * 3)
    : profile.strategyType === "SWING"
      ? 4 * 60
      : 24 * 60;
  return new Date(now.getTime() + minutes * 60_000);
}

async function insertDecision(input: {
  runId: string;
  profile: ThreeHorizonStrategyProfile;
  symbol: string;
  status: ThreeHorizonDecisionStatus;
  evaluation: EvaluationResult;
  now: Date;
  rejectionCode?: string;
  rejectionReason?: string;
  quantity?: number | null;
  riskAmountUsdt?: number | null;
  riskPct?: number | null;
}): Promise<ThreeHorizonStrategyDecision> {
  if (!prisma) throw new Error("三周期策略数据库未连接");
  const id = `thd_${randomUUID()}`;
  const key = decisionKey(input.profile, input.symbol, input.evaluation.direction, input.now);
  const expiresAt = decisionExpiry(input.profile, input.now);
  const maxHoldingUntil = input.evaluation.ready
    ? new Date(input.now.getTime() + input.profile.maxHoldingMinutes * 60_000)
    : null;
  await prisma.$executeRaw`
    INSERT INTO trade_three_horizon_decisions (
      id, run_id, decision_key, strategy_type, mode, symbol, status, direction,
      confidence, technical_score, forecast_score, conditions,
      rejection_code, rejection_reason, current_price, entry_price,
      stop_loss, target_1, target_2, quantity, risk_amount_usdt, risk_pct,
      max_holding_until, expires_at, raw_payload, created_at, updated_at
    ) VALUES (
      ${id}, ${input.runId}, ${key}, ${input.profile.strategyType}, ${input.profile.mode},
      ${input.symbol}, ${input.status}, ${input.evaluation.direction},
      ${input.evaluation.confidence}, ${input.evaluation.technicalScore},
      ${input.evaluation.forecastScore}, ${JSON.stringify(input.evaluation.conditions)}::jsonb,
      ${input.rejectionCode ?? input.evaluation.rejectionCode},
      ${input.rejectionReason ?? input.evaluation.rejectionReason},
      ${input.evaluation.currentPrice}, ${input.evaluation.entryPrice},
      ${input.evaluation.stopLoss}, ${input.evaluation.target1}, ${input.evaluation.target2},
      ${input.quantity ?? null}, ${input.riskAmountUsdt ?? null}, ${input.riskPct ?? null},
      ${maxHoldingUntil}, ${expiresAt}, ${JSON.stringify(input.evaluation.raw)}::jsonb,
      NOW(), NOW()
    ) ON CONFLICT (decision_key) DO NOTHING
  `;
  const rows = await prisma.$queryRawUnsafe<DecisionRow[]>(
    `SELECT * FROM trade_three_horizon_decisions WHERE decision_key = $1 LIMIT 1`,
    key
  );
  const row = rows[0];
  if (!row) throw new Error("三周期策略决策写入失败");
  return mapDecision(row);
}

async function updateDecision(
  id: string,
  fields: {
    status?: ThreeHorizonDecisionStatus;
    rejectionCode?: string;
    rejectionReason?: string;
    currentPrice?: number | null;
    entryPrice?: number | null;
    quantity?: number | null;
    riskAmountUsdt?: number | null;
    riskPct?: number | null;
    clientOid?: string | null;
    bitgetOrderId?: string | null;
    protectionOrderId?: string | null;
    tp1Done?: boolean;
    entryStage?: number;
    maxEntryStages?: number;
    scaleInOrderId?: string | null;
    openedAt?: Date | null;
    closedAt?: Date | null;
    realizedPnlUsdt?: number | null;
  }
): Promise<ThreeHorizonStrategyDecision> {
  if (!prisma) throw new Error("三周期策略数据库未连接");
  const currentRows = await prisma.$queryRawUnsafe<DecisionRow[]>(
    `SELECT * FROM trade_three_horizon_decisions WHERE id = $1 LIMIT 1`,
    id
  );
  const current = currentRows[0];
  if (!current) throw new Error("三周期策略决策不存在");
  const transition = protectExecutionLifecycleStatus({
    currentStatus: current.status,
    requestedStatus: fields.status ?? current.status,
    bitgetOrderId: current.bitget_order_id,
    closedAt: current.closed_at,
  });
  await prisma.$executeRaw`
    UPDATE trade_three_horizon_decisions SET
      status = ${transition.status},
      rejection_code = ${transition.preserveExecutionMetadata ? current.rejection_code : fields.rejectionCode ?? current.rejection_code},
      rejection_reason = ${transition.preserveExecutionMetadata ? current.rejection_reason : fields.rejectionReason ?? current.rejection_reason},
      current_price = ${fields.currentPrice === undefined ? current.current_price : fields.currentPrice},
      entry_price = ${fields.entryPrice === undefined ? current.entry_price : fields.entryPrice},
      quantity = ${fields.quantity === undefined ? current.quantity : fields.quantity},
      risk_amount_usdt = ${fields.riskAmountUsdt === undefined ? current.risk_amount_usdt : fields.riskAmountUsdt},
      risk_pct = ${fields.riskPct === undefined ? current.risk_pct : fields.riskPct},
      client_oid = ${fields.clientOid === undefined ? current.client_oid : fields.clientOid},
      bitget_order_id = ${fields.bitgetOrderId === undefined ? current.bitget_order_id : fields.bitgetOrderId},
      protection_order_id = ${fields.protectionOrderId === undefined ? current.protection_order_id : fields.protectionOrderId},
      tp1_done = ${fields.tp1Done === undefined ? current.tp1_done : fields.tp1Done},
      entry_stage = ${fields.entryStage === undefined ? current.entry_stage : fields.entryStage},
      max_entry_stages = ${fields.maxEntryStages === undefined ? current.max_entry_stages : fields.maxEntryStages},
      scale_in_order_id = ${fields.scaleInOrderId === undefined ? current.scale_in_order_id : fields.scaleInOrderId},
      opened_at = ${fields.openedAt === undefined ? current.opened_at : fields.openedAt},
      closed_at = ${fields.closedAt === undefined ? current.closed_at : fields.closedAt},
      realized_pnl_usdt = ${fields.realizedPnlUsdt === undefined ? current.realized_pnl_usdt : fields.realizedPnlUsdt},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  const rows = await prisma.$queryRawUnsafe<DecisionRow[]>(
    `SELECT * FROM trade_three_horizon_decisions WHERE id = $1 LIMIT 1`,
    id
  );
  if (!rows[0]) throw new Error("三周期策略决策更新失败");
  return mapDecision(rows[0]);
}

async function todayTradeCount(profile: ThreeHorizonStrategyProfile, now: Date): Promise<number> {
  if (!prisma) return 0;
  const start = beijingStartOfDay(now);
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number | string | bigint }>>(
    `SELECT COUNT(*) AS count
     FROM trade_three_horizon_decisions
     WHERE strategy_type = $1 AND mode = $2
       AND (bitget_order_id IS NOT NULL OR client_oid IS NOT NULL OR status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING','CLOSED'))
       AND created_at >= $3::timestamptz`,
    profile.strategyType,
    profile.mode,
    start.toISOString()
  );
  return Number(rows[0]?.count ?? 0);
}

async function loadCandleSet(symbol: BitgetSupportedSymbol): Promise<CandleSet> {
  const intervals: BitgetCandleInterval[] = ["1m", "5m", "15m", "30m", "1H", "4H", "1D"];
  const rows = await Promise.allSettled(
    intervals.map((interval) =>
      getBitgetDemoCandles({
        symbol,
        interval,
        limit: interval === "1D" ? 400 : interval === "1m" ? 240 : interval === "5m" ? 180 : 120,
      })
    )
  );
  const value = (index: number): BitgetDemoCandle[] => {
    const row = rows[index];
    return row?.status === "fulfilled" ? row.value : [];
  };
  return {
    "1m": value(0),
    "5m": value(1),
    "15m": value(2),
    "30m": value(3),
    "1H": value(4),
    "4H": value(5),
    "1D": value(6),
  };
}

function beijingStartOfMonth(now: Date): Date {
  const shifted = new Date(now.getTime() + 8 * 60 * 60_000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - 8 * 60 * 60_000);
}

function cadenceStart(strategyType: ThreeHorizonStrategyType, now: Date): Date {
  if (strategyType === "SWING") return beijingStartOfWeek(now);
  if (strategyType === "POSITION") return beijingStartOfMonth(now);
  return beijingStartOfDay(now);
}

function cadenceLabel(strategyType: ThreeHorizonStrategyType): string {
  if (strategyType === "SWING") return "本周";
  if (strategyType === "POSITION") return "本月";
  return "今日";
}

async function cadenceTradeCount(profile: ThreeHorizonStrategyProfile, now: Date): Promise<number> {
  if (!prisma) return 0;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number | string | bigint }>>(
    `SELECT COUNT(*) AS count
     FROM trade_three_horizon_decisions
     WHERE strategy_type = $1 AND mode = $2
       AND (bitget_order_id IS NOT NULL OR client_oid IS NOT NULL OR status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING','CLOSED'))
       AND created_at >= $3::timestamptz`,
    profile.strategyType,
    profile.mode,
    cadenceStart(profile.strategyType, now).toISOString(),
  );
  return Number(rows[0]?.count ?? 0);
}

function evaluate(
  profile: ThreeHorizonStrategyProfile,
  symbol: BitgetSupportedSymbol,
  candles: CandleSet,
  plan: PredictionStrategyPlan | undefined,
  now: Date,
  livePrice?: number
): EvaluationResult {
  const required = profile.strategyType === "INTRADAY"
    ? (["5m", "30m", "4H"] as const)
    : profile.strategyType === "SWING"
      ? (["1H", "4H", "1D"] as const)
      : (["4H", "1D"] as const);
  const missing = required.filter((interval) => candles[interval].length === 0);
  if (missing.length) {
    return {
      direction: "NEUTRAL",
      confidence: 0,
      technicalScore: 0,
      forecastScore: 0,
      conditions: [{ key: "market-data", label: "必需行情周期", met: false, value: `缺少${missing.join("、")}已收盘K线`, weight: 100 }],
      currentPrice: null,
      entryPrice: null,
      stopLoss: null,
      target1: null,
      target2: null,
      ready: false,
      rejectionCode: "REQUIRED_TIMEFRAME_UNAVAILABLE",
      rejectionReason: `${profile.label}缺少必需行情周期${missing.join("、")}；只阻断本周期，不用无关周期失败拖住其他策略。`,
      executionTier: "OBSERVE",
      riskScale: 0,
      directionStrength: 0,
      raw: { missingRequiredTimeframes: missing },
    };
  }
  if (profile.strategyType === "INTRADAY") return evaluateIntraday(profile, symbol, candles, plan, now, livePrice);
  if (profile.strategyType === "SWING") return evaluateSwing(profile, symbol, candles, plan, now, livePrice);
  return evaluatePosition(profile, symbol, candles, plan, now, livePrice);
}


type LiveCommissioningState = {
  complete: boolean;
  active: boolean;
  recentlyCompleted: boolean;
  latest: DecisionRow | null;
};

function liveCommissioningProfile(now: Date, symbols: BitgetSupportedSymbol[]): ThreeHorizonStrategyProfile {
  return {
    ...PROFILE_DEFINITIONS.INTRADAY,
    label: "短线实盘闭环验收",
    description: "仅执行一次的小额真实开仓、保护和限时平仓验收；完成后自动转入正常三周期策略。",
    enabled: true,
    mode: "LIVE",
    symbols: [...symbols],
    scanIntervalMinutes: 1,
    riskPerTradePct: LIVE_COMMISSIONING_RISK_PCT,
    maxHoldingMinutes: LIVE_COMMISSIONING_MAX_HOLDING_MINUTES,
    planningMinConfidence: 50,
    minConfidence: 60,
    maxTradesPerDay: 1,
    lastScanAt: null,
    updatedAt: now.toISOString(),
  };
}

async function readLiveCommissioningState(now: Date): Promise<LiveCommissioningState> {
  if (!prisma) return { complete: false, active: false, recentlyCompleted: false, latest: null };
  const rows = await prisma.$queryRawUnsafe<DecisionRow[]>(`
    SELECT * FROM trade_three_horizon_decisions
    WHERE COALESCE(raw_payload->>'commissioning','false') = 'true'
    ORDER BY created_at DESC
    LIMIT 30
  `);
  const completed = rows.find((row) => row.status === "CLOSED") ?? null;
  const active = rows.find((row) =>
    ["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING"].includes(row.status) ||
    (row.status === "ERROR" && Boolean(row.client_oid || row.bitget_order_id))
  ) ?? null;
  const completedAt = completed ? new Date(completed.closed_at ?? completed.updated_at).getTime() : Number.NaN;
  return {
    complete: Boolean(completed),
    active: Boolean(active),
    recentlyCompleted: Boolean(completed && Number.isFinite(completedAt) && now.getTime() - completedAt < 2 * 60_000),
    latest: active ?? rows[0] ?? null,
  };
}

function quoteAgeSeconds(quote: BitgetDemoMarketQuote, now: Date): number {
  const timestamp = Date.parse(quote.capturedAt);
  return Number.isFinite(timestamp) ? Math.max(0, (now.getTime() - timestamp) / 1000) : Number.POSITIVE_INFINITY;
}

async function loadCommissioningCandleSet(symbol: BitgetSupportedSymbol): Promise<CandleSet> {
  const [m5, m15, h1] = await Promise.all([
    getBitgetDemoCandles({ symbol, interval: "5m", limit: 80 }),
    getBitgetDemoCandles({ symbol, interval: "15m", limit: 80 }),
    getBitgetDemoCandles({ symbol, interval: "1H", limit: 80 }),
  ]);
  return { "1m": [], "5m": m5, "15m": m15, "30m": [], "1H": h1, "4H": [], "1D": [] };
}

function candleMomentumScore(candles: CandleSet, livePrice: number, now: Date): number {
  const m5 = closedCandles(candles["5m"], "5m", now);
  const m15 = closedCandles(candles["15m"], "15m", now);
  const h1 = closedCandles(candles["1H"], "1H", now);
  const ema5 = last(ema(m5.map((row) => row.close), 9)) ?? livePrice;
  const ema15 = last(ema(m15.map((row) => row.close), 12)) ?? livePrice;
  const ema1h = last(ema(h1.map((row) => row.close), 20)) ?? livePrice;
  const previous5 = m5[Math.max(0, m5.length - 4)]?.close ?? livePrice;
  const previous15 = m15[Math.max(0, m15.length - 3)]?.close ?? livePrice;
  const relative = (reference: number) => reference > 0 ? (livePrice / reference - 1) * 100 : 0;
  return round(
    relative(ema5) * 4 +
    relative(ema15) * 2.5 +
    relative(ema1h) * 1.25 +
    relative(previous5) * 1.5 +
    relative(previous15),
    6
  );
}

function buildLiveCommissioningEvaluation(input: {
  symbol: BitgetSupportedSymbol;
  direction: Exclude<ThreeHorizonDirection, "NEUTRAL">;
  quote: BitgetDemoMarketQuote;
  momentumScore: number;
  mooxDirectionLabel: string;
  mooxDirectionStrength: number;
}): EvaluationResult {
  const price = input.quote.price;
  const stopPct = 0.6;
  const target1Pct = 0.4;
  const target2Pct = 0.7;
  const long = input.direction === "LONG";
  const stopLoss = round(price * (1 + (long ? -stopPct : stopPct) / 100), 8);
  const target1 = round(price * (1 + (long ? target1Pct : -target1Pct) / 100), 8);
  const target2 = round(price * (1 + (long ? target2Pct : -target2Pct) / 100), 8);
  const conditions: ThreeHorizonCondition[] = [
    { key: "environment", label: "实时行情", met: true, value: `Bitget报价${price}，时间${input.quote.capturedAt}`, weight: 20 },
    { key: "direction", label: "MOOX玄学方向", met: true, value: `${input.mooxDirectionLabel}；技术动量只用于选择入场时机，当前动量分${input.momentumScore}`, weight: 25 },
    { key: "entry", label: "闭环验收入场", met: true, value: "小额市价单，仅用于验证真实订单全链路", weight: 25 },
    { key: "forecast", label: "事前公开计划", met: true, value: "计划先发布并锁定，至少等待下一轮CRON", weight: 15 },
    { key: "risk", label: "小额风控", met: true, value: `风险预算${LIVE_COMMISSIONING_RISK_PCT}%，止损${stopPct}%，最长${LIVE_COMMISSIONING_MAX_HOLDING_MINUTES}分钟`, weight: 15 },
  ];
  return {
    direction: input.direction,
    confidence: 72,
    technicalScore: 72,
    forecastScore: 72,
    conditions,
    currentPrice: price,
    entryPrice: price,
    stopLoss,
    target1,
    target2,
    ready: true,
    rejectionCode: "LIVE_COMMISSIONING",
    rejectionReason: `首笔实盘闭环验收：${input.symbol}${input.direction === "LONG" ? "做多" : "做空"}，使用实时行情、小额风险、交易所保护单和30分钟限时退出。`,
    executionTier: "FULL",
    riskScale: 1,
    directionStrength: input.direction === "LONG" ? Math.abs(input.mooxDirectionStrength) : -Math.abs(input.mooxDirectionStrength),
    raw: {
      commissioning: true,
      quoteCapturedAt: input.quote.capturedAt,
      quotePrice: price,
      momentumScore: input.momentumScore,
      mooxDirectionLabel: input.mooxDirectionLabel,
      mooxDirectionStrength: input.mooxDirectionStrength,
      maxHoldingMinutes: LIVE_COMMISSIONING_MAX_HOLDING_MINUTES,
      riskPct: LIVE_COMMISSIONING_RISK_PCT,
    },
  };
}

async function runLiveCommissioning(input: {
  runId: string;
  now: Date;
  quotes: BitgetDemoMarketQuote[];
  risk: ThreeHorizonRiskSnapshot;
  positions: BitgetDemoPosition[];
  protections: BitgetDemoStrategyOrder[];
  reservedSymbols: Set<string>;
  forecastBySymbol: ReadonlyMap<string, PredictionStrategyPlan>;
  eligibleSymbols: readonly BitgetSupportedSymbol[];
  readDeadlineMs: number;
  newEntryCutoffMs: number;
  ledgerConsistent: boolean;
  authorityReadsOk: boolean;
}): Promise<{
  state: "COMPLETE" | "ACTIVE" | "WAITING" | "ATTEMPTED" | "ERROR";
  decision: ThreeHorizonStrategyDecision | null;
  attempted: boolean;
  success: boolean;
  error: boolean;
  message: string;
}> {
  const environment = getBitgetDemoEnvironment();
  if (environment.mode !== "LIVE_EXPERIMENT" || !environment.executionAllowed) {
    return { state: "COMPLETE", decision: null, attempted: false, success: false, error: false, message: "非实盘执行环境，不运行首笔闭环验收。" };
  }
  const state = await readLiveCommissioningState(input.now);
  if (state.active) {
    return { state: "ACTIVE", decision: state.latest ? mapDecision(state.latest) : null, attempted: false, success: false, error: false, message: "首笔实盘闭环验收已有委托或持仓，等待保护、止盈止损或限时平仓完成。" };
  }
  if (state.complete) {
    return { state: "COMPLETE", decision: state.latest ? mapDecision(state.latest) : null, attempted: false, success: false, error: false, message: state.recentlyCompleted ? "首笔实盘闭环刚刚完成，本轮不再开新仓。" : "首笔实盘闭环已经完成，正常三周期策略已接管。" };
  }
  if (input.positions.some((row) => row.total > 0)) {
    return { state: "WAITING", decision: null, attempted: false, success: false, error: false, message: "账户已有持仓，首笔闭环验收暂缓，避免与现有仓位冲突。" };
  }
  const quoteMap = new Map(input.quotes.map((quote) => [quote.symbol, quote] as const));
  const requestedCommissioningSymbols = prioritizeAllowedCommissioningSymbols(
    input.eligibleSymbols,
    LIVE_COMMISSIONING_PREFERRED_SYMBOLS
  );
  let contractRows: Array<{ symbol: BitgetSupportedSymbol; contract: Awaited<ReturnType<typeof getContractConfig>> | null }>;
  try {
    contractRows = await readWithinLiveScanDeadline(
      () => Promise.all(
        requestedCommissioningSymbols.map(async (symbol) => ({
          symbol,
          contract: await getContractConfig(symbol).catch(() => null),
        }))
      ),
      input.readDeadlineMs
    );
  } catch (error) {
    if (error instanceof LiveScanReadDeadlineError) {
      return { state: "WAITING", decision: null, attempted: false, success: false, error: false, message: "实盘扫描读取时间预算已用尽，本轮未写入决策且禁止下单。" };
    }
    throw error;
  }
  const commissioningUniverse = contractRows
    .filter((row) => row.contract?.available)
    .map((row) => row.symbol);
  const candidates = commissioningUniverse
    .map((symbol) => quoteMap.get(symbol))
    .filter((quote): quote is BitgetDemoMarketQuote => Boolean(quote))
    .filter((quote) => quoteAgeSeconds(quote, input.now) <= LIVE_COMMISSIONING_QUOTE_MAX_AGE_SECONDS);
  if (!candidates.length) {
    return {
      state: "WAITING",
      decision: null,
      attempted: false,
      success: false,
      error: false,
      message: `实盘允许池没有${LIVE_COMMISSIONING_QUOTE_MAX_AGE_SECONDS}秒内的新鲜可交易报价，首笔闭环禁止下单。`,
    };
  }
  try {
    const priorSymbol = String(state.latest?.symbol ?? "").toUpperCase() as BitgetSupportedSymbol;
    const priorDirection = state.latest?.direction;
    const profile = liveCommissioningProfile(input.now, commissioningUniverse);
    const pinned = commissioningUniverse.includes(priorSymbol) && (priorDirection === "LONG" || priorDirection === "SHORT")
      ? { symbol: priorSymbol, direction: priorDirection as Exclude<ThreeHorizonDirection, "NEUTRAL"> }
      : null;
    const scored: Array<{
      quote: BitgetDemoMarketQuote;
      candles: CandleSet;
      momentumScore: number;
      direction: Exclude<ThreeHorizonDirection, "NEUTRAL">;
      directionStrength: number;
      directionLabel: string;
    }> = [];
    for (const quote of candidates) {
      const plan = input.forecastBySymbol.get(quote.symbol);
      const prior = getHexagramDirectionPrior(quote.symbol, "INTRADAY", input.now);
      const official = resolveOfficialMooxDirection({ plan, prior, strategyType: profile.strategyType });
      if (official.direction === "NEUTRAL") continue;
      const candles = await readWithinLiveScanDeadline(
        () => loadCommissioningCandleSet(quote.symbol),
        input.readDeadlineMs
      );
      scored.push({
        quote,
        candles,
        momentumScore: candleMomentumScore(candles, quote.price, input.now),
        direction: official.direction,
        directionStrength: official.strength,
        directionLabel: official.label,
      });
    }
    if (!scored.length) {
      return {
        state: "WAITING",
        decision: null,
        attempted: false,
        success: false,
        error: false,
        message: "当前实盘允许池没有任何品种形成明确的MOOX玄学方向；首笔实盘闭环不允许由技术指标替代决定多空。",
      };
    }
    const commissioningRank = (row: (typeof scored)[number]): number => {
      const preferred = LIVE_COMMISSIONING_PREFERRED_SYMBOLS.includes(row.quote.symbol) ? 6 : 0;
      // Direction strength decides the side and dominates selection. Momentum is only a small
      // tie-breaker for *when/which asset* to execute, never for LONG vs SHORT.
      return Math.abs(row.directionStrength) * 10 + preferred + Math.min(5, Math.abs(row.momentumScore));
    };
    const selected = pinned
      ? scored.find((row) => row.quote.symbol === pinned.symbol && row.direction === pinned.direction) ??
        [...scored].sort((a, b) => commissioningRank(b) - commissioningRank(a))[0]
      : [...scored].sort((a, b) => commissioningRank(b) - commissioningRank(a))[0];
    if (!selected) throw new Error("未能找到具备明确MOOX方向的BTC/ETH闭环候选");
    const direction = selected.direction;
    const evaluation = buildLiveCommissioningEvaluation({
      symbol: selected.quote.symbol,
      direction,
      quote: selected.quote,
      momentumScore: selected.momentumScore,
      mooxDirectionLabel: selected.directionLabel,
      mooxDirectionStrength: selected.directionStrength,
    });
    let decision = await insertDecision({
      runId: input.runId,
      profile,
      symbol: selected.quote.symbol,
      status: "READY",
      evaluation,
      now: input.now,
      rejectionCode: "LIVE_COMMISSIONING",
      rejectionReason: evaluation.rejectionReason,
    });
    const planGate = await prepareAiTradePlanBeforeExecution({
      decision,
      profile,
      now: input.now,
      forecastPlan: input.forecastBySymbol.get(selected.quote.symbol) ?? null,
    });
    if (!planGate.allowed) {
      decision = await updateDecision(decision.id, {
        status: "BLOCKED",
        rejectionCode: planGate.code,
        rejectionReason: planGate.reason,
      });
      await syncAiTradePlanFromDecision(decision, input.now, { force: true }).catch(() => undefined);
      return {
        state: "WAITING",
        decision,
        attempted: false,
        success: false,
        error: false,
        message: `${evaluation.rejectionReason} ${planGate.reason}`,
      };
    }
    const lifecycle = await runNewEntryBeforeCutoff({
      cutoffMs: input.newEntryCutoffMs,
      now: Date.now,
      run: () => executeReadyDecision({
        decision, profile, evaluation, risk: input.risk, positions: input.positions,
        protections: input.protections, now: input.now, reservedSymbols: input.reservedSymbols, reservedRiskPct: 0,
        exposureAction: "COMMISSIONING_ENTRY",
        forecastPlan: input.forecastBySymbol.get(selected.quote.symbol),
        authorityReadsOk: input.authorityReadsOk,
        ledgerConsistent: input.ledgerConsistent,
      }),
    });
    if (!lifecycle.started) {
      decision = await updateDecision(decision.id, {
        status: "BLOCKED",
        rejectionCode: "TIME_BUDGET_REACHED",
        rejectionReason: "请求已进入收尾保留时间，本轮未启动首笔闭环订单。",
      });
      await syncAiTradePlanFromDecision(decision, input.now, { force: true }).catch(() => undefined);
      return { state: "WAITING", decision, attempted: false, success: false, error: false, message: decision.rejectionReason };
    }
    const executed = lifecycle.value;
    decision = executed.decision;
    await syncAiTradePlanFromDecision(decision, input.now, { force: true }).catch(() => undefined);
    return {
      state: executed.error ? "ERROR" : executed.success ? "ATTEMPTED" : "WAITING",
      decision,
      attempted: executed.attempted,
      success: executed.success,
      error: executed.error,
      message: executed.success
        ? `首笔实盘闭环订单已提交：${decision.symbol}${decision.direction === "LONG" ? "做多" : "做空"}。方向来自MOOX玄学锁定；随后由交易所止盈止损和${LIVE_COMMISSIONING_MAX_HOLDING_MINUTES}分钟限时退出管理。`
        : decision.rejectionReason || "首笔实盘闭环尚未达到执行闸门。",
    };
  } catch (error) {
    if (error instanceof LiveScanReadDeadlineError) {
      return {
        state: "WAITING",
        decision: null,
        attempted: false,
        success: false,
        error: false,
        message: "实盘扫描读取时间预算已用尽，本轮未写入决策且禁止下单。",
      };
    }
    return {
      state: "ERROR",
      decision: null,
      attempted: false,
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "首笔实盘闭环验收失败",
    };
  }
}

function orderSide(direction: ThreeHorizonDirection, reduceOnly = false): "buy" | "sell" {
  if (!reduceOnly) return direction === "SHORT" ? "sell" : "buy";
  return direction === "SHORT" ? "buy" : "sell";
}

function matchingPosition(
  positions: BitgetDemoPosition[],
  decision: Pick<ThreeHorizonStrategyDecision, "symbol" | "direction">
): BitgetDemoPosition | undefined {
  return positions.find(
    (row) =>
      row.symbol === decision.symbol &&
      row.posSide === (decision.direction === "SHORT" ? "short" : "long") &&
      row.total > 0
  );
}

function matchingProtection(
  orders: BitgetDemoStrategyOrder[],
  decision: Pick<ThreeHorizonStrategyDecision, "symbol" | "direction">
): BitgetDemoStrategyOrder | undefined {
  return orders.find(
    (row) =>
      row.symbol === decision.symbol &&
      row.posSide === (decision.direction === "SHORT" ? "short" : "long")
  );
}

function targetReached(
  direction: ThreeHorizonDirection,
  price: number,
  target: number | null
): boolean {
  if (!target) return false;
  return direction === "LONG" ? price >= target : direction === "SHORT" ? price <= target : false;
}

async function readScopedForecastPlanForScaleIn(
  symbol: string,
  now: Date
): Promise<PredictionStrategyPlan | null> {
  const settings = await getPredictionAutoTraderSettings({ readOnly: true });
  const baseSymbol = symbol.toUpperCase().replace(/USDT$/, "");
  const plans = await resolvePredictionStrategyPlans(settings, now, [baseSymbol]);
  return plans.find((plan) => {
    const normalized = String(plan.symbol).toUpperCase().replace(/USDT$/, "");
    return normalized === baseSymbol;
  }) ?? null;
}

function hardIntradayExit(decision: ThreeHorizonStrategyDecision, now: Date): boolean {
  if (decision.strategyType !== "INTRADAY" || !decision.openedAt) return false;
  const opened = new Date(new Date(decision.openedAt).getTime() + 8 * 60 * 60_000);
  const current = new Date(now.getTime() + 8 * 60 * 60_000);
  const differentDay = opened.toISOString().slice(0, 10) !== current.toISOString().slice(0, 10);
  const nearDayEnd = current.getUTCHours() === 23 && current.getUTCMinutes() >= 45;
  return differentDay || nearDayEnd;
}

function recentClosedMatch(
  closed: BitgetDemoClosedPosition[],
  decision: ThreeHorizonStrategyDecision
): BitgetDemoClosedPosition | undefined {
  const createdAt = Date.parse(decision.openedAt ?? decision.createdAt);
  return closed.find((row) => {
    if (row.symbol !== decision.symbol) return false;
    if (row.posSide !== (decision.direction === "SHORT" ? "short" : "long")) return false;
    const updated = Date.parse(row.updatedAt ?? row.createdAt ?? "");
    return !Number.isFinite(createdAt) || !Number.isFinite(updated) || updated >= createdAt - 60_000;
  });
}

async function closePosition(
  decision: ThreeHorizonStrategyDecision,
  position: BitgetDemoPosition,
  reason: string,
  protection?: BitgetDemoStrategyOrder
): Promise<ThreeHorizonStrategyDecision> {
  if (protection?.orderId) {
    await cancelBitgetDemoStrategyOrder({ orderId: protection.orderId }).catch(() => undefined);
  }
  const result = await placeBitgetDemoMarketOrder({
    paperOrderId: `${decision.id}:time-close`,
    symbol: decision.symbol as BitgetSupportedSymbol,
    quantity: position.total,
    side: orderSide(decision.direction, true),
    reduceOnly: true,
  });
  return updateDecision(decision.id, {
    status: "CLOSING",
    rejectionCode: "TIME_EXIT",
    rejectionReason: `${reason}；平仓订单${result.orderId}已提交。`,
    currentPrice: position.markPrice,
  });
}

async function manageActiveDecisions(now: Date): Promise<{
  managed: number;
  orderAttempts: number;
  orderSuccess: number;
  orderErrors: number;
  activeLedger: Array<{ symbol: string; side: "long" | "short" }>;
}> {
  const rows = await listActiveDecisionRows();
  if (!rows.length) return { managed: 0, orderAttempts: 0, orderSuccess: 0, orderErrors: 0, activeLedger: [] };
  const decisions = rows.map(mapDecision);
  const activeLedger = decisions.map((decision) => ({
    symbol: decision.symbol,
    side: decision.direction === "SHORT" ? "short" as const : "long" as const,
  }));
  const [positions, protections, closed, profiles] = await Promise.all([
    getBitgetDemoCurrentPositions(),
    getBitgetDemoPendingStrategyOrders(),
    getBitgetDemoClosedPositions(100),
    getThreeHorizonProfiles(),
  ]);
  const managementLedgerConsistent = isExposureLedgerConsistent({
    positions: positions.filter((row) => row.total > 0).map((row) => ({ symbol: row.symbol, side: row.posSide })),
    protections: protections.map((row) => ({ symbol: row.symbol, side: row.posSide })),
    activeDecisions: decisions.map((decision) => ({
      symbol: decision.symbol,
      side: decision.direction === "SHORT" ? "short" as const : "long" as const,
    })),
  });
  const profileByType = new Map(profiles.map((profile) => [profile.strategyType, profile] as const));
  const environment = getBitgetDemoEnvironment();
  let projectedOpenRiskPct = decisions.reduce((sum, row) => sum + Number(row.riskPct ?? 0), 0);
  let projectedCryptoRiskPct = decisions
    .filter((row) => ["BTCUSDT", "ETHUSDT", "HYPEUSDT"].includes(row.symbol))
    .reduce((sum, row) => sum + Number(row.riskPct ?? 0), 0);
  let orderAttempts = 0;
  let orderSuccess = 0;
  let orderErrors = 0;
  for (const decision of decisions) {
    const position = matchingPosition(positions, decision);
    if (!position) {
      const ageMs = now.getTime() - Date.parse(decision.createdAt);
      if (decision.status === "ORDER_SUBMITTED" && ageMs < 2 * 60_000) continue;
      const closedMatch = recentClosedMatch(closed, decision);
      await updateDecision(decision.id, {
        status: "CLOSED",
        closedAt: now,
        realizedPnlUsdt: closedMatch?.netProfit ?? decision.realizedPnlUsdt,
        rejectionCode: "",
        rejectionReason: closedMatch
          ? `Bitget Demo仓位已结束，净收益${round(closedMatch.netProfit, 2)} USDT。`
          : "Bitget Demo已无对应持仓，决策已归档。",
      });
      continue;
    }
    const openedAt = decision.openedAt ? new Date(decision.openedAt) : now;
    let current = await updateDecision(decision.id, {
      status: decision.status === "PARTIAL" ? "PARTIAL" : "OPEN",
      currentPrice: position.markPrice,
      entryPrice: position.avgPrice || decision.entryPrice,
      quantity: position.total,
      openedAt,
    });
    let protection = matchingProtection(protections, current);
    if (!protection && current.stopLoss && current.target2) {
      const ageMs = now.getTime() - Date.parse(current.createdAt);
      if (ageMs >= 30_000) {
        orderAttempts += 1;
        try {
          const placed = await placeBitgetDemoProtectionOrder({
            paperOrderId: `${current.id}:fallback-protection`,
            symbol: current.symbol as BitgetSupportedSymbol,
            posSide: current.direction === "SHORT" ? "short" : "long",
            stopLoss: current.stopLoss,
            takeProfit: current.target2,
          });
          current = await updateDecision(current.id, {
            protectionOrderId: placed.orderId,
            rejectionReason: "已补齐交易所侧止损和第二目标保护单。",
          });
          orderSuccess += 1;
          protection = {
            orderId: placed.orderId,
            clientOid: placed.clientOid,
            symbol: current.symbol,
            posSide: current.direction === "SHORT" ? "short" : "long",
            takeProfit: current.target2,
            stopLoss: current.stopLoss,
            createdAt: now.toISOString(),
          };
        } catch (error) {
          orderErrors += 1;
          try {
            await closePosition(current, position, "保护单创建失败，执行紧急平仓");
          } catch {
            await updateDecision(current.id, {
              status: "ERROR",
              rejectionCode: "PROTECTION_MISSING",
              rejectionReason: error instanceof Error ? error.message : "保护单创建失败",
            });
          }
          continue;
        }
      }
    }
    // V6.4 staged entry: a probe position may receive one confirmation add-on.
    // The existing exchange-side position protection is kept in place; Bitget UTA strategy
    // protection is position-side based, so the added quantity remains covered.
    if (
      environment.mode === "DEMO" &&
      current.entryStage === 1 &&
      current.maxEntryStages >= 2 &&
      !current.tp1Done &&
      Boolean(protection?.orderId) &&
      current.openedAt &&
      now.getTime() - Date.parse(current.openedAt) >= SCALE_IN_MIN_AGE_MINUTES * 60_000 &&
      !targetReached(current.direction, position.markPrice, current.target1)
    ) {
      const profile = profileByType.get(current.strategyType);
      const currentRiskPct = Number(current.riskPct ?? 0);
      const remainingRiskPct = profile ? Math.max(0, profile.riskPerTradePct - currentRiskPct) : 0;
      const crypto = ["BTCUSDT", "ETHUSDT", "HYPEUSDT"].includes(current.symbol);
      const riskRoom = projectedOpenRiskPct + remainingRiskPct <= OPEN_RISK_LIMIT_PCT + 1e-9;
      const cryptoRoom = !crypto || projectedCryptoRiskPct + remainingRiskPct <= CRYPTO_GROUP_RISK_LIMIT_PCT + 1e-9;
      if (profile && remainingRiskPct >= 0.04 && riskRoom && cryptoRoom) {
        try {
          const marketSessionGate = evaluateMarketSessionExposureSafety({
            symbol: current.symbol,
            action: "SCALE_IN",
            nowMs: now.getTime(),
          });
          if (!marketSessionGate.allowed) {
            current = await updateDecision(current.id, {
              rejectionCode: marketSessionGate.rejectionCode ?? "MARKET_SESSION_CLOSED",
              rejectionReason: marketSessionGate.reason,
            });
          } else {
            const forecastPlan = await readScopedForecastPlanForScaleIn(current.symbol, now);
            const scaleInGate = evaluateNewExposureSafety({
              action: "SCALE_IN",
              direction: current.direction,
              authorityReadsOk: true,
              ledgerConsistent: managementLedgerConsistent,
              timing: weeklyTimingForNewExposure({ direction: current.direction, plan: forecastPlan, now }),
            });
            if (!scaleInGate.allowed) {
              current = await updateDecision(current.id, {
                rejectionCode: scaleInGate.rejectionCode ?? "RECONCILIATION_REQUIRED",
                rejectionReason: scaleInGate.reason,
              });
            } else {
              const candles = await loadCandleSet(current.symbol as BitgetSupportedSymbol);
              const confirmation = evaluate(
                profile,
                current.symbol as BitgetSupportedSymbol,
                candles,
                undefined,
                now,
                position.markPrice
              );
              const entryConfirmed = confirmation.conditions.find((row) => row.key === "entry")?.met === true;
              const directionStillValid = confirmation.direction === current.direction;
              const entry = current.entryPrice ?? position.avgPrice;
              const stop = current.stopLoss ?? entry;
              const oneR = Math.abs(entry - stop);
              const adverseMove = current.direction === "LONG"
                ? entry - position.markPrice
                : position.markPrice - entry;
              const notDeeplyAdverse = oneR <= 0 || adverseMove <= oneR * 0.35;
              if (
                directionStillValid &&
                entryConfirmed &&
                confirmation.confidence >= profile.minConfidence &&
                confirmation.executionTier === "FULL" &&
                notDeeplyAdverse
              ) {
                const equity = currentRiskPct > 0 && current.riskAmountUsdt
                  ? Number(current.riskAmountUsdt) / (currentRiskPct / 100)
                  : 0;
                if (equity > 0) {
                  const sizing = await calculatePositionSize({
                    profile,
                    evaluation: {
                      ...confirmation,
                      entryPrice: position.markPrice,
                      currentPrice: position.markPrice,
                      stopLoss: current.stopLoss,
                      target1: current.target1,
                      target2: current.target2,
                      riskScale: 1,
                    },
                    equityUsdt: equity,
                    symbol: current.symbol as BitgetSupportedSymbol,
                    riskPctOverride: remainingRiskPct,
                  });
                  orderAttempts += 1;
                  const addOrder = await placeBitgetDemoMarketOrder({
                    paperOrderId: `${current.id}:scale-in-2`,
                    symbol: current.symbol as BitgetSupportedSymbol,
                    quantity: sizing.quantity,
                    side: orderSide(current.direction),
                    reduceOnly: false,
                  });
                  current = await updateDecision(current.id, {
                    entryStage: 2,
                    scaleInOrderId: addOrder.orderId,
                    riskAmountUsdt: round(Number(current.riskAmountUsdt ?? 0) + sizing.riskAmountUsdt, 4),
                    riskPct: round(currentRiskPct + sizing.riskPct, 4),
                    rejectionCode: "",
                    rejectionReason: `第二批确认仓已提交，orderId=${addOrder.orderId}；总风险约${round(currentRiskPct + sizing.riskPct, 3)}%，原交易所侧宽止损保护保持有效。`,
                  });
                  projectedOpenRiskPct += sizing.riskPct;
                  if (crypto) projectedCryptoRiskPct += sizing.riskPct;
                  orderSuccess += 1;
                }
              }
            }
          }
        } catch (error) {
          // The first batch already has exchange-side protection. A failed add-on check is
          // an informational skip, not an order-chain failure and must not stop the runtime.
          await updateDecision(current.id, {
            rejectionCode: "SCALE_IN_SKIPPED",
            rejectionReason: `第二批确认未执行，首批仓位和保护单保持不变：${error instanceof Error ? error.message : "加仓检查失败"}`,
          });
        }
      }
    }

    const maxHoldingReached = current.maxHoldingUntil
      ? now.getTime() >= Date.parse(current.maxHoldingUntil)
      : false;
    if (maxHoldingReached || hardIntradayExit(current, now)) {
      orderAttempts += 1;
      try {
        await closePosition(
          current,
          position,
          hardIntradayExit(current, now) ? "短线策略到达北京时间日终" : "达到最大持仓时间",
          protection
        );
        orderSuccess += 1;
      } catch (error) {
        orderErrors += 1;
        await updateDecision(current.id, {
          status: "ERROR",
          rejectionCode: "TIME_EXIT_FAILED",
          rejectionReason: error instanceof Error ? error.message : "时间止损平仓失败",
        });
      }
      continue;
    }
    if (shouldRunTp1ProtectionTransition({
      tp1Done: Boolean(rows.find((row) => row.id === current.id)?.tp1_done),
      targetReached: targetReached(current.direction, position.markPrice, current.target1),
    })) {
      orderAttempts += 1;
      try {
        const contract = await getContractConfig(current.symbol as BitgetSupportedSymbol);
        const half = position.total * 0.5;
        const halfSize = Number(normalizeOrderSize(half, contract));
        if (halfSize > 0 && halfSize < position.total) {
          const transition = await runTp1ProtectionTransition({
            reducePosition: async () => {
              await placeBitgetDemoMarketOrder({
                paperOrderId: `${current.id}:tp1`,
                symbol: current.symbol as BitgetSupportedSymbol,
                quantity: halfSize,
                side: orderSide(current.direction, true),
                reduceOnly: true,
              });
            },
            persistPartialClose: async () => {
              current = await updateDecision(current.id, {
                status: "PARTIAL",
                tp1Done: true,
                rejectionCode: "TP1_PROTECTION_TRANSITION",
                rejectionReason: "第一目标减仓已确认；正在以权威账户状态切换剩余仓位保护，后续轮次不得再次减仓。",
              });
            },
            cancelExistingProtection: async () => {
              if (protection?.orderId) {
                await cancelBitgetDemoStrategyOrder({
                  orderId: protection.orderId,
                  symbol: current.symbol,
                });
              }
            },
            readProtection: async () => matchingProtection(
              await getBitgetDemoPendingStrategyOrders(),
              current
            ) ?? null,
            readRemainingPosition: async () => matchingPosition(
              await getBitgetDemoCurrentPositions(),
              current
            ) ?? null,
            placeReplacementProtection: async () => placeBitgetDemoProtectionOrder({
              paperOrderId: `${current.id}:breakeven-protection`,
              symbol: current.symbol as BitgetSupportedSymbol,
              posSide: current.direction === "SHORT" ? "short" : "long",
              stopLoss: current.entryPrice ?? position.avgPrice,
              takeProfit: current.target2 ?? position.markPrice,
            }),
            persistProtection: async (confirmed) => {
              current = await updateDecision(current.id, {
                status: "PARTIAL",
                tp1Done: true,
                protectionOrderId: confirmed.orderId,
                rejectionCode: "",
                rejectionReason: "达到第一目标，减仓已确认，剩余仓位已有交易所侧保护。",
              });
            },
            emergencyCloseRemaining: async (remaining) => {
              await placeBitgetDemoMarketOrder({
                paperOrderId: `${current.id}:tp1-protection-failure-close`,
                symbol: current.symbol as BitgetSupportedSymbol,
                quantity: remaining.total,
                side: orderSide(current.direction, true),
                reduceOnly: true,
              });
            },
            persistEmergencyClose: async () => {
              current = await updateDecision(current.id, {
                status: "CLOSING",
                tp1Done: true,
                rejectionCode: "TP1_PROTECTION_EMERGENCY_CLOSE",
                rejectionReason: "第一目标减仓后无法确认任何交易所保护；已按权威剩余仓位提交幂等紧急平仓。",
              });
            },
          });
          if (transition.state === "RECOVERY_UNCONFIRMED") {
            throw new Error(transition.error);
          }
          orderSuccess += 1;
        } else {
          await updateDecision(current.id, {
            tp1Done: true,
            rejectionReason: "仓位小于可安全拆分数量，保留全仓由止损和第二目标管理。",
          });
        }
      } catch (error) {
        orderErrors += 1;
        await updateDecision(current.id, {
          rejectionCode: "TP1_MANAGE_FAILED",
          rejectionReason: error instanceof Error ? error.message : "第一目标减仓失败",
        });
      }
    }
  }
  return { managed: decisions.length, orderAttempts, orderSuccess, orderErrors, activeLedger };
}

function unifiedHorizonForStrategy(strategyType: ThreeHorizonStrategyType): "SHORT" | "MEDIUM" | "LONG" {
  if (strategyType === "INTRADAY") return "SHORT";
  if (strategyType === "SWING") return "MEDIUM";
  return "LONG";
}

async function activeDecisionCountForStrategy(strategyType: ThreeHorizonStrategyType): Promise<number> {
  if (!prisma) return 0;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
    `SELECT COUNT(*) AS count
     FROM trade_three_horizon_decisions
     WHERE strategy_type=$1
       AND status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING')`,
    strategyType,
  );
  return Number(rows[0]?.count ?? 0);
}

async function calculatePositionSize(input: {
  profile: ThreeHorizonStrategyProfile;
  evaluation: EvaluationResult;
  equityUsdt: number;
  symbol: BitgetSupportedSymbol;
  riskScale?: number;
  riskPctOverride?: number;
}): Promise<{ quantity: number; riskAmountUsdt: number; riskPct: number }> {
  if (!input.evaluation.entryPrice || !input.evaluation.stopLoss) {
    throw new Error("缺少入场价或止损价");
  }
  const stopDistance = Math.abs(input.evaluation.entryPrice - input.evaluation.stopLoss);
  if (stopDistance <= 0) throw new Error("止损距离无效");
  const requestedRiskPct = input.riskPctOverride ?? input.profile.riskPerTradePct * clamp(input.riskScale ?? 1, 0.1, 1);
  const riskAmount = input.equityUsdt * requestedRiskPct / 100;
  const riskQuantity = riskAmount / stopDistance;
  const environment = getBitgetDemoEnvironment();
  const maxNotional = environment.mode === "LIVE_EXPERIMENT"
    ? Math.min(input.equityUsdt * 0.3, environment.liveMaxPositionNotionalUsdt)
    : input.equityUsdt * MAX_POSITION_NOTIONAL_PCT / 100;
  const cappedQuantity = Math.min(riskQuantity, maxNotional / input.evaluation.entryPrice);
  const contract = await getContractConfig(input.symbol);
  const minNotionalQuantity = contract.minOrderAmount > 0
    ? contract.minOrderAmount / input.evaluation.entryPrice
    : 0;
  const minimumExchangeQuantity = Math.max(contract.minTradeNum, minNotionalQuantity);
  const minimumNormalized = minimumExchangeQuantity > 0
    ? Number(normalizeOrderSizeUp(minimumExchangeQuantity, contract))
    : 0;
  const quantityBeforeFloor = Math.max(cappedQuantity, minimumNormalized);
  const normalized = Number(normalizeOrderSize(quantityBeforeFloor, contract));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("交易所规格归一化后下单数量无效");
  }
  if (contract.minOrderAmount > 0 && normalized * input.evaluation.entryPrice + 1e-9 < contract.minOrderAmount) {
    throw new Error(`${input.symbol}最小订单金额要求${contract.minOrderAmount} USDT，当前风险预算不足以形成合规订单`);
  }
  const actualRisk = normalized * stopDistance;
  const actualRiskPct = actualRisk / input.equityUsdt * 100;
  if (actualRiskPct > requestedRiskPct * 1.05) {
    throw new Error(`最小下单量会使实际风险${round(actualRiskPct, 3)}%超过预算${round(requestedRiskPct, 3)}%`);
  }
  return {
    quantity: normalized,
    riskAmountUsdt: round(actualRisk, 4),
    riskPct: round(actualRiskPct, 4),
  };
}

function evaluationRiskBudgetPct(
  profile: ThreeHorizonStrategyProfile,
  evaluation: EvaluationResult
): number {
  return round(profile.riskPerTradePct * clamp(evaluation.riskScale ?? 1, 0.1, 1), 4);
}

async function executeReadyDecision(input: {
  decision: ThreeHorizonStrategyDecision;
  profile: ThreeHorizonStrategyProfile;
  evaluation: EvaluationResult;
  risk: ThreeHorizonRiskSnapshot;
  positions: BitgetDemoPosition[];
  protections: BitgetDemoStrategyOrder[];
  now: Date;
  reservedSymbols: ReadonlySet<string>;
  reservedRiskPct: number;
  exposureAction: Exclude<NewExposureAction, "SCALE_IN" | "RISK_REDUCTION">;
  forecastPlan: PredictionStrategyPlan | null | undefined;
  authorityReadsOk: boolean;
  ledgerConsistent: boolean;
}): Promise<{
  decision: ThreeHorizonStrategyDecision;
  attempted: boolean;
  success: boolean;
  error: boolean;
  riskReservedPct: number;
}> {
  if (input.profile.mode === "SHADOW") {
    return {
      decision: await updateDecision(input.decision.id, {
        status: "SHADOW_READY",
        rejectionCode: "",
        rejectionReason: "影子模式已记录本来会提交的订单，但没有向Bitget发送。",
      }),
      attempted: false,
      success: false,
      error: false,
      riskReservedPct: 0,
    };
  }
  const marketSessionGate = evaluateMarketSessionExposureSafety({
    symbol: input.decision.symbol,
    action: input.exposureAction,
    nowMs: input.now.getTime(),
  });
  if (!marketSessionGate.allowed) {
    return {
      decision: await updateDecision(input.decision.id, {
        status: "BLOCKED",
        rejectionCode: marketSessionGate.rejectionCode ?? "MARKET_SESSION_CLOSED",
        rejectionReason: marketSessionGate.reason,
      }),
      attempted: false,
      success: false,
      error: false,
      riskReservedPct: 0,
    };
  }
  const newExposureGate = evaluateNewExposureSafety({
    action: input.exposureAction,
    direction: input.decision.direction,
    authorityReadsOk: input.authorityReadsOk,
    ledgerConsistent: input.ledgerConsistent,
    timing: weeklyTimingForNewExposure({
      direction: input.decision.direction,
      plan: input.forecastPlan,
      now: input.now,
    }),
  });
  if (!newExposureGate.allowed) {
    return {
      decision: await updateDecision(input.decision.id, {
        status: "BLOCKED",
        rejectionCode: newExposureGate.rejectionCode ?? "RECONCILIATION_REQUIRED",
        rejectionReason: newExposureGate.reason,
      }),
      attempted: false,
      success: false,
      error: false,
      riskReservedPct: 0,
    };
  }
  const environment = getBitgetDemoEnvironment();
  let authoritativeDailyCount = 0;
  let authoritativeCadenceCount = 0;
  try {
    [authoritativeDailyCount, authoritativeCadenceCount] = await Promise.all([
      executedOrderCountToday(input.now, environment.mode === "LIVE_EXPERIMENT" ? "LIVE" : "DEMO"),
      cadenceTradeCount(input.profile, input.now),
    ]);
  } catch (error) {
    return {
      decision: await updateDecision(input.decision.id, {
        status: "BLOCKED",
        rejectionCode: "TRADE_CADENCE_READ_FAILED",
        rejectionReason: `无法确认当日与${cadenceLabel(input.profile.strategyType)}成交数量，按安全原则禁止新开仓：${error instanceof Error ? error.message : "未知错误"}`,
      }),
      attempted: false,
      success: false,
      error: false,
      riskReservedPct: 0,
    };
  }
  const globalDailyCap = environment.mode === "LIVE_EXPERIMENT"
    ? environment.liveMaxTradesPerDay
    : DEMO_GLOBAL_TRADE_CAP;
  if (authoritativeDailyCount >= globalDailyCap || authoritativeCadenceCount >= input.profile.maxTradesPerDay) {
    const globalCapReached = authoritativeDailyCount >= globalDailyCap;
    return {
      decision: await updateDecision(input.decision.id, {
        status: "BLOCKED",
        rejectionCode: globalCapReached ? "GLOBAL_DAILY_TRADE_CAP" : "HORIZON_PERIOD_TRADE_CAP",
        rejectionReason: globalCapReached
          ? `今日已记录${authoritativeDailyCount}笔订单，达到全局${globalDailyCap}笔硬上限；所有新开仓入口（含首笔闭环验收）均已关闭。`
          : `${input.profile.label}${cadenceLabel(input.profile.strategyType)}已记录${authoritativeCadenceCount}笔订单，达到${input.profile.maxTradesPerDay}笔周期硬上限。`,
      }),
      attempted: false,
      success: false,
      error: false,
      riskReservedPct: 0,
    };
  }
  const unifiedHorizon = unifiedHorizonForStrategy(input.profile.strategyType);
  const unifiedSetting = environment.mode === "LIVE_EXPERIMENT"
    ? await getUnifiedLiveSetting("official", unifiedHorizon)
    : null;
  const activeHorizonPositions = environment.mode === "LIVE_EXPERIMENT"
    ? await activeDecisionCountForStrategy(input.profile.strategyType)
    : 0;
  const legacyHorizonToggle = process.env.BITGET_DEMO_THREE_HORIZON_EXECUTION_ALLOWED?.toLowerCase();
  const horizonExecutionAllowed = environment.mode === "LIVE_EXPERIMENT"
    ? environment.executionAllowed && LIVE_ACTIVE_EXECUTION_ENABLED
    : environment.executionAllowed && DEMO_ACTIVE_EXECUTION_ENABLED && legacyHorizonToggle !== "false";
  const mirror = await getBitgetMirrorSettings();
  // V7.7: Phase-4 reliability state was built as a UTA_V3_DEMO-only gate
  // (its schema even hard-locks real_trading_locked=TRUE). It must not veto a
  // LIVE_EXPERIMENT order that already passed the native live environment and
  // portfolio-risk gates below. Demo keeps the original Phase-4 watchdog gate.
  const reliabilityGate = environment.mode === "LIVE_EXPERIMENT"
    ? {
        allowed: true,
        mode: "RUNNING" as const,
        code: "LIVE_NATIVE_RISK_GATE",
        reason: "LIVE使用原生实盘权限、账户、组合风险和交易所保护闸门。",
      }
    : await getTradingReliabilityOpeningGate();
  const plannedRiskPct = evaluationRiskBudgetPct(input.profile, input.evaluation);
  let blockReason = "";
  let blockCode = "";
  if (!reliabilityGate.allowed) {
    blockCode = reliabilityGate.code;
    blockReason = reliabilityGate.reason;
  } else if (environment.mode === "LIVE_EXPERIMENT" && !unifiedSetting) {
    blockCode = "UNIFIED_HORIZON_SETTING_MISSING";
    blockReason = `${unifiedHorizon}实盘周期设置不可用，禁止新开仓。`;
  } else if (environment.mode === "LIVE_EXPERIMENT" && unifiedSetting && !unifiedSetting.enabled) {
    blockCode = "UNIFIED_HORIZON_DISABLED";
    blockReason = `${unifiedHorizon}周期已在会员实盘设置中关闭。`;
  } else if (environment.mode === "LIVE_EXPERIMENT" && unifiedSetting && activeHorizonPositions >= unifiedSetting.maxOpenPositions) {
    blockCode = "UNIFIED_HORIZON_POSITION_CAP";
    blockReason = `${unifiedHorizon}已有${activeHorizonPositions}笔活动仓位，达到该周期${unifiedSetting.maxOpenPositions}笔上限。`;
  } else if (environment.mode === "LIVE_EXPERIMENT" && unifiedSetting && input.risk.dailyLossPct >= unifiedSetting.dailyLossPercent) {
    blockCode = "UNIFIED_DAILY_LOSS_LIMIT";
    blockReason = `当日亏损${round(input.risk.dailyLossPct, 3)}%已达到${unifiedSetting.dailyLossPercent}%周期上限。`;
  } else if (environment.mode === "LIVE_EXPERIMENT" && unifiedSetting && input.risk.weeklyLossPct >= unifiedSetting.weeklyLossPercent) {
    blockCode = "UNIFIED_WEEKLY_LOSS_LIMIT";
    blockReason = `本周亏损${round(input.risk.weeklyLossPct, 3)}%已达到${unifiedSetting.weeklyLossPercent}%周期上限。`;
  } else if (environment.mode === "LIVE_EXPERIMENT" && input.profile.mode !== "LIVE") {
    blockCode = "LIVE_PROFILE_REQUIRED";
    blockReason = "实盘实验只允许LIVE模式策略提交订单。";
  } else if (environment.mode === "DEMO" && input.profile.mode !== "DEMO") {
    blockCode = "DEMO_PROFILE_REQUIRED";
    blockReason = "Demo环境只允许DEMO模式策略提交订单。";
  } else if (!horizonExecutionAllowed) {
    blockCode = "THREE_HORIZON_EXECUTION_OFF";
    blockReason = environment.mode === "LIVE_EXPERIMENT"
      ? "实盘三周期执行未获授权。"
      : "Demo主动执行被关闭：请确认BITGET_DEMO_EXECUTION_ALLOWED=true，且MOOX_DEMO_ACTIVE_EXECUTION_V64和旧兼容开关没有被显式设为false。";
  } else if (!environment.executionAllowed) {
    blockCode = "EXECUTION_OFF";
    blockReason = environment.mode === "LIVE_EXPERIMENT" ? "Bitget实盘实验执行尚未开启。" : "Bitget Demo执行尚未开启。";
  } else if (environment.mode === "DEMO" && mirror.enabled) {
    blockCode = "LEGACY_MIRROR_ACTIVE";
    blockReason = "旧版Bitget镜像仍开启；为避免两套机器人争抢同一仓位，三周期下单已拦截。";
  } else if (input.risk.blocked) {
    blockCode = "RISK_LIMIT";
    blockReason = input.risk.blockReason;
  } else if (
    input.risk.openRiskPct + input.reservedRiskPct + plannedRiskPct >
    input.risk.openRiskLimitPct + 1e-9
  ) {
    blockCode = "PROJECTED_OPEN_RISK_LIMIT";
    blockReason = `本单计入后，开放风险将达到${round(input.risk.openRiskPct + input.reservedRiskPct + plannedRiskPct, 3)}%，超过${input.risk.openRiskLimitPct}%上限。`;
  } else if (
    ["BTCUSDT", "ETHUSDT", "HYPEUSDT"].includes(input.decision.symbol) &&
    input.risk.cryptoGroupRiskPct + input.reservedRiskPct + plannedRiskPct >
    input.risk.cryptoGroupRiskLimitPct + 1e-9
  ) {
    blockCode = "PROJECTED_CRYPTO_GROUP_LIMIT";
    blockReason = `本单计入后，加密货币风险组将达到${round(input.risk.cryptoGroupRiskPct + input.reservedRiskPct + plannedRiskPct, 3)}%，超过${input.risk.cryptoGroupRiskLimitPct}%上限。`;
  } else if (input.reservedSymbols.has(input.decision.symbol)) {
    blockCode = "SYMBOL_RESERVED_THIS_RUN";
    blockReason = `${input.decision.symbol}已在本次服务器扫描中提交过订单，禁止并发重复开仓。`;
  } else if (input.positions.some((row) => row.symbol === input.decision.symbol && row.total > 0)) {
    blockCode = "SYMBOL_POSITION_EXISTS";
    blockReason = `${input.decision.symbol}已有Bitget持仓，同一标的不重复开仓。`;
  } else if (input.protections.some((row) => row.symbol === input.decision.symbol)) {
    blockCode = "SYMBOL_PROTECTION_EXISTS";
    blockReason = `${input.decision.symbol}仍有交易所策略单，需先完成对账。`;
  } else if (!input.risk.equityUsdt || input.risk.equityUsdt <= 0) {
    blockCode = "NO_EQUITY";
    blockReason = environment.mode === "LIVE_EXPERIMENT" ? "未检测到实盘实验资金。" : "未检测到可用模拟资金。";
  }
  if (blockReason) {
    return {
      decision: await updateDecision(input.decision.id, {
        status: "BLOCKED",
        rejectionCode: blockCode,
        rejectionReason: blockReason,
      }),
      attempted: false,
      success: false,
      error: false,
      riskReservedPct: 0,
    };
  }
  let sizing: {
    quantity: number;
    riskAmountUsdt: number;
    riskPct: number;
    leverage: number;
    marginAmount: number;
    notionalAmount: number;
  };
  try {
    const equityUsdt = input.risk.equityUsdt;
    if (equityUsdt == null || equityUsdt <= 0) {
      throw new Error(environment.mode === "LIVE_EXPERIMENT" ? "未检测到实盘实验资金" : "未检测到可用模拟资金");
    }
    if (environment.mode === "LIVE_EXPERIMENT") {
      if (!unifiedSetting) throw new Error(`${unifiedHorizon}实盘周期设置不可用`);
      const availableMargin = Math.min(input.risk.availableUsdt ?? equityUsdt, equityUsdt);
      const calculated = calculateUnifiedLivePositionSize({
        equity: equityUsdt,
        availableMargin,
        entryPrice: input.evaluation.entryPrice ?? 0,
        stopPrice: input.evaluation.stopLoss ?? 0,
        sizingMode: unifiedSetting.sizingMode,
        sizingValue: unifiedSetting.sizingValue,
        leverage: Math.min(unifiedSetting.leverage, environment.leverage),
        maxMarginUsePercent: unifiedSetting.maxMarginUsePercent,
        maxLossPercent: unifiedSetting.maxLossPercent,
      });
      if (!calculated.accepted) throw new Error(`Unified Live仓位计算拒绝：${calculated.reason ?? "UNKNOWN"}`);
      const entryPrice = input.evaluation.entryPrice ?? 0;
      const stopPrice = input.evaluation.stopLoss ?? 0;
      const contract = await getContractConfig(input.decision.symbol as BitgetSupportedSymbol);
      if (!(entryPrice > 0) || !(stopPrice > 0)) throw new Error("Unified Live入场价或止损价无效");
      // V7.20.10.2: LIVE must honor the same bounded riskScale used by Bazi,
      // BTC/ETH divergence and the October flash-crash risk prior. Earlier LIVE sizing
      // could ignore those overlays because Unified Live sizing used only the saved setting.
      const liveRiskScale = clamp(input.evaluation.riskScale ?? 1, 0.1, 1);
      const maxNotional = Math.min(calculated.notionalAmount * liveRiskScale, environment.liveMaxPositionNotionalUsdt, 400);
      const normalizedQuantity = Number(normalizeOrderSize(maxNotional / entryPrice, contract));
      if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) throw new Error("Unified Live归一化下单数量无效");
      const notionalAmount = normalizedQuantity * entryPrice;
      const marginAmount = notionalAmount / calculated.leverage;
      const stopDistancePercent = Math.abs(entryPrice - stopPrice) / entryPrice * 100;
      const projectedLoss = notionalAmount * ((stopDistancePercent + 0.16) / 100);
      const riskPct = projectedLoss / equityUsdt * 100;
      if (riskPct > unifiedSetting.maxLossPercent + 1e-9) {
        throw new Error(`归一化后风险${round(riskPct, 4)}%超过${unifiedSetting.maxLossPercent}%上限`);
      }
      sizing = {
        quantity: normalizedQuantity,
        riskAmountUsdt: round(projectedLoss, 4),
        riskPct: round(riskPct, 4),
        leverage: calculated.leverage,
        marginAmount: round(marginAmount, 4),
        notionalAmount: round(notionalAmount, 4),
      };
    } else {
      const calculated = await calculatePositionSize({
        profile: input.profile,
        evaluation: input.evaluation,
        equityUsdt,
        symbol: input.decision.symbol as BitgetSupportedSymbol,
        riskScale: input.evaluation.riskScale,
      });
      sizing = {
        ...calculated,
        leverage: environment.leverage,
        marginAmount: round(calculated.quantity * (input.evaluation.entryPrice ?? 0) / environment.leverage, 4),
        notionalAmount: round(calculated.quantity * (input.evaluation.entryPrice ?? 0), 4),
      };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "下单前规格/风险检查失败";
    const disposition = classifyLiveOrderFailure("LOCAL_PREFLIGHT");
    return {
      decision: await updateDecision(input.decision.id, {
        status: disposition.status,
        rejectionCode: disposition.rejectionCode,
        rejectionReason: reason,
      }),
      attempted: disposition.attempted,
      success: false,
      error: disposition.error,
      riskReservedPct: 0,
    };
  }

  let current = await updateDecision(input.decision.id, {
    status: "READY",
    quantity: sizing.quantity,
    riskAmountUsdt: sizing.riskAmountUsdt,
    riskPct: sizing.riskPct,
    rejectionCode: input.evaluation.executionTier === "PROBE" ? "PROBE_ENTRY" : "",
    rejectionReason: `${input.evaluation.executionTier === "PROBE" ? "第一批探路仓" : "完整确认仓"}通过组合风控与交易所规格预检，准备提交${environment.mode === "LIVE_EXPERIMENT" ? "Bitget实盘" : "Bitget Demo"}订单。`,
    entryStage: 0,
    maxEntryStages: input.evaluation.executionTier === "PROBE" ? 2 : 1,
  });

  try {
    const order = await placeBitgetDemoMarketOrder({
      paperOrderId: current.id,
      symbol: current.symbol as BitgetSupportedSymbol,
      quantity: sizing.quantity,
      side: orderSide(current.direction),
      reduceOnly: false,
      leverage: sizing.leverage,
      stopLoss: current.stopLoss ?? undefined,
      takeProfit: current.target2 ?? undefined,
    });
    current = await updateDecision(current.id, {
      status: "ORDER_SUBMITTED",
      clientOid: order.clientOid,
      bitgetOrderId: order.orderId,
      quantity: Number(order.size),
      riskAmountUsdt: sizing.riskAmountUsdt,
      riskPct: sizing.riskPct,
      entryStage: 1,
      rejectionReason: `${input.evaluation.executionTier === "PROBE" ? "第一批探路仓" : "确认仓"}已提交${environment.mode === "LIVE_EXPERIMENT" ? "Bitget实盘" : "Bitget Demo"}，风险${round(sizing.riskPct, 3)}%，使用逐仓${sizing.leverage}倍并预设第二目标。${order.warnings.join("；")}`,
    });
    let custodyRegistrationFailed = false;
    if (environment.mode === "LIVE_EXPERIMENT") {
      try {
        await registerUnifiedLiveStrategySlice({
          ownerKey: "official",
          strategyDecisionId: current.id,
          symbol: current.symbol,
          horizon: unifiedHorizon,
          side: current.direction === "SHORT" ? "SHORT" : "LONG",
          marginAmount: sizing.marginAmount,
          notionalAmount: sizing.notionalAmount,
          quantity: Number(order.size),
          leverage: sizing.leverage,
          entryPrice: current.entryPrice ?? input.evaluation.entryPrice ?? 0,
          stopPrice: current.stopLoss,
          target1: current.target1,
          target2: current.target2,
          maxHoldMinutes: input.profile.maxHoldingMinutes,
          sourceKind: `THREE_HORIZON_${input.profile.strategyType}`,
          technicalEntry: input.evaluation.conditions.find((condition) => condition.key === "entry")?.value ?? null,
          liuyaoDirection: lockedLiuyaoDirection(input.forecastPlan, input.profile.strategyType),
        });
      } catch (registryError) {
        custodyRegistrationFailed = true;
        current = await updateDecision(current.id, {
          rejectionCode: "UNIFIED_CUSTODY_REGISTRATION_PENDING",
          rejectionReason: `${current.rejectionReason}；订单已成功发送，但Unified Live托管登记失败：${registryError instanceof Error ? registryError.message : "未知错误"}。本轮立即停止继续新开仓，后续托管将冻结新开仓直到对账修复。`,
        });
      }
    }
    return {
      decision: current,
      attempted: true,
      success: true,
      error: custodyRegistrationFailed,
      riskReservedPct: sizing.riskPct,
    };
  } catch (error) {
    const typed = error instanceof LiveTradeExecutionError ? error : new LiveTradeExecutionError({
      message: error instanceof Error ? error.message : `${environment.mode === "LIVE_EXPERIMENT" ? "Bitget实盘" : "Bitget Demo"}下单失败`,
      stage: "LOCAL_PREFLIGHT",
      remoteSubmissionAttempted: false,
      symbol: input.decision.symbol,
      action: "OPEN_MARKET",
    });
    const disposition = classifyLiveOrderFailure(typed.stage, typed.remoteSubmissionAttempted);
    const meta = [
      `stage=${typed.stage}`,
      typed.bitgetCode ? `code=${typed.bitgetCode}` : "",
      typed.httpStatus != null ? `http=${typed.httpStatus}` : "",
      typed.clientOid ? `clientOid=${typed.clientOid}` : "",
    ].filter(Boolean).join(" · ");
    return {
      decision: await updateDecision(input.decision.id, {
        status: disposition.status,
        rejectionCode: disposition.rejectionCode,
        rejectionReason: `${typed.message}${meta ? ` [${meta}]` : ""}`,
        clientOid: typed.clientOid ?? undefined,
      }),
      attempted: disposition.attempted,
      success: false,
      error: disposition.error,
      riskReservedPct: 0,
    };
  }
}

async function buildStrategyStats(
  profiles: ThreeHorizonStrategyProfile[],
  now: Date
): Promise<ThreeHorizonStrategyStats[]> {
  if (!prisma) return [];
  const start = beijingStartOfDay(now);
  const allRows = await prisma.$queryRawUnsafe<DecisionRow[]>(`
    SELECT * FROM trade_three_horizon_decisions
    ORDER BY created_at DESC
    LIMIT 2000
  `);
  return profiles.map((profile) => {
    const rows = allRows.filter((row) => row.strategy_type === profile.strategyType);
    const today = rows.filter((row) => new Date(row.created_at).getTime() >= start.getTime());
    const closed = rows.filter((row) => row.status === "CLOSED" && row.realized_pnl_usdt != null);
    const wins = closed.filter((row) => Number(row.realized_pnl_usdt) > 0).length;
    const losses = closed.filter((row) => Number(row.realized_pnl_usdt) < 0).length;
    const rValues = closed
      .map((row) => {
        const risk = Number(row.risk_amount_usdt ?? 0);
        return risk > 0 ? Number(row.realized_pnl_usdt ?? 0) / risk : null;
      })
      .filter((value): value is number => value != null && Number.isFinite(value));
    return {
      strategyType: profile.strategyType,
      scansToday: new Set(today.map((row) => row.run_id)).size,
      symbolsEvaluatedToday: today.length,
      readyToday: today.filter((row) => ["READY", "ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING", "CLOSED"].includes(row.status)).length,
      shadowReadyToday: today.filter((row) => row.status === "SHADOW_READY").length,
      blockedToday: today.filter((row) => row.status === "BLOCKED" || row.status === "ERROR").length,
      orderAttemptsToday: today.filter((row) => Boolean(row.bitget_order_id) || row.status === "ERROR" && row.rejection_code === "ORDER_ERROR").length,
      openedToday: today.filter((row) => ["OPEN", "PARTIAL", "CLOSING", "CLOSED"].includes(row.status)).length,
      closedTrades: closed.length,
      wins,
      losses,
      winRatePct: closed.length ? round(wins / closed.length * 100, 1) : null,
      netPnlUsdt: round(closed.reduce((sum, row) => sum + Number(row.realized_pnl_usdt ?? 0), 0), 2),
      averageR: rValues.length ? round(average(rValues), 2) : null,
    };
  });
}

export async function runThreeHorizonStrategyEngine(
  now = new Date(),
  source: "CRON" | "ADMIN" | "SYSTEM" = "CRON",
  options: {
    manageOnly?: boolean;
    eligibleSymbols?: BitgetSupportedSymbol[];
    quotes?: BitgetDemoMarketQuote[];
    maxNewSymbols?: number;
    deadlineAt?: Date;
    newEntryCutoffAt?: Date;
    progressStartedAtMs?: number;
    progressElapsedMs?: () => number;
    onProgress?: (progress: ThreeHorizonProgress) => Promise<void> | void;
  } = {}
): Promise<ThreeHorizonRunReport> {
  const reportProgress = createStrategyProgressReporter({
    startedAtMs: options.progressStartedAtMs ?? Date.now(),
    elapsedMs: options.progressElapsedMs,
    publish: options.onProgress,
  });
  await reportProgress("ENGINE_START");
  if (!(await ensureThreeHorizonStrategyTables()) || !prisma) {
    throw new Error("三周期策略数据库未连接");
  }
  await reportProgress("SCHEMA_COMPLETE");
  const environment = getBitgetDemoEnvironment();
  const liveExperimentMode = environment.mode === "LIVE_EXPERIMENT";
  const eligibleSymbols = options.eligibleSymbols ? new Set(options.eligibleSymbols) : null;
  const eligibleLiveSymbols = environment.liveAllowedSymbols
    .filter((symbol) => !eligibleSymbols || eligibleSymbols.has(symbol));
  const maxNewSymbols = options.maxNewSymbols != null && Number.isFinite(options.maxNewSymbols)
    ? Math.max(1, Math.floor(options.maxNewSymbols))
    : Number.POSITIVE_INFINITY;
  const runId = `thr_${randomUUID()}`;
  const startedAt = now.toISOString();
  const deadlineMs = options.deadlineAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const newEntryCutoffMs = options.newEntryCutoffAt?.getTime() ?? Number.POSITIVE_INFINITY;
  let managementReadError = "";
  const liveScanRound = await beginLiveScanRound({
    symbols: eligibleLiveSymbols,
    maxItems: liveExperimentMode && Number.isFinite(maxNewSymbols)
      ? maxNewSymbols
      : Math.max(1, eligibleLiveSymbols.length),
    nowMs: now.getTime(),
  }, {
    manage: () => manageActiveDecisions(now).catch((error) => {
    managementReadError = error instanceof Error ? error.message : "持仓管理读取失败";
    return {
      managed: 0,
      orderAttempts: 0,
      orderSuccess: 0,
      orderErrors: 0,
      activeLedger: [],
    };
    }),
    canSelect: () => !managementReadError,
    select: async (fallback) => {
      if (!liveExperimentMode || fallback.length !== 1) return fallback;
      return selectOpportunityBatchWithinDeadline({
        symbols: eligibleLiveSymbols,
        maxItems: maxNewSymbols,
        nowMs: now.getTime(),
        quotes: options.quotes ?? [],
        deadlineMs: Math.min(deadlineMs, Date.now() + 2_000),
        loadHints: () => getLiveScanOpportunityHints(),
      });
    },
  });
  const management = liveScanRound.management;
  const liveSymbolsForThisRun = liveScanRound.selected;
  await reportProgress("MANAGEMENT_COMPLETE", {
    managed: management.managed,
    selectedSymbols: liveSymbolsForThisRun,
    authorityReadsOk: !managementReadError,
    rejectionCode: managementReadError ? "RECONCILIATION_REQUIRED" : null,
  });
  if (managementReadError) {
    return {
      ok: false,
      runId,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      scannedStrategies: [],
      decisions: [],
      managedOpenDecisions: 0,
      orderAttempts: 0,
      orderSuccess: 0,
      orderErrors: 0,
      message: `持仓管理关键读取失败，本轮禁止扫描和开新仓：${managementReadError}`,
    };
  }
  if (options.manageOnly || Date.now() >= newEntryCutoffMs) {
    return {
      ok: management.orderErrors === 0,
      runId,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      scannedStrategies: [],
      decisions: [],
      managedOpenDecisions: management.managed,
      orderAttempts: management.orderAttempts,
      orderSuccess: management.orderSuccess,
      orderErrors: management.orderErrors,
      message: options.manageOnly
        ? `服务器处于暂停状态，仅管理${management.managed}笔已有三周期仓位，不扫描新入场。`
        : `持仓管理已完成；请求已进入收尾保留时间，不启动计划维护、新标的扫描或新订单。`,
    };
  }
  const planMaintenance = await syncAiTradePlansFromRecentDecisions(
    now,
    liveExperimentMode ? { symbols: liveSymbolsForThisRun, limit: 3 } : {}
  );
  await reportProgress("PLAN_MAINTENANCE_COMPLETE", {
    maintainedPlans: planMaintenance.selected,
    selected: planMaintenance.selected,
    none: planMaintenance.none,
    material: planMaintenance.material,
    duplicateFresh: planMaintenance.duplicateFresh,
    checkpointRows: planMaintenance.checkpointRows,
    checkpointBatchCalls: planMaintenance.checkpointBatchCalls,
    queryMs: planMaintenance.queryMs,
    materialMs: planMaintenance.materialMs,
    duplicateFreshMs: planMaintenance.duplicateFreshMs,
    checkpointBatchMs: planMaintenance.checkpointBatchMs,
  });
  if (Date.now() >= newEntryCutoffMs) {
    return {
      ok: management.orderErrors === 0,
      runId,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      scannedStrategies: [],
      decisions: [],
      managedOpenDecisions: management.managed,
      orderAttempts: management.orderAttempts,
      orderSuccess: management.orderSuccess,
      orderErrors: management.orderErrors,
      message: `持仓管理和本轮计划维护已完成；请求已进入收尾保留时间，不启动新标的扫描或新订单。`,
    };
  }
  // Apply the rotating bound before any live contract/candle discovery. Previously
  // the final loop selected one symbol only after commissioning had read every
  // allowed symbol, so sequential read timeouts could consume the 300-second route.
  // Live mode evaluates all three horizons on every server pass. The runtime supplies a
  // small rotating symbol batch so each pass stays bounded while candle data is still
  // shared across profiles. Demo/shadow mode keeps the original cadence.
  const [profiles, settings] = await Promise.all([
    getThreeHorizonProfiles(),
    getPredictionAutoTraderSettings({ readOnly: liveExperimentMode }),
  ]);
  await reportProgress("SETTINGS_PROFILES_COMPLETE", { profiles: profiles.length });
  const dueProfiles = profiles.filter((profile) =>
    profile.enabled && (liveExperimentMode || profileDue(profile, now))
  );
  const forecastSymbols = liveExperimentMode
    ? liveSymbolsForThisRun.map((symbol) => symbol.replace(/USDT$/, ""))
    : undefined;
  let forecastAuthorityReadsOk = true;
  const forecastPlans = await resolvePredictionStrategyPlans(settings, now, forecastSymbols).catch(() => {
    forecastAuthorityReadsOk = false;
    return [];
  });
  await reportProgress("FORECAST_COMPLETE", { forecastPlans: forecastPlans.length });
  const canonicalForecastBySymbol = new Map<string, PredictionStrategyPlan>();
  for (const plan of forecastPlans) {
    const symbol = String(plan.symbol).toUpperCase();
    canonicalForecastBySymbol.set(symbol.endsWith("USDT") ? symbol : `${symbol}USDT`, plan);
  }
  // Evaluation may use curated focus playbooks, but real plan identity is always bound to
  // canonical locked forecast metadata from canonicalForecastBySymbol.
  const forecastBySymbol = new Map(canonicalForecastBySymbol);
  for (const symbol of liveSymbolsForThisRun) {
    const focusPlan = buildAiTradingFocusPredictionPlan(symbol, now);
    if (focusPlan) forecastBySymbol.set(symbol, focusPlan);
  }
  const quoteBySymbol = new Map((options.quotes ?? []).map((quote) => [quote.symbol, quote] as const));
  const risk = await buildRiskSnapshot(now);
  let positions: BitgetDemoPosition[];
  let protections: BitgetDemoStrategyOrder[];
  try {
    [positions, protections] = await Promise.all([
      getBitgetDemoCurrentPositions(),
      getBitgetDemoPendingStrategyOrders(),
    ]);
  } catch (error) {
    await reportProgress("RISK_ACCOUNT_COMPLETE", {
      positions: 0,
      protections: 0,
      authorityReadsOk: false,
      rejectionCode: "RECONCILIATION_REQUIRED",
    });
    return {
      ok: false,
      runId,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      scannedStrategies: [],
      decisions: [],
      managedOpenDecisions: management.managed,
      orderAttempts: management.orderAttempts,
      orderSuccess: management.orderSuccess,
      orderErrors: management.orderErrors,
      message: `Bitget持仓或保护单读取失败，为防止重复开仓，本轮禁止新入场：${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
  await reportProgress("RISK_ACCOUNT_COMPLETE", {
    positions: positions.length,
    protections: protections.length,
    riskBlocked: risk.blocked,
  });
  const newExposureLedgerConsistent = isExposureLedgerConsistent({
    positions: positions
      .filter((row) => row.total > 0)
      .map((row) => ({ symbol: row.symbol, side: row.posSide })),
    protections: protections.map((row) => ({ symbol: row.symbol, side: row.posSide })),
    activeDecisions: management.activeLedger,
  });
  const candleCache = new Map<string, CandleSet>();
  const reservedSymbols = new Set(
    positions.filter((row) => row.total > 0).map((row) => row.symbol)
  );
  let reservedRiskPct = 0;
  const decisions: ThreeHorizonStrategyDecision[] = [];
  let commissioningMessage = "";
  let commissioningAttempted = false;
  let commissioningSuccess = false;
  let commissioningError = false;
  if (liveExperimentMode && LIVE_COMMISSIONING_ENABLED && Date.now() < newEntryCutoffMs) {
    const commissioning = await runLiveCommissioning({
      runId,
      now,
      quotes: options.quotes ?? [],
      risk,
      positions,
      protections,
      reservedSymbols,
      forecastBySymbol: canonicalForecastBySymbol,
      eligibleSymbols: liveSymbolsForThisRun,
      readDeadlineMs: deadlineMs,
      newEntryCutoffMs,
      ledgerConsistent: newExposureLedgerConsistent,
      authorityReadsOk: forecastAuthorityReadsOk,
    });
    commissioningMessage = commissioning.message;
    commissioningAttempted = commissioning.attempted;
    commissioningSuccess = commissioning.success;
    commissioningError = commissioning.error;
    if (commissioning.decision) {
      decisions.push(commissioning.decision);
      // Commissioning and normal full-universe scans run in parallel, but the same symbol
      // cannot submit a second order during this server pass.
      if (commissioning.state !== "COMPLETE") reservedSymbols.add(commissioning.decision.symbol);
    }
  }
  await reportProgress("COMMISSIONING_COMPLETE", {
    attempted: commissioningAttempted,
    success: commissioningSuccess,
    error: commissioningError,
  });
  if (!dueProfiles.length) {
    return {
      ok: !commissioningError && management.orderErrors === 0,
      runId,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      scannedStrategies: commissioningMessage ? (["INTRADAY"] as ThreeHorizonStrategyType[]) : [],
      decisions,
      managedOpenDecisions: management.managed,
      orderAttempts: management.orderAttempts + (commissioningAttempted ? 1 : 0),
      orderSuccess: management.orderSuccess + (commissioningSuccess ? 1 : 0),
      orderErrors: management.orderErrors + (commissioningError ? 1 : 0),
      message: `${commissioningMessage ? `${commissioningMessage} ` : ""}三周期持仓管理已执行，本分钟没有到期的正常策略扫描。`,
    };
  }
  let orderAttempts = management.orderAttempts + (commissioningAttempted ? 1 : 0);
  let orderSuccess = management.orderSuccess + (commissioningSuccess ? 1 : 0);
  let orderErrors = management.orderErrors + (commissioningError ? 1 : 0);
  let executedToday = await executedOrderCountToday(now, liveExperimentMode ? "LIVE" : "DEMO");
  let scanErrors = 0;
  let directionalDecisions = 0;
  let entryTriggers = 0;
  let leadTimeBlocks = 0;
  let riskBlocks = 0;
  let timeBudgetReached = false;
  let entrySafetyStop = liveExperimentMode && commissioningError;
  let dynamicLiveSymbols: BitgetSupportedSymbol[] = [];
  if (liveExperimentMode) {
    try {
      dynamicLiveSymbols = await readWithinLiveScanDeadline(
        () => selectDynamicTradeUniverse(liveSymbolsForThisRun, forecastBySymbol, now),
        deadlineMs
      );
    } catch (error) {
      if (error instanceof LiveScanReadDeadlineError) {
        timeBudgetReached = true;
      } else {
        dynamicLiveSymbols = [];
      }
    }
  }
  await reportProgress("UNIVERSE_COMPLETE", {
    symbols: dynamicLiveSymbols,
    timeBudgetReached,
  });
  const eligibleUniverseSymbols = new Set<string>();
  for (const profile of dueProfiles) {
    if (timeBudgetReached || entrySafetyStop) break;
    const profileStartedAt = Date.now();
    let tradesToday = await todayTradeCount(profile, now);
    let tradesInCadence = await cadenceTradeCount(profile, now);
    const freshProfileSymbols = (liveExperimentMode ? dynamicLiveSymbols : profile.symbols)
      .map((value) => value as BitgetSupportedSymbol)
      .filter((symbol) => !eligibleSymbols || eligibleSymbols.has(symbol));
    for (const symbol of freshProfileSymbols) eligibleUniverseSymbols.add(symbol);
    const selectedSymbols = freshProfileSymbols;
    for (const symbol of selectedSymbols) {
      if (entrySafetyStop) break;
      if (Date.now() >= deadlineMs || Date.now() >= newEntryCutoffMs) {
        timeBudgetReached = true;
        break;
      }
      const scanStep = await runLiveScanSymbolStep(async () => {
        const dataStartedAt = Date.now();
        let candleSet = candleCache.get(symbol);
        const candleCacheHit = Boolean(candleSet);
        if (!candleSet) {
          candleSet = await readWithinLiveScanDeadline(() => loadCandleSet(symbol), deadlineMs);
          candleCache.set(symbol, candleSet);
        }
        const forecastPlan = forecastBySymbol.get(symbol);
        let evaluation = evaluate(profile, symbol, candleSet, forecastPlan, now, quoteBySymbol.get(symbol)?.price);
        // MOOX_EXTERNAL_ANALYST_OVERLAY_V1
        // Liuyao weekly/monthly direction remains primary. External analysts may only
        // refine technical levels when aligned; they cannot flip direction or create readiness.
        // This accessor may run ensureExternalAnalystTables DDL. It must remain
        // fully awaited under the owner lease and must never outlive a read race.
        const analystOverlay = await getExternalAnalystOverlay(symbol, profile.strategyType, now)
          .catch(() => null);
        await reportProgress("PROFILE_DATA_COMPLETE", {
          profile: profile.strategyType,
          symbol,
          dataDurationMs: Date.now() - dataStartedAt,
          candleCacheHit,
          analystOverlay: Boolean(analystOverlay),
        });
        evaluation = applyExternalAnalystOverlay({
          evaluation,
          overlay: analystOverlay,
          strategyType: profile.strategyType,
          primaryForecastDirection: formalForecastDirectionForExternalOverlay(forecastPlan, profile.strategyType, now.getTime()),
        });
        if (symbol === "BTCUSDT" || symbol === "ETHUSDT") {
          const peerSymbol: BitgetSupportedSymbol = symbol === "BTCUSDT" ? "ETHUSDT" : "BTCUSDT";
          const peerDirection = forecastDirectionForStrategy(forecastBySymbol.get(peerSymbol), profile.strategyType);
          const entryConfirmed = evaluation.conditions.some((condition) => condition.key === "entry" && condition.met);
          const crossAssetGuard = evaluateCryptoCrossAssetGuard({
            symbol,
            selfDirection: evaluation.direction,
            peerDirection,
            selfEntryConfirmed: entryConfirmed,
          });
          if (crossAssetGuard.divergent) {
            evaluation = {
              ...evaluation,
              riskScale: Math.min(evaluation.riskScale || 1, crossAssetGuard.riskScale),
              raw: { ...evaluation.raw, cryptoCrossAssetGuard: crossAssetGuard },
            };
          }
        }
        // MOOX_V720102_OCTOBER_FLASH_CRASH_GUARD
        // Locked medium-horizon Liu-Yao risk prior. It never flips direction or creates an entry;
        // it can only reduce NEW LONG exposure during the September/October risk window.
        const octoberFlashCrashRisk = getOctober2026AssetRisk(symbol, now);
        const currentOctoberRiskScale = evaluation.riskScale ?? 1;
        const octoberAdjustedRiskScale = applyOctober2026LongRiskScale(
          currentOctoberRiskScale,
          evaluation.direction,
          octoberFlashCrashRisk,
        );
        if (octoberAdjustedRiskScale < currentOctoberRiskScale) {
          evaluation = {
            ...evaluation,
            riskScale: octoberAdjustedRiskScale,
            raw: {
              ...evaluation.raw,
              october2026FlashCrashRisk: {
                state: octoberFlashCrashRisk.state,
                stateLabelZh: octoberFlashCrashRisk.stateLabelZh,
                sensitivity: octoberFlashCrashRisk.sensitivity,
                sensitivityLabelZh: octoberFlashCrashRisk.sensitivityLabelZh,
                longRiskScale: octoberFlashCrashRisk.longRiskScale,
                lockedAt: octoberFlashCrashRisk.lockedAt,
              },
            },
          };
        }
        let status: ThreeHorizonDecisionStatus = evaluation.ready ? "READY" : "OBSERVING";
        let rejectionCode = evaluation.rejectionCode;
        let rejectionReason = evaluation.rejectionReason;
        if (
          evaluation.ready &&
          profile.mode !== "SHADOW" &&
          tradesToday >= profile.maxTradesPerDay
        ) {
          status = "BLOCKED";
          rejectionCode = "DAILY_TRADE_LIMIT";
          rejectionReason = `${profile.label}今日已达到${profile.maxTradesPerDay}笔开仓上限。`;
        }
        if (evaluation.ready && profile.mode !== "SHADOW" && tradesInCadence >= 5) {
          status = "BLOCKED";
          rejectionCode = "HORIZON_PERIOD_TRADE_CAP";
          rejectionReason = `${profile.label}${cadenceLabel(profile.strategyType)}已达到5笔合格开仓硬上限；继续监控，但不为凑数量重复下单。`;
        }
        const globalTradeCap = environment.mode === "LIVE_EXPERIMENT"
          ? environment.liveMaxTradesPerDay
          : DEMO_GLOBAL_TRADE_CAP;
        const symbolTradeCap = environment.mode === "LIVE_EXPERIMENT"
          ? LIVE_SYMBOL_TRADE_CAP
          : DEMO_SYMBOL_TRADE_CAP;
        if (evaluation.ready && executedToday >= globalTradeCap) {
          status = "BLOCKED";
          rejectionCode = "GLOBAL_DAILY_TRADE_CAP";
          rejectionReason = `${environment.mode === "LIVE_EXPERIMENT" ? "实盘" : "Demo"}今日已达到${globalTradeCap}笔全局硬上限；活动目标不是无限交易。`;
        }
        if (evaluation.ready && status === "READY") {
          const symbolTradesToday = await symbolExecutedOrderCountToday(symbol, now, profile.mode === "LIVE" ? "LIVE" : "DEMO");
          if (symbolTradesToday >= symbolTradeCap) {
            status = "BLOCKED";
            rejectionCode = "SYMBOL_DAILY_TRADE_CAP";
            rejectionReason = `${symbol}今日已完成${symbolTradesToday}笔，达到单品种${symbolTradeCap}笔硬上限。`;
          }
        }
        const decisionStartedAt = Date.now();
        let decision = await insertDecision({
          runId,
          profile,
          symbol,
          status,
          evaluation,
          now,
          rejectionCode,
          rejectionReason,
        });
        const decisionDurationMs = Date.now() - decisionStartedAt;
        const planStartedAt = Date.now();
        const planGate = await prepareAiTradePlanBeforeExecution({
          decision,
          profile,
          now,
          forecastPlan: canonicalForecastBySymbol.get(symbol) ?? null,
        }).catch((error): Awaited<ReturnType<typeof prepareAiTradePlanBeforeExecution>> => ({
          plan: null,
          allowed: false,
          code: "PLAN_PUBLISH_ERROR",
          reason: error instanceof Error ? error.message : "AI事前计划发布失败",
        }));
        const planGateDurationMs = Date.now() - planStartedAt;
        if (decision.direction !== "NEUTRAL") directionalDecisions += 1;
        if (evaluation.conditions.some((condition) => condition.key === "entry" && condition.met)) entryTriggers += 1;
        if (planGate.code === "PLAN_LEAD_TIME") leadTimeBlocks += 1;
        if (planGate.code.includes("RISK") || decision.rejectionCode.includes("RISK")) riskBlocks += 1;
        const postGateStartedAt = Date.now();
        if (evaluation.ready && status === "READY") {
          if (!planGate.allowed) {
            decision = await updateDecision(decision.id, {
              status: "BLOCKED",
              rejectionCode: planGate.code,
              rejectionReason: planGate.reason,
            });
          } else {
            const lifecycle = await runNewEntryBeforeCutoff({
              cutoffMs: newEntryCutoffMs,
              now: Date.now,
              run: () => executeReadyDecision({
                decision, profile, evaluation, risk, positions, protections, now, reservedSymbols, reservedRiskPct,
                exposureAction: "NORMAL_PROFILE_ENTRY",
                forecastPlan: canonicalForecastBySymbol.get(symbol),
                authorityReadsOk: forecastAuthorityReadsOk,
                ledgerConsistent: newExposureLedgerConsistent,
              }),
            });
            if (!lifecycle.started) {
              decision = await updateDecision(decision.id, {
                status: "BLOCKED",
                rejectionCode: "TIME_BUDGET_REACHED",
                rejectionReason: "请求已进入收尾保留时间，本轮未启动新订单。",
              });
            } else {
            const executed = lifecycle.value;
            decision = executed.decision;
            if (executed.attempted) orderAttempts += 1;
            if (executed.success) {
              orderSuccess += 1;
              executedToday += 1;
              tradesToday += 1;
              tradesInCadence += 1;
              reservedSymbols.add(symbol);
              reservedRiskPct += executed.riskReservedPct;
            }
            if (executed.error) {
              orderErrors += 1;
              if (liveExperimentMode) entrySafetyStop = true;
            }
            }
          }
        }
        const postGateDurationMs = Date.now() - postGateStartedAt;
        const postGateSyncRequired = postPlanDecisionRequiresSync({
          evaluationReady: evaluation.ready,
          initialDecisionStatus: status,
        });
        const syncStartedAt = Date.now();
        if (postGateSyncRequired) {
          // A gate block or execution attempt changed lifecycle state after the
          // pre-published plan was refreshed; synchronize those changes now.
          await syncAiTradePlanFromDecision(decision, now, { force: true }).catch(() => undefined);
        }
        const postGateSyncDurationMs = Date.now() - syncStartedAt;
        await reportProgress("PROFILE_PLAN_COMPLETE", {
          profile: profile.strategyType,
          symbol,
          decisionDurationMs,
          planDurationMs: Date.now() - planStartedAt,
          planGateDurationMs,
          postGateDurationMs,
          postGateSyncDurationMs,
          planGateCode: planGate.code,
          postGateSyncRequired,
        });
        decisions.push(decision);
      }, async (error) => {
        const fallback: EvaluationResult = {
          direction: "NEUTRAL",
          confidence: 0,
          technicalScore: 0,
          forecastScore: 0,
          conditions: [],
          currentPrice: null,
          entryPrice: null,
          stopLoss: null,
          target1: null,
          target2: null,
          ready: false,
          rejectionCode: "MARKET_ERROR",
          rejectionReason: error instanceof Error ? error.message : "K线或策略计算失败",
          executionTier: "OBSERVE",
          riskScale: 0,
          directionStrength: 0,
          raw: {},
        };
        decisions.push(await insertDecision({
          runId,
          profile,
          symbol,
          status: "ERROR",
          evaluation: fallback,
          now,
        }));
        scanErrors += 1;
      });
      if (scanStep.timedOut) {
        timeBudgetReached = true;
        break;
      }
      if (entrySafetyStop) break;
    }
    if (timeBudgetReached || entrySafetyStop) break;
    await markProfileScanned(profile, now);
    await reportProgress("PROFILE_COMPLETE", {
      profile: profile.strategyType,
      decisions: decisions.length,
      profileDurationMs: Date.now() - profileStartedAt,
    });
  }
  let dailyMinimumMessage = "";
  if (
    !timeBudgetReached &&
    !entrySafetyStop &&
    liveExperimentMode &&
    LIVE_ACTIVITY_ENABLED &&
    Date.now() < newEntryCutoffMs &&
    LIVE_ACTIVITY_TARGET > 0 &&
    beijingHour(now) >= LIVE_ACTIVITY_START_HOUR_BJ &&
    !risk.blocked &&
    executedToday < Math.min(LIVE_ACTIVITY_TARGET, environment.liveMaxTradesPerDay)
  ) {
    const needed = Math.min(
      LIVE_ACTIVITY_TARGET - executedToday,
      environment.liveMaxTradesPerDay - executedToday
    );
    const candidates = decisions
      .filter((decision) =>
        isActivityPromotionEligible(decision) &&
        decision.strategyType === "INTRADAY" &&
        decision.mode === "LIVE" &&
        (decision.direction === "LONG" || decision.direction === "SHORT") &&
        decision.confidence >= LIVE_ACTIVITY_MIN_CONFIDENCE &&
        decision.technicalScore >= 20 &&
        decision.conditionsTotal > 0 &&
        decision.conditionsMet >= Math.max(2, Math.ceil(decision.conditionsTotal * 0.25)) &&
        Boolean(decision.entryPrice && decision.stopLoss && decision.target1 && decision.target2) &&
        decisionRewardRisk(decision) >= 1.05 &&
        !reservedSymbols.has(decision.symbol) &&
        !positions.some((row) => row.symbol === decision.symbol && row.total > 0) &&
        !protections.some((row) => row.symbol === decision.symbol)
      )
      .sort((a, b) => dailyMinimumCandidateScore(b, now) - dailyMinimumCandidateScore(a, now));

    const messages: string[] = [];
    let promotedCount = 0;
    for (const candidate of candidates) {
      if (Date.now() >= newEntryCutoffMs) break;
      if (
        promotedCount >= needed ||
        executedToday >= environment.liveMaxTradesPerDay
      ) break;
      if (await symbolExecutedOrderCountToday(candidate.symbol, now, "LIVE") >= LIVE_SYMBOL_TRADE_CAP) continue;
      const baseProfile = profiles.find((profile) => profile.strategyType === candidate.strategyType);
      if (!baseProfile) continue;
      const activityProfile: ThreeHorizonStrategyProfile = {
        ...baseProfile,
        enabled: true,
        mode: "LIVE",
        symbols: [...(dynamicLiveSymbols.length ? dynamicLiveSymbols : environment.liveAllowedSymbols)],
        riskPerTradePct: Math.min(baseProfile.riskPerTradePct, LIVE_ACTIVITY_PROBE_RISK_PCT),
        planningMinConfidence: 38,
        minConfidence: Math.max(38, Math.min(candidate.confidence, 44)),
        maxHoldingMinutes: Math.min(baseProfile.maxHoldingMinutes, 180),
        maxTradesPerDay: environment.liveMaxTradesPerDay,
      };
      const evaluation: EvaluationResult = {
        direction: candidate.direction,
        confidence: candidate.confidence,
        technicalScore: candidate.technicalScore,
        forecastScore: candidate.forecastScore,
        conditions: candidate.conditions,
        currentPrice: candidate.currentPrice,
        entryPrice: candidate.entryPrice,
        stopLoss: candidate.stopLoss,
        target1: candidate.target1,
        target2: candidate.target2,
        ready: true,
        rejectionCode: "DAILY_MINIMUM_EXECUTION",
        rejectionReason: `今日实盘成交低于${LIVE_ACTIVITY_TARGET}笔活动目标，从动态候选池Top${dynamicLiveSymbols.length || environment.liveAllowedSymbols.length}中选择综合得分靠前的${candidate.symbol}，以${activityProfile.riskPerTradePct}%风险开第一批探路仓。`,
        executionTier: "PROBE",
        riskScale: 1,
        directionStrength: candidate.direction === "LONG" ? candidate.confidence : -candidate.confidence,
        raw: {
          liveActivityProbe: true,
          candidateScore: dailyMinimumCandidateScore(candidate, now),
          originalRejectionCode: candidate.rejectionCode,
          originalRejectionReason: candidate.rejectionReason,
        },
      };
      let promoted = await updateDecision(candidate.id, {
        status: "READY",
        rejectionCode: "DAILY_MINIMUM_EXECUTION",
        rejectionReason: evaluation.rejectionReason,
      });
      const planGate = await prepareAiTradePlanBeforeExecution({
        decision: promoted,
        profile: activityProfile,
        now,
        forecastPlan: canonicalForecastBySymbol.get(candidate.symbol) ?? null,
      }).catch((error): Awaited<ReturnType<typeof prepareAiTradePlanBeforeExecution>> => ({
        plan: null,
        allowed: false,
        code: "PLAN_PUBLISH_ERROR",
        reason: error instanceof Error ? error.message : "实盘活动计划发布失败",
      }));
      if (!planGate.allowed) {
        promoted = await updateDecision(promoted.id, {
          status: "BLOCKED",
          rejectionCode: planGate.code,
          rejectionReason: planGate.reason,
        });
        messages.push(`${candidate.symbol}等待计划闸门：${planGate.reason}`);
      } else {
        const lifecycle = await runNewEntryBeforeCutoff({
          cutoffMs: newEntryCutoffMs,
          now: Date.now,
          run: () => executeReadyDecision({
            decision: promoted, profile: activityProfile, evaluation, risk, positions, protections, now, reservedSymbols, reservedRiskPct,
            exposureAction: "DAILY_MINIMUM_ENTRY",
            forecastPlan: canonicalForecastBySymbol.get(candidate.symbol),
            authorityReadsOk: forecastAuthorityReadsOk,
            ledgerConsistent: newExposureLedgerConsistent,
          }),
        });
        if (!lifecycle.started) break;
        const executed = lifecycle.value;
        promoted = executed.decision;
        if (executed.attempted) orderAttempts += 1;
        if (executed.success) {
          orderSuccess += 1;
          executedToday += 1;
          promotedCount += 1;
          reservedSymbols.add(candidate.symbol);
          reservedRiskPct += executed.riskReservedPct;
          messages.push(`${candidate.symbol}${candidate.direction === "LONG" ? "做多" : "做空"}实盘探路仓已提交，风险${round(executed.riskReservedPct, 3)}%`);
        } else {
          messages.push(`${candidate.symbol}${executed.error ? "实盘执行异常" : "被安全闸门拦截"}：${promoted.rejectionReason}`);
        }
        if (executed.error) {
          orderErrors += 1;
          entrySafetyStop = true;
        }
      }
      await syncAiTradePlanFromDecision(promoted, now, { force: true }).catch(() => undefined);
      const decisionIndex = decisions.findIndex((row) => row.id === promoted.id);
      if (decisionIndex >= 0) decisions[decisionIndex] = promoted;
      if (entrySafetyStop) break;
    }
    dailyMinimumMessage = messages.length
      ? `实盘每日活动目标${executedToday}/${LIVE_ACTIVITY_TARGET}：${messages.join("；")}`
      : `实盘每日活动目标${executedToday}/${LIVE_ACTIVITY_TARGET}：本轮没有通过最小方向、宽止损和安全闸门的候选。`;
  }
  let demoActivityMessage = "";
  if (
    Date.now() < newEntryCutoffMs &&
    environment.mode === "DEMO" &&
    DEMO_ACTIVE_EXECUTION_ENABLED &&
    DEMO_ACTIVITY_TARGET > 0 &&
    beijingHour(now) >= DEMO_ACTIVITY_START_HOUR_BJ &&
    !risk.blocked &&
    executedToday < Math.min(DEMO_ACTIVITY_TARGET, DEMO_GLOBAL_TRADE_CAP)
  ) {
    const needed = Math.min(
      DEMO_ACTIVITY_TARGET - executedToday,
      DEMO_GLOBAL_TRADE_CAP - executedToday
    );
    const candidates = decisions
      .filter((decision) =>
        isActivityPromotionEligible(decision) &&
        decision.strategyType === "INTRADAY" &&
        decision.mode === "DEMO" &&
        (decision.direction === "LONG" || decision.direction === "SHORT") &&
        decision.confidence >= 44 &&
        decision.technicalScore >= 35 &&
        decision.conditionsTotal > 0 &&
        decision.conditionsMet >= Math.max(2, Math.ceil(decision.conditionsTotal * 0.35)) &&
        Boolean(decision.entryPrice && decision.stopLoss && decision.target1 && decision.target2) &&
        decisionRewardRisk(decision) >= 1.05 &&
        !reservedSymbols.has(decision.symbol) &&
        !positions.some((row) => row.symbol === decision.symbol && row.total > 0) &&
        !protections.some((row) => row.symbol === decision.symbol)
      )
      .sort((a, b) => dailyMinimumCandidateScore(b, now) - dailyMinimumCandidateScore(a, now));

    const messages: string[] = [];
    let promotedCount = 0;
    for (const candidate of candidates) {
      if (Date.now() >= newEntryCutoffMs) break;
      if (promotedCount >= needed || executedToday >= DEMO_GLOBAL_TRADE_CAP) break;
      if (await symbolExecutedOrderCountToday(candidate.symbol, now, "DEMO") >= DEMO_SYMBOL_TRADE_CAP) continue;
      const baseProfile = profiles.find((profile) => profile.strategyType === candidate.strategyType);
      if (!baseProfile) continue;
      const activityProfile: ThreeHorizonStrategyProfile = {
        ...baseProfile,
        enabled: true,
        mode: "DEMO",
        symbols: [...LIVE_FULL_UNIVERSE_SYMBOLS],
        riskPerTradePct: Math.min(baseProfile.riskPerTradePct, DEMO_ACTIVITY_PROBE_RISK_PCT),
        planningMinConfidence: 40,
        minConfidence: Math.max(40, Math.min(candidate.confidence, 46)),
        maxHoldingMinutes: Math.min(baseProfile.maxHoldingMinutes, 180),
        maxTradesPerDay: DEMO_GLOBAL_TRADE_CAP,
      };
      const evaluation: EvaluationResult = {
        direction: candidate.direction,
        confidence: candidate.confidence,
        technicalScore: candidate.technicalScore,
        forecastScore: candidate.forecastScore,
        conditions: candidate.conditions,
        currentPrice: candidate.currentPrice,
        entryPrice: candidate.entryPrice,
        stopLoss: candidate.stopLoss,
        target1: candidate.target1,
        target2: candidate.target2,
        ready: true,
        rejectionCode: "DAILY_ACTIVITY_PROBE",
        rejectionReason: `今日成交低于${DEMO_ACTIVITY_TARGET}笔活动目标，从动态Top10品种中选择综合得分靠前的${candidate.symbol}，以${activityProfile.riskPerTradePct}%风险开第一批探路仓。`,
        executionTier: "PROBE",
        riskScale: 1,
        directionStrength: candidate.direction === "LONG" ? candidate.confidence : -candidate.confidence,
        raw: {
          dailyActivityProbe: true,
          candidateScore: dailyMinimumCandidateScore(candidate, now),
          originalRejectionCode: candidate.rejectionCode,
          originalRejectionReason: candidate.rejectionReason,
        },
      };
      let promoted = await updateDecision(candidate.id, {
        status: "READY",
        rejectionCode: "DAILY_ACTIVITY_PROBE",
        rejectionReason: evaluation.rejectionReason,
      });
      const planGate = await prepareAiTradePlanBeforeExecution({
        decision: promoted,
        profile: activityProfile,
        now,
        forecastPlan: canonicalForecastBySymbol.get(candidate.symbol) ?? null,
      }).catch((error): Awaited<ReturnType<typeof prepareAiTradePlanBeforeExecution>> => ({
        plan: null,
        allowed: false,
        code: "PLAN_PUBLISH_ERROR",
        reason: error instanceof Error ? error.message : "Demo活动计划发布失败",
      }));
      if (!planGate.allowed) {
        promoted = await updateDecision(promoted.id, {
          status: "BLOCKED",
          rejectionCode: planGate.code,
          rejectionReason: planGate.reason,
        });
        messages.push(`${candidate.symbol}等待计划闸门：${planGate.reason}`);
      } else {
        const lifecycle = await runNewEntryBeforeCutoff({
          cutoffMs: newEntryCutoffMs,
          now: Date.now,
          run: () => executeReadyDecision({
            decision: promoted, profile: activityProfile, evaluation, risk, positions, protections, now, reservedSymbols, reservedRiskPct,
            exposureAction: "ACTIVITY_FALLBACK_ENTRY",
            forecastPlan: canonicalForecastBySymbol.get(candidate.symbol),
            authorityReadsOk: forecastAuthorityReadsOk,
            ledgerConsistent: newExposureLedgerConsistent,
          }),
        });
        if (!lifecycle.started) break;
        const executed = lifecycle.value;
        promoted = executed.decision;
        if (executed.attempted) orderAttempts += 1;
        if (executed.success) {
          orderSuccess += 1;
          executedToday += 1;
          promotedCount += 1;
          reservedSymbols.add(candidate.symbol);
          reservedRiskPct += executed.riskReservedPct;
          messages.push(`${candidate.symbol}${candidate.direction === "LONG" ? "做多" : "做空"}探路仓已提交，风险${round(executed.riskReservedPct, 3)}%`);
        } else if (executed.error) {
          orderErrors += 1;
          messages.push(`${candidate.symbol}下单失败：${promoted.rejectionReason}`);
        } else {
          messages.push(`${candidate.symbol}被安全闸门拦截：${promoted.rejectionReason}`);
        }
      }
      await syncAiTradePlanFromDecision(promoted, now, { force: true }).catch(() => undefined);
      const decisionIndex = decisions.findIndex((row) => row.id === promoted.id);
      if (decisionIndex >= 0) decisions[decisionIndex] = promoted;
    }
    demoActivityMessage = messages.length
      ? `Demo每日活动目标${executedToday}/${DEMO_ACTIVITY_TARGET}：${messages.join("；")}`
      : `Demo每日活动目标${executedToday}/${DEMO_ACTIVITY_TARGET}：本轮没有通过最小方向、宽止损和安全闸门的候选。`;
  }
  if (dailyMinimumMessage || demoActivityMessage) {
    commissioningMessage = [commissioningMessage, dailyMinimumMessage, demoActivityMessage].filter(Boolean).join("；");
  }

  const scannedSymbols = Array.from(new Set(decisions.map((row) => row.symbol)));
  const readyCount = decisions.filter((row) => ["READY", "SHADOW_READY", "ORDER_SUBMITTED", "OPEN", "PARTIAL"].includes(row.status)).length;
  const noOrderReasons = decisions
    .filter((row) => !["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSED"].includes(row.status))
    .map((row) => `${row.symbol}:${row.rejectionReason || row.status}`)
    .slice(0, 4);
  return {
    ok: orderErrors === 0 && scanErrors === 0,
    runId,
    source,
    startedAt,
    finishedAt: new Date().toISOString(),
    scannedStrategies: dueProfiles.map((profile) => profile.strategyType),
    decisions,
    managedOpenDecisions: management.managed,
    orderAttempts,
    orderSuccess,
    orderErrors,
    message: `${commissioningMessage ? `首笔闭环：${commissioningMessage}；` : ""}三周期全品种扫描${scannedSymbols.length}/${eligibleUniverseSymbols.size || scannedSymbols.length}个可用标的（${scannedSymbols.join("、") || "无"}）；方向明确${directionalDecisions}，入场触发${entryTriggers}，事前发布时间拦截${leadTimeBlocks}，风险拦截${riskBlocks}，可执行${readyCount}，数据异常${scanErrors}，真实下单成功${orderSuccess}，订单错误${orderErrors}${timeBudgetReached ? "；本轮达到时间预算，剩余标的下一分钟继续" : ""}${entrySafetyStop ? "；本轮因实盘执行/托管异常已停止继续新开仓" : ""}${noOrderReasons.length ? `；未下单原因：${noOrderReasons.join("；")}` : ""}。`,
  };
}

export async function getThreeHorizonStrategyDashboard(
  now = new Date()
): Promise<ThreeHorizonStrategyDashboard> {
  const databaseReady = await ensureThreeHorizonStrategyTables();
  const profiles = databaseReady ? await getThreeHorizonProfiles() : [];
  const rows = databaseReady ? await listDecisionRows(120) : [];
  const latestDecisions = rows.map(mapDecision);
  const risk = await buildRiskSnapshot(now);
  const stats = databaseReady ? await buildStrategyStats(profiles, now) : [];
  const environment = getBitgetDemoEnvironment();
  const legacyHorizonToggle = process.env.BITGET_DEMO_THREE_HORIZON_EXECUTION_ALLOWED?.toLowerCase();
  const executionEnvironmentAllowed = environment.mode === "LIVE_EXPERIMENT"
    ? environment.executionAllowed && LIVE_ACTIVE_EXECUTION_ENABLED
    : environment.executionAllowed && DEMO_ACTIVE_EXECUTION_ENABLED && legacyHorizonToggle !== "false";
  return {
    databaseReady,
    generatedAt: now.toISOString(),
    executionEnvironmentAllowed,
    executionSafetyNotice: environment.mode === "LIVE_EXPERIMENT"
      ? executionEnvironmentAllowed
        ? "实盘主动执行已开启：短线每分钟扫描，短线每日/中线每周/长线每月各最多5笔；只有正式方向、真实收盘触发、计划锁和硬风控全部通过才下单，不为凑数交易。"
        : "实盘主动执行未获授权：请检查MOOX_TRADING_CONTROL_MODE与BITGET_LIVE_CONFIRMATION。"
      : executionEnvironmentAllowed
        ? `主动Demo执行已开启：动态候选扫描、最多两批入场、2倍逐仓和${DEMO_GLOBAL_TRADE_CAP}笔全局硬上限生效；不再按成交数量晋级候选。`
        : "主动Demo执行当前关闭。请确认BITGET_DEMO_EXECUTION_ALLOWED=true；MOOX_DEMO_ACTIVE_EXECUTION_V64或旧兼容开关若显式设为false，也会立即停止新开仓。",
    profiles,
    risk,
    latestDecisions,
    stats,
  };
}

export async function getThreeHorizonPublicStrategies(
  now = new Date()
): Promise<ThreeHorizonPublicStrategy[]> {
  const dashboard = await getThreeHorizonStrategyDashboard(now);
  return dashboard.profiles.map((profile) => {
    const decisions = dashboard.latestDecisions
      .filter((row) => row.strategyType === profile.strategyType)
      .slice(0, 20);
    const stats = dashboard.stats.find((row) => row.strategyType === profile.strategyType) ?? {
      strategyType: profile.strategyType,
      scansToday: 0,
      symbolsEvaluatedToday: 0,
      readyToday: 0,
      shadowReadyToday: 0,
      blockedToday: 0,
      orderAttemptsToday: 0,
      openedToday: 0,
      closedTrades: 0,
      wins: 0,
      losses: 0,
      winRatePct: null,
      netPnlUsdt: 0,
      averageR: null,
    };
    return {
      strategyType: profile.strategyType,
      label: profile.label,
      description: profile.description,
      enabled: profile.enabled,
      mode: profile.mode,
      modeLabel: profile.mode === "LIVE" ? "Bitget实盘实验" : profile.mode === "DEMO" ? "Bitget Demo模拟执行" : "影子观察",
      holdingLabel: profile.strategyType === "INTRADAY" ? "30分钟～8小时" : profile.strategyType === "SWING" ? "1～7天" : "1～4周",
      timeframeLabel: `${profile.environmentTimeframe}环境 / ${profile.directionTimeframe}方向 / ${profile.entryTimeframe}入场`,
      riskPerTradePct: profile.riskPerTradePct,
      lastScanAt: profile.lastScanAt,
      stats,
      decisions,
    };
  });
}
