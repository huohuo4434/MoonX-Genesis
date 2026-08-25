import type { NewExposureAction } from "@/lib/trading-signals/weekly-long-entry-timing-core";

const CONTINUOUS_CRYPTO_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "HYPEUSDT", "SOLUSDT"]);

const TRADITIONAL_MARKET_SYMBOLS = new Set([
  "MUUSDT",
  "QQQUSDT",
  "XAUTUSDT",
  "XAGUSDT",
  "GOOGLUSDT",
  "CLUSDT",
  "SPYUSDT",
  "SNDKUSDT",
  "MSFTUSDT",
  "NBISUSDT",
  "TENCENTUSDT",
  "LITEUSDT",
  "TSLAUSDT",
  "INTCUSDT",
]);

export type MarketSessionExposureGate = {
  allowed: boolean;
  rejectionCode:
    | "MARKET_SESSION_CLOSED"
    | "MARKET_SESSION_CLASSIFICATION_REQUIRED"
    | "MARKET_SESSION_TIME_INVALID"
    | null;
  reason: string;
};

/**
 * Blocks new exposure in traditional-market mapped contracts on Beijing
 * Saturday/Sunday. Existing-position exits and other risk-reduction actions
 * must remain available even while the underlying cash/futures market is shut.
 */
export function evaluateMarketSessionExposureSafety(input: {
  symbol: string;
  action: NewExposureAction;
  nowMs: number;
}): MarketSessionExposureGate {
  if (input.action === "RISK_REDUCTION") {
    return {
      allowed: true,
      rejectionCode: null,
      reason: "风险降低操作不受传统市场周末新开仓门禁阻断。",
    };
  }

  const beijingDay = new Date(input.nowMs + 8 * 60 * 60 * 1_000).getUTCDay();
  if (!Number.isFinite(input.nowMs) || !Number.isFinite(beijingDay)) {
    return {
      allowed: false,
      rejectionCode: "MARKET_SESSION_TIME_INVALID",
      reason: "市场时钟无效，无法确认交易时段；禁止新增或追加敞口，只允许风险降低。",
    };
  }

  const symbol = input.symbol.trim().toUpperCase();
  if (CONTINUOUS_CRYPTO_SYMBOLS.has(symbol)) {
    return {
      allowed: true,
      rejectionCode: null,
      reason: "加密资产按7×24小时市场处理。",
    };
  }

  if (!TRADITIONAL_MARKET_SYMBOLS.has(symbol)) {
    return {
      allowed: false,
      rejectionCode: "MARKET_SESSION_CLASSIFICATION_REQUIRED",
      reason: `${symbol || "空标的"}尚未明确登记为7×24加密市场或传统市场映射；禁止新增或追加敞口。`,
    };
  }

  const isWeekend = beijingDay === 0 || beijingDay === 6;
  if (isWeekend) {
    return {
      allowed: false,
      rejectionCode: "MARKET_SESSION_CLOSED",
      reason: `${symbol}映射传统市场；北京时间周六、周日禁止新开仓或加仓，只允许持仓管理、止损、止盈、减仓和平仓。`,
    };
  }

  return {
    allowed: true,
    rejectionCode: null,
    reason: "传统市场当前不在北京时间周末门禁时段。",
  };
}
