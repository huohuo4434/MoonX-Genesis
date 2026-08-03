import "server-only";

import { randomUUID } from "crypto";
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
  placeBitgetDemoMarketOrder,
  placeBitgetDemoProtectionOrder,
  testBitgetDemoConnection,
  type BitgetCandleInterval,
  type BitgetDemoCandle,
  type BitgetDemoClosedPosition,
  type BitgetDemoPosition,
  type BitgetDemoStrategyOrder,
  type BitgetSupportedSymbol,
} from "@/lib/bitget/demo-client";
import { getBitgetMirrorSettings } from "@/lib/bitget/demo-connector";
import {
  getPredictionAutoTraderSettings,
  resolvePredictionStrategyPlans,
} from "@/lib/trading-signals/prediction-auto-trader";
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

const PROFILE_DEFINITIONS: Record<
  ThreeHorizonStrategyType,
  Omit<ThreeHorizonStrategyProfile, "enabled" | "mode" | "lastScanAt" | "updatedAt">
> = {
  INTRADAY: {
    strategyType: "INTRADAY",
    label: "短线",
    description: "30分钟至8小时，1小时环境、15分钟方向、5分钟收盘确认，原则上当日结束。",
    symbols: ["BTCUSDT", "ETHUSDT"],
    environmentTimeframe: "1H",
    directionTimeframe: "15m",
    entryTimeframe: "5m",
    scanIntervalMinutes: 5,
    riskPerTradePct: 0.35,
    maxHoldingMinutes: 8 * 60,
    minConfidence: 58,
    maxTradesPerDay: 4,
  },
  SWING: {
    strategyType: "SWING",
    label: "波段",
    description: "1至7天，周/日方向、4小时结构、1小时入场，不把短线亏损被动变成波段。",
    symbols: ["BTCUSDT", "ETHUSDT"],
    environmentTimeframe: "1D/1W",
    directionTimeframe: "4H",
    entryTimeframe: "1H",
    scanIntervalMinutes: 30,
    riskPerTradePct: 0.5,
    maxHoldingMinutes: 7 * 24 * 60,
    minConfidence: 60,
    maxTradesPerDay: 2,
  },
  POSITION: {
    strategyType: "POSITION",
    label: "中长期",
    description: "1至4周，月/周主方向、日线与4小时入场，低杠杆、小风险、固定期限复核。",
    symbols: ["BTCUSDT", "ETHUSDT"],
    environmentTimeframe: "1M/1W",
    directionTimeframe: "1D",
    entryTimeframe: "4H",
    scanIntervalMinutes: 240,
    riskPerTradePct: 0.35,
    maxHoldingMinutes: 28 * 24 * 60,
    minConfidence: 62,
    maxTradesPerDay: 1,
  },
};

const STRATEGY_ORDER: ThreeHorizonStrategyType[] = ["INTRADAY", "SWING", "POSITION"];
const DAILY_LOSS_LIMIT_PCT = envNumber("THREE_HORIZON_DAILY_LOSS_LIMIT_PCT", 1, 0.25, 5);
const WEEKLY_LOSS_LIMIT_PCT = envNumber("THREE_HORIZON_WEEKLY_LOSS_LIMIT_PCT", 2.5, 0.5, 10);
const OPEN_RISK_LIMIT_PCT = envNumber("THREE_HORIZON_OPEN_RISK_LIMIT_PCT", 2, 0.5, 5);
const CRYPTO_GROUP_RISK_LIMIT_PCT = envNumber("THREE_HORIZON_CRYPTO_GROUP_RISK_LIMIT_PCT", 1.25, 0.25, 3);
const MAX_POSITION_NOTIONAL_PCT = envNumber("THREE_HORIZON_MAX_POSITION_NOTIONAL_PCT", 10, 1, 25);

interface ProfileRow {
  strategy_type: ThreeHorizonStrategyType;
  enabled: boolean;
  mode: ThreeHorizonStrategyMode;
  symbols: unknown;
  scan_interval_minutes: number;
  risk_per_trade_pct: number;
  max_holding_minutes: number;
  min_confidence: number;
  max_trades_per_day: number;
  last_scan_at: Date | string | null;
  updated_at: Date | string;
}

interface DecisionRow {
  id: string;
  run_id: string;
  decision_key: string;
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
  raw: Record<string, unknown>;
}

interface CandleSet {
  "5m": BitgetDemoCandle[];
  "15m": BitgetDemoCandle[];
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

function trendFromCandles(
  candles: BitgetDemoCandle[],
  fastPeriod: number,
  slowPeriod: number
): ThreeHorizonDirection {
  if (candles.length < slowPeriod + 3) return "NEUTRAL";
  const closes = candles.map((row) => row.close);
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const fastNow = last(fast) ?? 0;
  const slowNow = last(slow) ?? 0;
  const fastEarlier = fast[Math.max(0, fast.length - 4)] ?? fastNow;
  const slope = fastNow - fastEarlier;
  if (fastNow > slowNow && slope > 0) return "LONG";
  if (fastNow < slowNow && slope < 0) return "SHORT";
  return "NEUTRAL";
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
  if (plan.setup === "BUY_DIP") return "LONG";
  if (plan.setup === "SELL_RALLY") return "SHORT";
  if (plan.weeklyDirection === "LONG" && plan.dailyDirection !== "SHORT") return "LONG";
  if (plan.weeklyDirection === "SHORT" && plan.dailyDirection !== "LONG") return "SHORT";
  return "NEUTRAL";
}

function forecastCompatibility(
  direction: ThreeHorizonDirection,
  plan: PredictionStrategyPlan | undefined
): { score: number; label: string; compatible: boolean } {
  const forecast = forecastDirection(plan);
  const confidence = clamp(plan?.confidence ?? 50, 0, 100);
  if (forecast === "NEUTRAL") {
    return { score: 50, label: "预测暂未形成明确方向，仅作中性权重", compatible: true };
  }
  if (direction === forecast) {
    return { score: Math.max(55, confidence), label: `预测方向与技术方向一致（${confidence}%）`, compatible: true };
  }
  return {
    score: Math.max(0, 100 - confidence),
    label: `预测方向与技术方向冲突（预测${forecast === "LONG" ? "偏多" : "偏空"}）`,
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
    ? { atrMultiple: 1.2, minPct: 0.4, maxPct: 3, target1R: 1, target2R: 1.8 }
    : input.strategyType === "SWING"
      ? { atrMultiple: 1.6, minPct: 1, maxPct: 6, target1R: 1.5, target2R: 2.5 }
      : { atrMultiple: 2, minPct: 2, maxPct: 10, target1R: 1.5, target2R: 3 };
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
  candles: CandleSet,
  plan: PredictionStrategyPlan | undefined,
  now: Date
): EvaluationResult {
  const h1 = closedCandles(candles["1H"], "1H", now);
  const m15 = closedCandles(candles["15m"], "15m", now);
  const m5 = closedCandles(candles["5m"], "5m", now);
  const direction = trendFromCandles(h1, 20, 50);
  const latest15 = last(m15);
  const latest5 = last(m5);
  const previous5 = m5[m5.length - 2];
  const ema15 = last(ema(m15.map((row) => row.close), 20)) ?? 0;
  const ema5 = last(ema(m5.map((row) => row.close), 9)) ?? 0;
  const previousEma5 = ema(m5.map((row) => row.close), 9)[Math.max(0, m5.length - 2)] ?? ema5;
  const rsi15 = rsi(m15);
  const atr15 = atr(m15);
  const forecast = forecastCompatibility(direction, plan);
  const structureMet = direction === "LONG"
    ? Boolean(latest15 && latest15.close > ema15 && rsi15 >= 48 && rsi15 <= 72)
    : direction === "SHORT"
      ? Boolean(latest15 && latest15.close < ema15 && rsi15 >= 28 && rsi15 <= 52)
      : false;
  const entryMet = direction === "LONG"
    ? Boolean(latest5 && previous5 && latest5.close > ema5 && previous5.close <= previousEma5 && latest5.close > latest5.open)
    : direction === "SHORT"
      ? Boolean(latest5 && previous5 && latest5.close < ema5 && previous5.close >= previousEma5 && latest5.close < latest5.open)
      : false;
  const volumeAverage = average(m5.slice(-20).map((row) => row.volume));
  const volumeMet = Boolean(latest5 && (volumeAverage <= 0 || latest5.volume >= volumeAverage * 0.75));
  const volatility = volatilityCondition(m15, atr15, 2.5);
  const conditions: ThreeHorizonCondition[] = [
    { key: "environment", label: "1小时趋势环境", met: direction !== "NEUTRAL", value: direction === "NEUTRAL" ? "均线与斜率未形成趋势" : direction === "LONG" ? "EMA20在EMA50上方且向上" : "EMA20在EMA50下方且向下", weight: 25 },
    { key: "direction", label: "15分钟方向结构", met: structureMet, value: `收盘${latest15?.close ?? 0}，EMA20 ${round(ema15, 2)}，RSI ${round(rsi15, 1)}`, weight: 20 },
    { key: "entry", label: "5分钟收盘触发", met: entryMet, value: entryMet ? "收盘确认穿越EMA9并与方向一致" : "尚未出现有效收盘确认", weight: 25 },
    { key: "forecast", label: "预测方向加权", met: forecast.compatible, value: forecast.label, weight: 15 },
    { key: "risk", label: "波动与成交过滤", met: volatility.met && volumeMet, value: `${volatility.value}；成交量${volumeMet ? "正常" : "偏弱"}`, weight: 15 },
  ];
  return finalizeEvaluation(profile, direction, conditions, forecast.score, m15, atr15, plan);
}

function evaluateSwing(
  profile: ThreeHorizonStrategyProfile,
  candles: CandleSet,
  plan: PredictionStrategyPlan | undefined,
  now: Date
): EvaluationResult {
  const d1 = closedCandles(candles["1D"], "1D", now);
  const h4 = closedCandles(candles["4H"], "4H", now);
  const h1 = closedCandles(candles["1H"], "1H", now);
  const weeks = completedAggregateCandles(d1, weekKey, now);
  const weeklyDirection = trendFromCandles(weeks, 3, 6);
  const dailyDirection = trendFromCandles(d1, 10, 30);
  const direction = weeklyDirection !== "NEUTRAL" && weeklyDirection === dailyDirection
    ? weeklyDirection
    : dailyDirection;
  const latest4h = last(h4);
  const ema4h = last(ema(h4.map((row) => row.close), 20)) ?? 0;
  const rsi4h = rsi(h4);
  const latest1h = last(h1);
  const previous1h = h1[h1.length - 2];
  const ema1h = last(ema(h1.map((row) => row.close), 12)) ?? 0;
  const structureMet = direction === "LONG"
    ? Boolean(latest4h && latest4h.close > ema4h && rsi4h >= 45 && rsi4h <= 72)
    : direction === "SHORT"
      ? Boolean(latest4h && latest4h.close < ema4h && rsi4h >= 28 && rsi4h <= 55)
      : false;
  const triggerMet = direction === "LONG"
    ? Boolean(latest1h && previous1h && latest1h.close > ema1h && latest1h.close > previous1h.high)
    : direction === "SHORT"
      ? Boolean(latest1h && previous1h && latest1h.close < ema1h && latest1h.close < previous1h.low)
      : false;
  const forecast = forecastCompatibility(direction, plan);
  const atr4h = atr(h4);
  const volatility = volatilityCondition(h4, atr4h, 5);
  const conditions: ThreeHorizonCondition[] = [
    { key: "weekly", label: "周线环境", met: weeklyDirection !== "NEUTRAL", value: weeklyDirection === "NEUTRAL" ? "周线趋势未确认" : weeklyDirection === "LONG" ? "聚合周线趋势向上" : "聚合周线趋势向下", weight: 20 },
    { key: "daily", label: "日线方向", met: dailyDirection !== "NEUTRAL" && (weeklyDirection === "NEUTRAL" || dailyDirection === weeklyDirection), value: dailyDirection === "NEUTRAL" ? "日线趋势未确认" : `日线${dailyDirection === "LONG" ? "偏多" : "偏空"}`, weight: 20 },
    { key: "structure", label: "4小时结构", met: structureMet, value: `收盘${latest4h?.close ?? 0}，EMA20 ${round(ema4h, 2)}，RSI ${round(rsi4h, 1)}`, weight: 20 },
    { key: "entry", label: "1小时入场确认", met: triggerMet, value: triggerMet ? "收盘突破上一根K线并保持在EMA12方向侧" : "等待1小时结构收盘确认", weight: 20 },
    { key: "forecast", label: "周日预测加权", met: forecast.compatible, value: forecast.label, weight: 10 },
    { key: "risk", label: "4小时波动过滤", met: volatility.met, value: volatility.value, weight: 10 },
  ];
  return finalizeEvaluation(profile, direction, conditions, forecast.score, h4, atr4h, plan);
}

function evaluatePosition(
  profile: ThreeHorizonStrategyProfile,
  candles: CandleSet,
  plan: PredictionStrategyPlan | undefined,
  now: Date
): EvaluationResult {
  const d1 = closedCandles(candles["1D"], "1D", now);
  const h4 = closedCandles(candles["4H"], "4H", now);
  const weeks = completedAggregateCandles(d1, weekKey, now);
  const months = completedAggregateCandles(d1, monthKey, now);
  // Bitget UTA exposes daily candles for long-horizon analysis. Aggregate
  // completed daily candles into calendar months and use a slope fallback
  // until enough completed months exist for the EMA comparison.
  const monthlyDirection = months.length >= 6
    ? trendFromCandles(months, 2, 3)
    : slopeDirection(months, 2);
  const weeklyDirection = trendFromCandles(weeks, 3, 6);
  const dailyDirection = trendFromCandles(d1, 10, 30);
  const direction = monthlyDirection !== "NEUTRAL" && monthlyDirection === weeklyDirection
    ? monthlyDirection
    : weeklyDirection !== "NEUTRAL" && weeklyDirection === dailyDirection
      ? weeklyDirection
      : "NEUTRAL";
  const latestDaily = last(d1);
  const dailyEma = last(ema(d1.map((row) => row.close), 20)) ?? 0;
  const latest4h = last(h4);
  const previous4h = h4[h4.length - 2];
  const ema4h = last(ema(h4.map((row) => row.close), 20)) ?? 0;
  const directionMet = direction === "LONG"
    ? Boolean(latestDaily && latestDaily.close > dailyEma)
    : direction === "SHORT"
      ? Boolean(latestDaily && latestDaily.close < dailyEma)
      : false;
  const triggerMet = direction === "LONG"
    ? Boolean(latest4h && previous4h && latest4h.close > ema4h && latest4h.close > previous4h.close)
    : direction === "SHORT"
      ? Boolean(latest4h && previous4h && latest4h.close < ema4h && latest4h.close < previous4h.close)
      : false;
  const forecast = forecastCompatibility(direction, plan);
  const atrDaily = atr(d1);
  const volatility = volatilityCondition(d1, atrDaily, 8);
  const conditions: ThreeHorizonCondition[] = [
    { key: "monthly", label: "月度环境", met: monthlyDirection !== "NEUTRAL", value: monthlyDirection === "NEUTRAL" ? "月度样本尚未形成稳定方向" : `月度${monthlyDirection === "LONG" ? "向上" : "向下"}`, weight: 20 },
    { key: "weekly", label: "周度方向", met: weeklyDirection !== "NEUTRAL" && weeklyDirection === monthlyDirection, value: weeklyDirection === "NEUTRAL" ? "周度未确认" : `周度${weeklyDirection === "LONG" ? "偏多" : "偏空"}`, weight: 20 },
    { key: "daily", label: "日线结构", met: directionMet, value: `日线收盘${latestDaily?.close ?? 0}，EMA20 ${round(dailyEma, 2)}`, weight: 20 },
    { key: "entry", label: "4小时入场", met: triggerMet, value: triggerMet ? "4小时收盘延续并站在EMA20方向侧" : "等待4小时收盘确认", weight: 15 },
    { key: "forecast", label: "长期预测加权", met: forecast.compatible, value: forecast.label, weight: 15 },
    { key: "risk", label: "日线波动过滤", met: volatility.met, value: volatility.value, weight: 10 },
  ];
  return finalizeEvaluation(profile, direction, conditions, forecast.score, d1, atrDaily, plan);
}

function finalizeEvaluation(
  profile: ThreeHorizonStrategyProfile,
  direction: ThreeHorizonDirection,
  conditions: ThreeHorizonCondition[],
  forecastScore: number,
  priceCandles: BitgetDemoCandle[],
  atrValue: number,
  plan: PredictionStrategyPlan | undefined
): EvaluationResult {
  const currentPrice = last(priceCandles)?.close ?? null;
  const totalWeight = conditions.reduce((sum, row) => sum + row.weight, 0) || 1;
  const technicalConditions = conditions.filter((row) => row.key !== "forecast");
  const technicalWeight = technicalConditions.reduce((sum, row) => sum + row.weight, 0) || 1;
  const technicalScore = Math.round(
    technicalConditions.reduce((sum, row) => sum + (row.met ? row.weight : 0), 0) /
      technicalWeight * 100
  );
  const weight = profile.strategyType === "INTRADAY"
    ? { technical: 0.75, forecast: 0.25 }
    : profile.strategyType === "SWING"
      ? { technical: 0.6, forecast: 0.4 }
      : { technical: 0.45, forecast: 0.55 };
  const confidence = Math.round(technicalScore * weight.technical + forecastScore * weight.forecast);
  const conditionsMet = conditions.filter((row) => row.met).length;
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
  const mandatoryKeys = profile.strategyType === "INTRADAY"
    ? ["environment", "direction", "entry", "risk"]
    : profile.strategyType === "SWING"
      ? ["weekly", "daily", "structure", "entry", "risk"]
      : ["monthly", "weekly", "daily", "entry", "risk"];
  const missingMandatory = conditions.filter(
    (row) => mandatoryKeys.includes(row.key) && !row.met
  );
  const ready = Boolean(
    direction !== "NEUTRAL" &&
      currentPrice &&
      prices &&
      missingMandatory.length === 0 &&
      confidence >= profile.minConfidence
  );
  let rejectionCode = "";
  let rejectionReason = "已满足强制技术触发、波动过滤和综合置信度条件。";
  if (direction === "NEUTRAL") {
    rejectionCode = "NO_DIRECTION";
    rejectionReason = "高周期方向尚未形成一致趋势。";
  } else if (missingMandatory.length > 0) {
    rejectionCode = "CONDITIONS_INCOMPLETE";
    const missing = missingMandatory.map((row) => row.label).join("、");
    rejectionReason = `当前满足${conditionsMet}/${conditions.length}项，强制条件还缺少：${missing || "技术确认"}。`;
  } else if (confidence < profile.minConfidence) {
    rejectionCode = "CONFIDENCE_LOW";
    rejectionReason = `综合置信度${confidence}%低于${profile.minConfidence}%门槛。`;
  } else if (!prices) {
    rejectionCode = "RISK_PLAN_INVALID";
    rejectionReason = "无法根据结构和ATR生成有效止损。";
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
    raw: {
      forecastSetup: plan?.setup ?? "MISSING",
      forecastConfidence: plan?.confidence ?? null,
      totalWeight,
      atr: atrValue,
      swingLow,
      swingHigh,
    },
  };
}

let ensured = false;
export async function ensureThreeHorizonStrategyTables(): Promise<boolean> {
  if (!prisma) return false;
  if (ensured) return true;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_three_horizon_profiles (
        strategy_type TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        mode TEXT NOT NULL DEFAULT 'SHADOW',
        symbols JSONB NOT NULL DEFAULT '["BTCUSDT","ETHUSDT"]'::jsonb,
        scan_interval_minutes INTEGER NOT NULL,
        risk_per_trade_pct DOUBLE PRECISION NOT NULL,
        max_holding_minutes INTEGER NOT NULL,
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
        opened_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        realized_pnl_usdt DOUBLE PRECISION,
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
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
          risk_per_trade_pct, max_holding_minutes, min_confidence,
          max_trades_per_day, updated_at
        ) VALUES (
          ${strategyType}, TRUE, 'SHADOW', ${JSON.stringify(definition.symbols)}::jsonb,
          ${definition.scanIntervalMinutes}, ${definition.riskPerTradePct},
          ${definition.maxHoldingMinutes}, ${definition.minConfidence},
          ${definition.maxTradesPerDay}, NOW()
        ) ON CONFLICT (strategy_type) DO NOTHING
      `;
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
    .filter((value) => /^(BTC|ETH|HYPE)USDT$/.test(value));
  return {
    ...definition,
    enabled: Boolean(row.enabled),
    mode: row.mode === "DEMO" ? "DEMO" : "SHADOW",
    symbols: symbols.length ? symbols : definition.symbols,
    scanIntervalMinutes: Math.max(1, Number(row.scan_interval_minutes || definition.scanIntervalMinutes)),
    riskPerTradePct: clamp(Number(row.risk_per_trade_pct || definition.riskPerTradePct), 0.1, 0.5),
    maxHoldingMinutes: Math.max(30, Number(row.max_holding_minutes || definition.maxHoldingMinutes)),
    minConfidence: Math.round(clamp(Number(row.min_confidence || definition.minConfidence), 50, 90)),
    maxTradesPerDay: Math.max(0, Math.min(4, Number(row.max_trades_per_day || definition.maxTradesPerDay))),
    lastScanAt: iso(row.last_scan_at),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapDecision(row: DecisionRow): ThreeHorizonStrategyDecision {
  const conditions = parseJson<ThreeHorizonCondition[]>(row.conditions, []);
  return {
    id: row.id,
    runId: row.run_id,
    strategyType: row.strategy_type,
    strategyLabel: PROFILE_DEFINITIONS[row.strategy_type].label,
    mode: row.mode === "DEMO" ? "DEMO" : "SHADOW",
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
  return rows.map(mapProfile);
}

export async function updateThreeHorizonProfile(input: {
  strategyType: ThreeHorizonStrategyType;
  enabled?: boolean;
  mode?: ThreeHorizonStrategyMode;
  riskPerTradePct?: number;
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
  const minConfidence = input.minConfidence == null
    ? current.minConfidence
    : Math.round(clamp(input.minConfidence, 50, 90));
  const maxTrades = input.maxTradesPerDay == null
    ? current.maxTradesPerDay
    : Math.max(0, Math.min(4, Math.floor(input.maxTradesPerDay)));
  await prisma.$executeRaw`
    UPDATE trade_three_horizon_profiles SET
      enabled = ${enabled},
      mode = ${mode},
      risk_per_trade_pct = ${risk},
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
  return prisma.$queryRawUnsafe<DecisionRow[]>(`
    SELECT * FROM trade_three_horizon_decisions
    WHERE status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING')
    ORDER BY created_at ASC
  `);
}

function beijingStartOfDay(now: Date): Date {
  const shifted = new Date(now.getTime() + 8 * 60 * 60_000);
  const utc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(utc - 8 * 60 * 60_000);
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
      blockReason: "Bitget Demo密钥尚未配置完整。",
    };
  }
  try {
    const [account, closed, active, consecutiveLosses] = await Promise.all([
      testBitgetDemoConnection(),
      getBitgetDemoClosedPositions(100),
      listActiveDecisionRows(),
      consecutiveStrategyLosses(),
    ]);
    const equity = account.detectedUsdt || account.equityUsdt || account.availableUsdt || 0;
    const dailyNet = pnlInWindow(closed, beijingStartOfDay(now));
    const weeklyNet = pnlInWindow(closed, beijingStartOfWeek(now));
    const dailyLossPct = equity > 0 && dailyNet < 0 ? Math.abs(dailyNet) / equity * 100 : 0;
    const weeklyLossPct = equity > 0 && weeklyNet < 0 ? Math.abs(weeklyNet) / equity * 100 : 0;
    const openRiskAmount = active.reduce((sum, row) => sum + Number(row.risk_amount_usdt ?? 0), 0);
    const openRiskPct = equity > 0 ? openRiskAmount / equity * 100 : 0;
    let blockReason = "";
    if (equity <= 0) blockReason = "未检测到可用于Demo交易的模拟资金。";
    else if (dailyLossPct >= DAILY_LOSS_LIMIT_PCT) blockReason = `当日亏损达到${round(dailyLossPct, 2)}%，触发${DAILY_LOSS_LIMIT_PCT}%暂停线。`;
    else if (weeklyLossPct >= WEEKLY_LOSS_LIMIT_PCT) blockReason = `本周亏损达到${round(weeklyLossPct, 2)}%，触发${WEEKLY_LOSS_LIMIT_PCT}%暂停线。`;
    else if (openRiskPct >= OPEN_RISK_LIMIT_PCT) blockReason = `开放风险达到${round(openRiskPct, 2)}%，超过${OPEN_RISK_LIMIT_PCT}%上限。`;
    else if (openRiskPct >= CRYPTO_GROUP_RISK_LIMIT_PCT) blockReason = `加密货币风险组达到${round(openRiskPct, 2)}%，超过${CRYPTO_GROUP_RISK_LIMIT_PCT}%上限。`;
    else if (consecutiveLosses >= 3) blockReason = "三周期策略连续亏损3单，已禁止新开仓。";
    return {
      equityUsdt: equity || null,
      dailyNetPnlUsdt: round(dailyNet, 2),
      weeklyNetPnlUsdt: round(weeklyNet, 2),
      dailyLossPct: round(dailyLossPct, 3),
      weeklyLossPct: round(weeklyLossPct, 3),
      openRiskPct: round(openRiskPct, 3),
      cryptoGroupRiskPct: round(openRiskPct, 3),
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
      blockReason: error instanceof Error ? error.message : "Bitget Demo风险数据读取失败。",
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
  await prisma.$executeRaw`
    UPDATE trade_three_horizon_decisions SET
      status = ${fields.status ?? current.status},
      rejection_code = ${fields.rejectionCode ?? current.rejection_code},
      rejection_reason = ${fields.rejectionReason ?? current.rejection_reason},
      current_price = ${fields.currentPrice === undefined ? current.current_price : fields.currentPrice},
      entry_price = ${fields.entryPrice === undefined ? current.entry_price : fields.entryPrice},
      quantity = ${fields.quantity === undefined ? current.quantity : fields.quantity},
      risk_amount_usdt = ${fields.riskAmountUsdt === undefined ? current.risk_amount_usdt : fields.riskAmountUsdt},
      risk_pct = ${fields.riskPct === undefined ? current.risk_pct : fields.riskPct},
      client_oid = ${fields.clientOid === undefined ? current.client_oid : fields.clientOid},
      bitget_order_id = ${fields.bitgetOrderId === undefined ? current.bitget_order_id : fields.bitgetOrderId},
      protection_order_id = ${fields.protectionOrderId === undefined ? current.protection_order_id : fields.protectionOrderId},
      tp1_done = ${fields.tp1Done === undefined ? current.tp1_done : fields.tp1Done},
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
     WHERE strategy_type = $1
       AND status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING','CLOSED')
       AND created_at >= $2::timestamptz`,
    profile.strategyType,
    start.toISOString()
  );
  return Number(rows[0]?.count ?? 0);
}

async function loadCandleSet(symbol: BitgetSupportedSymbol): Promise<CandleSet> {
  const intervals: BitgetCandleInterval[] = ["5m", "15m", "1H", "4H", "1D"];
  const rows = await Promise.all(
    intervals.map((interval) =>
      getBitgetDemoCandles({
        symbol,
        interval,
        limit: interval === "1D" ? 400 : 120,
      })
    )
  );
  return {
    "5m": rows[0] ?? [],
    "15m": rows[1] ?? [],
    "1H": rows[2] ?? [],
    "4H": rows[3] ?? [],
    "1D": rows[4] ?? [],
  };
}

function evaluate(
  profile: ThreeHorizonStrategyProfile,
  candles: CandleSet,
  plan: PredictionStrategyPlan | undefined,
  now: Date
): EvaluationResult {
  if (profile.strategyType === "INTRADAY") return evaluateIntraday(profile, candles, plan, now);
  if (profile.strategyType === "SWING") return evaluateSwing(profile, candles, plan, now);
  return evaluatePosition(profile, candles, plan, now);
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
}> {
  const rows = await listActiveDecisionRows();
  if (!rows.length) return { managed: 0, orderAttempts: 0, orderSuccess: 0, orderErrors: 0 };
  const decisions = rows.map(mapDecision);
  const [positions, protections, closed] = await Promise.all([
    getBitgetDemoCurrentPositions(),
    getBitgetDemoPendingStrategyOrders(),
    getBitgetDemoClosedPositions(100),
  ]);
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
    if (!rows.find((row) => row.id === current.id)?.tp1_done && targetReached(current.direction, position.markPrice, current.target1)) {
      orderAttempts += 1;
      try {
        const contract = await getContractConfig(current.symbol as BitgetSupportedSymbol);
        const half = position.total * 0.5;
        const halfSize = Number(normalizeOrderSize(half, contract));
        if (halfSize > 0 && halfSize < position.total) {
          await placeBitgetDemoMarketOrder({
            paperOrderId: `${current.id}:tp1`,
            symbol: current.symbol as BitgetSupportedSymbol,
            quantity: halfSize,
            side: orderSide(current.direction, true),
            reduceOnly: true,
          });
          if (protection?.orderId) {
            await cancelBitgetDemoStrategyOrder({ orderId: protection.orderId }).catch(() => undefined);
          }
          const replacement = await placeBitgetDemoProtectionOrder({
            paperOrderId: `${current.id}:breakeven-protection`,
            symbol: current.symbol as BitgetSupportedSymbol,
            posSide: current.direction === "SHORT" ? "short" : "long",
            stopLoss: current.entryPrice ?? position.avgPrice,
            takeProfit: current.target2 ?? position.markPrice,
          });
          await updateDecision(current.id, {
            status: "PARTIAL",
            tp1Done: true,
            protectionOrderId: replacement.orderId,
            rejectionCode: "",
            rejectionReason: "达到第一目标，已减仓约50%，剩余仓位止损移动至保本。",
          });
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
  return { managed: decisions.length, orderAttempts, orderSuccess, orderErrors };
}

async function calculatePositionSize(input: {
  profile: ThreeHorizonStrategyProfile;
  evaluation: EvaluationResult;
  equityUsdt: number;
  symbol: BitgetSupportedSymbol;
}): Promise<{ quantity: number; riskAmountUsdt: number; riskPct: number }> {
  if (!input.evaluation.entryPrice || !input.evaluation.stopLoss) {
    throw new Error("缺少入场价或止损价");
  }
  const stopDistance = Math.abs(input.evaluation.entryPrice - input.evaluation.stopLoss);
  if (stopDistance <= 0) throw new Error("止损距离无效");
  const riskAmount = input.equityUsdt * input.profile.riskPerTradePct / 100;
  const riskQuantity = riskAmount / stopDistance;
  const maxNotional = input.equityUsdt * MAX_POSITION_NOTIONAL_PCT / 100;
  const cappedQuantity = Math.min(riskQuantity, maxNotional / input.evaluation.entryPrice);
  const contract = await getContractConfig(input.symbol);
  const normalized = Number(normalizeOrderSize(cappedQuantity, contract));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("交易所规格归一化后下单数量无效");
  }
  const actualRisk = normalized * stopDistance;
  const actualRiskPct = actualRisk / input.equityUsdt * 100;
  if (actualRiskPct > input.profile.riskPerTradePct * 1.05) {
    throw new Error(`最小下单量会使实际风险${round(actualRiskPct, 3)}%超过预算`);
  }
  return {
    quantity: normalized,
    riskAmountUsdt: round(actualRisk, 4),
    riskPct: round(actualRiskPct, 4),
  };
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
  const environment = getBitgetDemoEnvironment();
  const horizonExecutionAllowed = process.env.BITGET_DEMO_THREE_HORIZON_EXECUTION_ALLOWED?.toLowerCase() === "true";
  const mirror = await getBitgetMirrorSettings();
  let blockReason = "";
  let blockCode = "";
  if (!horizonExecutionAllowed) {
    blockCode = "THREE_HORIZON_EXECUTION_OFF";
    blockReason = "BITGET_DEMO_THREE_HORIZON_EXECUTION_ALLOWED尚未设为true。";
  } else if (!environment.executionAllowed) {
    blockCode = "DEMO_EXECUTION_OFF";
    blockReason = "BITGET_DEMO_EXECUTION_ALLOWED尚未设为true。";
  } else if (mirror.enabled) {
    blockCode = "LEGACY_MIRROR_ACTIVE";
    blockReason = "旧版Bitget镜像仍开启；为避免两套机器人争抢同一仓位，三周期Demo下单已拦截。";
  } else if (input.risk.blocked) {
    blockCode = "RISK_LIMIT";
    blockReason = input.risk.blockReason;
  } else if (
    input.risk.openRiskPct + input.reservedRiskPct + input.profile.riskPerTradePct >
    input.risk.openRiskLimitPct + 1e-9
  ) {
    blockCode = "PROJECTED_OPEN_RISK_LIMIT";
    blockReason = `本单按最大预算计入后，开放风险将达到${round(input.risk.openRiskPct + input.reservedRiskPct + input.profile.riskPerTradePct, 3)}%，超过${input.risk.openRiskLimitPct}%上限。`;
  } else if (
    input.risk.cryptoGroupRiskPct + input.reservedRiskPct + input.profile.riskPerTradePct >
    input.risk.cryptoGroupRiskLimitPct + 1e-9
  ) {
    blockCode = "PROJECTED_CRYPTO_GROUP_LIMIT";
    blockReason = `本单按最大预算计入后，加密货币风险组将达到${round(input.risk.cryptoGroupRiskPct + input.reservedRiskPct + input.profile.riskPerTradePct, 3)}%，超过${input.risk.cryptoGroupRiskLimitPct}%上限。`;
  } else if (input.reservedSymbols.has(input.decision.symbol)) {
    blockCode = "SYMBOL_RESERVED_THIS_RUN";
    blockReason = `${input.decision.symbol}已在本次服务器扫描中提交过订单，禁止并发重复开仓。`;
  } else if (input.positions.some((row) => row.symbol === input.decision.symbol && row.total > 0)) {
    blockCode = "SYMBOL_POSITION_EXISTS";
    blockReason = `${input.decision.symbol}已有Bitget Demo持仓，同一标的不重复开仓。`;
  } else if (input.protections.some((row) => row.symbol === input.decision.symbol)) {
    blockCode = "SYMBOL_PROTECTION_EXISTS";
    blockReason = `${input.decision.symbol}仍有交易所策略单，需先完成对账。`;
  } else if (!input.risk.equityUsdt || input.risk.equityUsdt <= 0) {
    blockCode = "NO_EQUITY";
    blockReason = "未检测到可用模拟资金。";
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
  try {
    const equityUsdt = input.risk.equityUsdt;
    if (equityUsdt == null || equityUsdt <= 0) {
      throw new Error("未检测到可用模拟资金");
    }
    const sizing = await calculatePositionSize({
      profile: input.profile,
      evaluation: input.evaluation,
      equityUsdt,
      symbol: input.decision.symbol as BitgetSupportedSymbol,
    });
    let current = await updateDecision(input.decision.id, {
      status: "READY",
      quantity: sizing.quantity,
      riskAmountUsdt: sizing.riskAmountUsdt,
      riskPct: sizing.riskPct,
      rejectionCode: "",
      rejectionReason: "通过组合风控，准备提交Bitget Demo订单。",
    });
    const order = await placeBitgetDemoMarketOrder({
      paperOrderId: current.id,
      symbol: current.symbol as BitgetSupportedSymbol,
      quantity: sizing.quantity,
      side: orderSide(current.direction),
      reduceOnly: false,
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
      rejectionReason: `Bitget Demo订单已提交，并在开仓请求中预设止损和第二目标。${order.warnings.join("；")}`,
    });
    return {
      decision: current,
      attempted: true,
      success: true,
      error: false,
      riskReservedPct: sizing.riskPct,
    };
  } catch (error) {
    return {
      decision: await updateDecision(input.decision.id, {
        status: "ERROR",
        rejectionCode: "ORDER_ERROR",
        rejectionReason: error instanceof Error ? error.message : "Bitget Demo下单失败",
      }),
      attempted: true,
      success: false,
      error: true,
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
  options: { manageOnly?: boolean } = {}
): Promise<ThreeHorizonRunReport> {
  if (!(await ensureThreeHorizonStrategyTables()) || !prisma) {
    throw new Error("三周期策略数据库未连接");
  }
  const runId = `thr_${randomUUID()}`;
  const startedAt = now.toISOString();
  const management = await manageActiveDecisions(now).catch(() => ({
    managed: 0,
    orderAttempts: 0,
    orderSuccess: 0,
    orderErrors: 1,
  }));
  if (options.manageOnly) {
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
      message: `服务器处于暂停状态，仅管理${management.managed}笔已有三周期仓位，不扫描新入场。`,
    };
  }
  const profiles = await getThreeHorizonProfiles();
  const dueProfiles = profiles.filter((profile) => profile.enabled && profileDue(profile, now));
  if (!dueProfiles.length) {
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
      message: "三周期持仓管理已执行；本分钟没有到期的策略扫描。",
    };
  }
  const settings = await getPredictionAutoTraderSettings();
  const forecastPlans = await resolvePredictionStrategyPlans(settings, now).catch(() => []);
  const forecastBySymbol = new Map<string, PredictionStrategyPlan>();
  for (const plan of forecastPlans) {
    const symbol = String(plan.symbol).toUpperCase();
    forecastBySymbol.set(symbol.endsWith("USDT") ? symbol : `${symbol}USDT`, plan);
  }
  const risk = await buildRiskSnapshot(now);
  const [positions, protections] = await Promise.all([
    getBitgetDemoCurrentPositions().catch(() => []),
    getBitgetDemoPendingStrategyOrders().catch(() => []),
  ]);
  const candleCache = new Map<string, CandleSet>();
  const reservedSymbols = new Set(
    positions.filter((row) => row.total > 0).map((row) => row.symbol)
  );
  let reservedRiskPct = 0;
  const decisions: ThreeHorizonStrategyDecision[] = [];
  let orderAttempts = management.orderAttempts;
  let orderSuccess = management.orderSuccess;
  let orderErrors = management.orderErrors;
  for (const profile of dueProfiles) {
    let tradesToday = await todayTradeCount(profile, now);
    for (const symbolText of profile.symbols) {
      const symbol = symbolText as BitgetSupportedSymbol;
      try {
        let candleSet = candleCache.get(symbol);
        if (!candleSet) {
          candleSet = await loadCandleSet(symbol);
          candleCache.set(symbol, candleSet);
        }
        const evaluation = evaluate(profile, candleSet, forecastBySymbol.get(symbol), now);
        let status: ThreeHorizonDecisionStatus = evaluation.ready ? "READY" : "OBSERVING";
        let rejectionCode = evaluation.rejectionCode;
        let rejectionReason = evaluation.rejectionReason;
        if (
          evaluation.ready &&
          profile.mode === "DEMO" &&
          tradesToday >= profile.maxTradesPerDay
        ) {
          status = "BLOCKED";
          rejectionCode = "DAILY_TRADE_LIMIT";
          rejectionReason = `${profile.label}今日已达到${profile.maxTradesPerDay}笔开仓上限。`;
        }
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
        if (evaluation.ready && status === "READY") {
          const executed = await executeReadyDecision({
            decision,
            profile,
            evaluation,
            risk,
            positions,
            protections,
            now,
            reservedSymbols,
            reservedRiskPct,
          });
          decision = executed.decision;
          if (executed.attempted) orderAttempts += 1;
          if (executed.success) {
            orderSuccess += 1;
            tradesToday += 1;
            reservedSymbols.add(symbol);
            reservedRiskPct += executed.riskReservedPct;
          }
          if (executed.error) orderErrors += 1;
        }
        decisions.push(decision);
      } catch (error) {
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
        orderErrors += 1;
      }
    }
    await markProfileScanned(profile, now);
  }
  return {
    ok: orderErrors === 0,
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
    message: `三周期扫描${dueProfiles.length}套策略、${decisions.length}个标的决策；影子准备${decisions.filter((row) => row.status === "SHADOW_READY").length}，Demo下单成功${orderSuccess}，错误${orderErrors}。`,
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
  const executionEnvironmentAllowed =
    process.env.BITGET_DEMO_THREE_HORIZON_EXECUTION_ALLOWED?.toLowerCase() === "true";
  return {
    databaseReady,
    generatedAt: now.toISOString(),
    executionEnvironmentAllowed,
    executionSafetyNotice: executionEnvironmentAllowed
      ? "三周期Demo总开关已开启；仍需策略处于DEMO模式、旧镜像关闭并通过组合风控才会下单。"
      : "默认只运行影子模式。未设置BITGET_DEMO_THREE_HORIZON_EXECUTION_ALLOWED=true时，任何三周期策略都不会向Bitget下单。",
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
      .slice(0, 6);
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
      modeLabel: profile.mode === "DEMO" ? "Bitget Demo模拟执行" : "影子观察",
      holdingLabel: profile.strategyType === "INTRADAY" ? "30分钟～8小时" : profile.strategyType === "SWING" ? "1～7天" : "1～4周",
      timeframeLabel: `${profile.environmentTimeframe}环境 / ${profile.directionTimeframe}方向 / ${profile.entryTimeframe}入场`,
      riskPerTradePct: profile.riskPerTradePct,
      lastScanAt: profile.lastScanAt,
      stats,
      decisions,
    };
  });
}
