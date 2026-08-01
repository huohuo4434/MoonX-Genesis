import type { TradeSignalDirection } from "@/types/trading-signal";
import type {
  PositionSizingPlan,
  TradeRiskSettings,
} from "@/types/trading-v2";

function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function starCap(settings: TradeRiskSettings, starLevel: number): number {
  if (starLevel <= 1) return settings.star1PositionPct;
  if (starLevel === 2) return settings.star2PositionPct;
  if (starLevel === 3) return settings.star3PositionPct;
  if (starLevel === 4) return settings.star4PositionPct;
  return settings.star5PositionPct;
}

export function calculatePositionSizing(input: {
  equity: number;
  direction: TradeSignalDirection;
  starLevel: number;
  entryPrice: number;
  stopLoss: number;
  settings: TradeRiskSettings;
}): PositionSizingPlan {
  const { equity, direction, starLevel, entryPrice, stopLoss, settings } = input;
  if (
    direction === "NEUTRAL" ||
    !Number.isFinite(equity) ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopLoss) ||
    equity <= 0 ||
    entryPrice <= 0 ||
    stopLoss <= 0
  ) {
    return {
      allowed: false,
      reason: "方向、账户净值、入场价或止损价无效。",
      entryPrice,
      stopLoss,
      riskBudget: 0,
      riskPerUnit: 0,
      quantity: 0,
      notionalAmount: 0,
      positionSizePct: 0,
      cappedBy: "INVALID",
    };
  }

  const capPct = Math.min(starCap(settings, starLevel), settings.maxPositionPct);
  if (starLevel <= 2 || capPct <= 0) {
    return {
      allowed: false,
      reason: "一星和二星信号只观察，不允许自动建立模拟仓位。",
      entryPrice,
      stopLoss,
      riskBudget: 0,
      riskPerUnit: Math.abs(entryPrice - stopLoss),
      quantity: 0,
      notionalAmount: 0,
      positionSizePct: 0,
      cappedBy: "OBSERVE_ONLY",
    };
  }

  const stopCorrect =
    direction === "LONG" ? stopLoss < entryPrice : stopLoss > entryPrice;
  if (!stopCorrect) {
    return {
      allowed: false,
      reason:
        direction === "LONG"
          ? "做多信号的止损必须低于入场价。"
          : "做空信号的止损必须高于入场价。",
      entryPrice,
      stopLoss,
      riskBudget: 0,
      riskPerUnit: Math.abs(entryPrice - stopLoss),
      quantity: 0,
      notionalAmount: 0,
      positionSizePct: 0,
      cappedBy: "INVALID",
    };
  }

  const riskBudget = equity * (settings.riskPerTradePct / 100);
  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  const riskQuantity = riskBudget / riskPerUnit;
  const positionNotionalCap = equity * (capPct / 100);
  const positionQuantity = positionNotionalCap / entryPrice;
  const quantity = Math.max(0, Math.min(riskQuantity, positionQuantity));
  const notionalAmount = quantity * entryPrice;
  const positionSizePct = (notionalAmount / equity) * 100;

  return {
    allowed: quantity > 0,
    reason:
      riskQuantity <= positionQuantity
        ? `按单笔最大亏损 ${settings.riskPerTradePct}% 限制仓位。`
        : `按${starLevel}星仓位上限 ${capPct}% 限制仓位。`,
    entryPrice: round(entryPrice),
    stopLoss: round(stopLoss),
    riskBudget: round(riskBudget, 2),
    riskPerUnit: round(riskPerUnit),
    quantity: round(quantity),
    notionalAmount: round(notionalAmount, 2),
    positionSizePct: round(positionSizePct, 2),
    cappedBy: riskQuantity <= positionQuantity ? "RISK" : "POSITION",
  };
}
