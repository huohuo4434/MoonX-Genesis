import type {
  UnifiedLivePositionSizingInput,
  UnifiedLivePositionSizingResult,
} from "@/types/unified-live-trading";

const round = (value: number, digits = 8) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function reject(reason: string, leverage: number): UnifiedLivePositionSizingResult {
  return {
    accepted: false,
    reason,
    leverage,
    marginAmount: 0,
    notionalAmount: 0,
    quantity: 0,
    projectedLoss: 0,
    projectedLossPercent: 0,
  };
}

export function calculateUnifiedLivePositionSize(
  input: UnifiedLivePositionSizingInput,
): UnifiedLivePositionSizingResult {
  const equity = Number(input.equity);
  const available = Number(input.availableMargin);
  const entry = Number(input.entryPrice);
  const stop = Number(input.stopPrice);
  const sizingValue = Number(input.sizingValue);
  const leverage = Math.min(10, Math.max(1, Math.trunc(Number(input.leverage) || 1)));
  const maxMarginUsePercent = Math.min(100, Math.max(0.1, Number(input.maxMarginUsePercent) || 25));
  const maxLossPercent = Math.min(100, Math.max(0.01, Number(input.maxLossPercent) || 0.5));
  const feeAndSlippagePercent = Math.max(0, Number(input.feeAndSlippagePercent) || 0.16);

  if (![equity, available, entry, stop, sizingValue].every(Number.isFinite)) {
    return reject("NON_FINITE_INPUT", leverage);
  }
  if (equity <= 0 || available <= 0) return reject("NO_AVAILABLE_EQUITY", leverage);
  if (entry <= 0 || stop <= 0 || entry === stop) return reject("INVALID_ENTRY_OR_STOP", leverage);
  if (sizingValue <= 0) return reject("INVALID_SIZING_VALUE", leverage);

  const stopDistancePercent = (Math.abs(entry - stop) / entry) * 100;
  const totalLossRate = (stopDistancePercent + feeAndSlippagePercent) / 100;
  const marginCap = Math.min(available, equity * (maxMarginUsePercent / 100));
  const lossCap = equity * (maxLossPercent / 100);
  let marginAmount = 0;
  let notionalAmount = 0;

  switch (input.sizingMode) {
    case "FIXED_MARGIN":
      marginAmount = sizingValue;
      notionalAmount = marginAmount * leverage;
      break;
    case "EQUITY_PERCENT":
      marginAmount = equity * (Math.min(100, sizingValue) / 100);
      notionalAmount = marginAmount * leverage;
      break;
    case "FIXED_NOTIONAL":
      notionalAmount = sizingValue;
      marginAmount = notionalAmount / leverage;
      break;
    case "RISK_PERCENT": {
      const requestedRisk = equity * (Math.min(100, sizingValue) / 100);
      const effectiveRisk = Math.min(requestedRisk, lossCap);
      if (totalLossRate <= 0) return reject("INVALID_STOP_DISTANCE", leverage);
      notionalAmount = effectiveRisk / totalLossRate;
      marginAmount = notionalAmount / leverage;
      break;
    }
    default:
      return reject("UNSUPPORTED_SIZING_MODE", leverage);
  }

  if (marginAmount > marginCap) {
    const scale = marginCap / marginAmount;
    marginAmount *= scale;
    notionalAmount *= scale;
  }

  let projectedLoss = notionalAmount * totalLossRate;
  if (projectedLoss > lossCap) {
    const scale = lossCap / projectedLoss;
    marginAmount *= scale;
    notionalAmount *= scale;
    projectedLoss *= scale;
  }

  if (marginAmount <= 0 || notionalAmount <= 0 || projectedLoss <= 0) {
    return reject("POSITION_REDUCED_TO_ZERO", leverage);
  }
  if (marginAmount > available + 1e-8) return reject("INSUFFICIENT_MARGIN", leverage);

  return {
    accepted: true,
    leverage,
    marginAmount: round(marginAmount),
    notionalAmount: round(notionalAmount),
    quantity: round(notionalAmount / entry),
    projectedLoss: round(projectedLoss),
    projectedLossPercent: round((projectedLoss / equity) * 100, 4),
  };
}
