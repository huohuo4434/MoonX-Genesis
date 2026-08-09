import type { LiveExecutionStage } from "../bitget/live-execution-core";

export type LiveOrderFailureStage = LiveExecutionStage;

export type LiveOrderFailureDisposition = {
  attempted: boolean;
  error: boolean;
  status: "BLOCKED" | "ERROR";
  rejectionCode:
    | "ORDER_PREFLIGHT_BLOCK"
    | "ACCOUNT_CONFIG_BLOCK"
    | "ORDER_ERROR"
    | "ORDER_STATUS_UNKNOWN"
    | "STATUS_QUERY_BLOCK";
};

export type LiveContractRules = {
  symbol: string;
  available: boolean;
  sizeMultiplier: number;
  volumePlace: number;
  priceMultiplier?: number;
  pricePrecision?: number;
};

function decimalPlaces(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const text = value.toString().toLowerCase();
  if (text.includes("e-")) return Number(text.split("e-")[1] ?? 0);
  const dot = text.indexOf(".");
  return dot >= 0 ? text.length - dot - 1 : 0;
}

/**
 * Only a definite error returned after POST /api/v3/trade/place-order was dispatched
 * counts as an order error. Everything else stays fail-closed without incrementing the
 * consecutive real-order error pause counter.
 */
export function classifyLiveOrderFailure(
  stage: LiveOrderFailureStage,
  remoteSubmissionAttempted = stage === "REMOTE_ORDER_WRITE" || stage === "AMBIGUOUS_WRITE"
): LiveOrderFailureDisposition {
  if (stage === "REMOTE_ORDER_WRITE") {
    return {
      attempted: true,
      error: true,
      status: "ERROR",
      rejectionCode: "ORDER_ERROR",
    };
  }
  if (stage === "AMBIGUOUS_WRITE") {
    return {
      attempted: true,
      error: false,
      status: "BLOCKED",
      rejectionCode: "ORDER_STATUS_UNKNOWN",
    };
  }
  if (stage === "STATUS_QUERY") {
    return {
      attempted: remoteSubmissionAttempted,
      error: false,
      status: "BLOCKED",
      rejectionCode: "STATUS_QUERY_BLOCK",
    };
  }
  if (stage === "ACCOUNT_CONFIG_WRITE") {
    return {
      attempted: false,
      error: false,
      status: "BLOCKED",
      rejectionCode: "ACCOUNT_CONFIG_BLOCK",
    };
  }
  return {
    attempted: false,
    error: false,
    status: "BLOCKED",
    rejectionCode: "ORDER_PREFLIGHT_BLOCK",
  };
}

/** Round a minimum exchange quantity UP to the next valid contract step. */
export function normalizeLiveOrderSizeUp(quantity: number, contract: LiveContractRules): string {
  if (!contract.available) throw new Error(`${contract.symbol} current trading environment is unavailable`);
  const step = contract.sizeMultiplier > 0 ? contract.sizeMultiplier : 10 ** -contract.volumePlace;
  const ceiled = Math.ceil((quantity - Number.EPSILON) / step) * step;
  const places = Math.max(decimalPlaces(step), contract.volumePlace, 0);
  const normalized = Number(ceiled.toFixed(Math.min(places, 12)));
  if (!Number.isFinite(normalized) || normalized <= 0) throw new Error(`${contract.symbol} quantity normalized to zero`);
  return normalized.toFixed(Math.min(places, 12)).replace(/\.?0+$/, "");
}

/** Normalize preset TP/SL trigger prices to the exchange price step. */
export function normalizeLiveTriggerPrice(
  price: number,
  contract: LiveContractRules,
  rounding: "floor" | "ceil" | "nearest" = "nearest"
): number {
  if (!Number.isFinite(price) || price <= 0) throw new Error(`${contract.symbol} trigger price is invalid`);
  const priceMultiplier = Number(contract.priceMultiplier ?? 0);
  const pricePrecision = Number(contract.pricePrecision ?? 8);
  const step = priceMultiplier > 0 ? priceMultiplier : 10 ** -Math.max(0, pricePrecision);
  const scaled = price / step;
  const units = rounding === "floor"
    ? Math.floor(scaled + Number.EPSILON)
    : rounding === "ceil"
      ? Math.ceil(scaled - Number.EPSILON)
      : Math.round(scaled);
  const normalized = units * step;
  return Number(normalized.toFixed(Math.min(Math.max(pricePrecision, decimalPlaces(step)), 12)));
}
