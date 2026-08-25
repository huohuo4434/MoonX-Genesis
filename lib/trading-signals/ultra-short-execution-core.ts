import {
  normalizeLiveTriggerPrice,
  type LiveContractRules,
} from "@/lib/trading-signals/live-order-preflight-core";

export const ULTRA_SHORT_STALE_EXIT_MINUTES = 60;
export const ULTRA_SHORT_MAX_HOLDING_MINUTES = 90;
export const TRADING_ROUND_TRIP_COST_PCT = 0.16;
export const MIN_NET_REWARD_RISK = 1.05;

const round = (value: number, digits = 8) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function buildUltraShortPriceGeometry(input: {
  direction: "LONG" | "SHORT";
  entry: number;
  atr5m: number;
  swingLow5m: number;
  swingHigh5m: number;
}): { stopLoss: number; target1: number; target2: number; stopDistancePct: number } | null {
  if (!(input.entry > 0) || !(input.atr5m > 0)) return null;
  let requiredDistance = input.atr5m * 1.35;
  if (input.direction === "LONG" && input.swingLow5m > 0 && input.swingLow5m < input.entry) {
    requiredDistance = Math.max(requiredDistance, input.entry - input.swingLow5m);
  }
  if (input.direction === "SHORT" && input.swingHigh5m > input.entry) {
    requiredDistance = Math.max(requiredDistance, input.swingHigh5m - input.entry);
  }
  const maximumDistance = input.entry * 0.015;
  // A stop inside the actual 5m structure is not a valid stop. If the
  // structure needs more than the ultra-short risk envelope, skip the setup.
  if (requiredDistance > maximumDistance + Number.EPSILON) return null;
  const distance = Math.max(requiredDistance, input.entry * 0.0035);
  const stopDistancePct = distance / input.entry * 100;
  if (input.direction === "LONG") {
    return {
      stopLoss: round(input.entry - distance),
      target1: round(input.entry + distance),
      target2: round(input.entry + distance * 2.2),
      stopDistancePct: round(stopDistancePct, 4),
    };
  }
  return {
    stopLoss: round(input.entry + distance),
    target1: round(input.entry - distance),
    target2: round(input.entry - distance * 2.2),
    stopDistancePct: round(stopDistancePct, 4),
  };
}

export function conservativeNetRewardRisk(input: {
  entryPrice: number | null | undefined;
  stopLoss: number | null | undefined;
  target: number | null | undefined;
  roundTripCostPct?: number;
}): number {
  const entry = Number(input.entryPrice ?? 0);
  const stop = Number(input.stopLoss ?? 0);
  const target = Number(input.target ?? 0);
  const costPct = input.roundTripCostPct ?? TRADING_ROUND_TRIP_COST_PCT;
  if (!(entry > 0) || !(stop > 0) || !(target > 0) || !(costPct >= 0)) return 0;
  const riskPct = Math.abs(entry - stop) / entry * 100 + costPct;
  const rewardPct = Math.abs(target - entry) / entry * 100 - costPct;
  if (!(riskPct > 0) || !(rewardPct > 0)) return 0;
  return rewardPct / riskPct;
}

export function costAdjustedRiskPerUnit(input: {
  entryPrice: number;
  stopLoss: number;
  roundTripCostPct?: number;
}): number {
  if (!(input.entryPrice > 0) || !(input.stopLoss > 0)) return 0;
  const costPct = input.roundTripCostPct ?? TRADING_ROUND_TRIP_COST_PCT;
  return Math.abs(input.entryPrice - input.stopLoss) + input.entryPrice * costPct / 100;
}

export type NormalizedExecutionGeometry = {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  stopDistancePct: number;
  netRewardRisk: number;
};

export type ExecutionGeometryResult =
  | { ok: true; value: NormalizedExecutionGeometry }
  | { ok: false; code: "INVALID_INPUT" | "INVALID_GEOMETRY" | "STOP_TOO_WIDE" | "NET_RR_TOO_LOW"; reason: string };

export function normalizeExecutionPriceGeometry(input: {
  direction: "LONG" | "SHORT";
  entryPrice: number | null | undefined;
  stopLoss: number | null | undefined;
  target1: number | null | undefined;
  target2: number | null | undefined;
  contract: LiveContractRules;
  maxStopDistancePct?: number;
  minNetRewardRisk?: number;
}): ExecutionGeometryResult {
  const sourceEntry = Number(input.entryPrice ?? 0);
  const sourceStop = Number(input.stopLoss ?? 0);
  const sourceTarget1 = Number(input.target1 ?? 0);
  const sourceTarget2 = Number(input.target2 ?? 0);
  if (!(sourceEntry > 0) || !(sourceStop > 0) || !(sourceTarget1 > 0) || !(sourceTarget2 > 0)) {
    return { ok: false, code: "INVALID_INPUT", reason: "缺少可归一化的入场、止损或止盈价格" };
  }
  const long = input.direction === "LONG";
  const entryPrice = normalizeLiveTriggerPrice(sourceEntry, input.contract, "nearest");
  const stopLoss = normalizeLiveTriggerPrice(sourceStop, input.contract, long ? "floor" : "ceil");
  const target1 = normalizeLiveTriggerPrice(sourceTarget1, input.contract, long ? "ceil" : "floor");
  const target2 = normalizeLiveTriggerPrice(sourceTarget2, input.contract, long ? "ceil" : "floor");
  const validGeometry = long
    ? stopLoss < entryPrice && target1 > entryPrice && target2 > target1
    : stopLoss > entryPrice && target1 < entryPrice && target2 < target1;
  if (!validGeometry) {
    return { ok: false, code: "INVALID_GEOMETRY", reason: "交易所价格步长归一化后止损止盈结构失效" };
  }
  const stopDistancePct = Math.abs(entryPrice - stopLoss) / entryPrice * 100;
  if (input.maxStopDistancePct != null && stopDistancePct > input.maxStopDistancePct + 1e-9) {
    return {
      ok: false,
      code: "STOP_TOO_WIDE",
      reason: `价格归一化后止损距离${round(stopDistancePct, 4)}%超过${input.maxStopDistancePct}%硬上限`,
    };
  }
  const netRewardRisk = conservativeNetRewardRisk({ entryPrice, stopLoss, target: target2 });
  const minimum = input.minNetRewardRisk ?? MIN_NET_REWARD_RISK;
  if (netRewardRisk + 1e-9 < minimum) {
    return {
      ok: false,
      code: "NET_RR_TOO_LOW",
      reason: `扣除${TRADING_ROUND_TRIP_COST_PCT}%手续费滑点后净盈亏比${round(netRewardRisk, 3)}低于${minimum}`,
    };
  }
  return {
    ok: true,
    value: { entryPrice, stopLoss, target1, target2, stopDistancePct, netRewardRisk },
  };
}

export function evaluateUltraShortTimedExit(input: {
  openedAt: string | Date | null;
  now: string | Date;
  maxHoldingUntil?: string | Date | null;
  direction: "LONG" | "SHORT";
  entryPrice: number | null;
  markPrice: number;
  stopLoss: number | null;
  tp1Done: boolean;
}): { shouldExit: boolean; code: "" | "ULTRA_SHORT_STALE_EXIT" | "ULTRA_SHORT_MAX_HOLD_EXIT"; reason: string; elapsedMinutes: number; progressR: number | null } {
  const openedMs = input.openedAt ? new Date(input.openedAt).getTime() : Number.NaN;
  const nowMs = new Date(input.now).getTime();
  if (!Number.isFinite(openedMs) || !Number.isFinite(nowMs) || nowMs < openedMs) {
    return { shouldExit: false, code: "", reason: "", elapsedMinutes: 0, progressR: null };
  }
  const elapsedMinutes = (nowMs - openedMs) / 60_000;
  const maxHoldingMs = input.maxHoldingUntil ? new Date(input.maxHoldingUntil).getTime() : openedMs + ULTRA_SHORT_MAX_HOLDING_MINUTES * 60_000;
  if (Number.isFinite(maxHoldingMs) && nowMs >= maxHoldingMs) {
    return {
      shouldExit: true,
      code: "ULTRA_SHORT_MAX_HOLD_EXIT",
      reason: `超短线达到${ULTRA_SHORT_MAX_HOLDING_MINUTES}分钟绝对持仓上限`,
      elapsedMinutes: round(elapsedMinutes, 2),
      progressR: null,
    };
  }
  if (elapsedMinutes < ULTRA_SHORT_STALE_EXIT_MINUTES || input.tp1Done) {
    return { shouldExit: false, code: "", reason: "", elapsedMinutes: round(elapsedMinutes, 2), progressR: null };
  }
  const entry = Number(input.entryPrice ?? 0);
  const stop = Number(input.stopLoss ?? 0);
  const oneR = Math.abs(entry - stop);
  const progress = input.direction === "LONG" ? input.markPrice - entry : entry - input.markPrice;
  const progressR = entry > 0 && oneR > 0 ? progress / oneR : Number.NEGATIVE_INFINITY;
  if (progressR < 0.25) {
    return {
      shouldExit: true,
      code: "ULTRA_SHORT_STALE_EXIT",
      reason: `超短线持仓${ULTRA_SHORT_STALE_EXIT_MINUTES}分钟仍未达到0.25R推进，释放资金等待下一次1分钟结构`,
      elapsedMinutes: round(elapsedMinutes, 2),
      progressR: Number.isFinite(progressR) ? round(progressR, 4) : null,
    };
  }
  return {
    shouldExit: false,
    code: "",
    reason: "",
    elapsedMinutes: round(elapsedMinutes, 2),
    progressR: round(progressR, 4),
  };
}
