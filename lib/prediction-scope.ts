/**
 * Public prediction scope effective from 2026-09-02.
 * Retired markets remain in the immutable audit archive.
 */
export const PREDICTION_SCOPE_EFFECTIVE_DATE = "2026-09-02";

export const ACTIVE_PREDICTION_SYMBOLS = ["BTC", "ETH", "NDX", "GOLD", "SILVER"] as const;
export const RETIRED_PREDICTION_SYMBOLS = ["WTI", "SPX", "SHCOMP", "HSTECH"] as const;

export const PUBLIC_PREDICTION_SCOPE = {
  effectiveDate: PREDICTION_SCOPE_EFFECTIVE_DATE,
  activeAssetNamesZh: ["比特币", "以太坊", "纳斯达克100", "黄金", "白银"],
  activeAssetNamesEn: ["Bitcoin", "Ethereum", "Nasdaq 100", "Gold", "Silver"],
  retiredAssetNamesZh: ["原油", "标普500", "上证指数", "恒生科技"],
  retiredAssetNamesEn: ["WTI crude", "S&P 500", "Shanghai Composite", "Hang Seng TECH"],
} as const;

const ALIASES: Record<string, string> = {
  BTCUSDT: "BTC", "BTC-USD": "BTC", ETHUSDT: "ETH", "ETH-USD": "ETH",
  "000001.SS": "SHCOMP", SSEC: "SHCOMP", SSE: "SHCOMP",
  GLD: "GOLD", "GC=F": "GOLD", GC: "GOLD", XAU: "GOLD", XAUUSD: "GOLD", XAUT: "GOLD", XAUTUSDT: "GOLD",
  SI: "SILVER", "SI=F": "SILVER", SLV: "SILVER", XAG: "SILVER", XAGUSD: "SILVER", XAGUSDT: "SILVER",
  "CL=F": "WTI", CL: "WTI", USOIL: "WTI", CLUSDT: "WTI", WTIUSD: "WTI",
  "^GSPC": "SPX", GSPC: "SPX", SPY: "SPX", SPYUSDT: "SPX",
  "^NDX": "NDX", QQQ: "NDX", QQQUSDT: "NDX", "HSTECH.HK": "HSTECH",
};

export function canonicalPredictionScopeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  return ALIASES[normalized] ?? normalized;
}

export function isActivePredictionSymbol(symbol: string): boolean {
  return (ACTIVE_PREDICTION_SYMBOLS as readonly string[]).includes(canonicalPredictionScopeSymbol(symbol));
}

export function isRetiredPredictionSymbol(symbol: string): boolean {
  return (RETIRED_PREDICTION_SYMBOLS as readonly string[]).includes(canonicalPredictionScopeSymbol(symbol));
}
