/** Daily forecast accuracy types — separate from long-term research verification. */

export type DailyAccuracyMarket = "CRYPTO" | "US" | "CN" | "HK" | "US_FUTURES";

export type DailyAccuracyDirection = "UP" | "DOWN" | "FLAT";

export type DailyAccuracyDirectionLabel = "上涨" | "下跌" | "震荡" | "暂无判断" | "观望";

export type DailyForecastRecordStatus =
  | "draft"
  | "published"
  | "verifying"
  | "verified"
  | "invalid";

export type DailyVerdict = "HIT" | "MISS" | "VOID" | "MANUAL_REVIEW";

export type DailyVerdictLabel = "命中" | "未命中" | "不计入统计" | "待人工核对";

export type DailyForecastRecord = {
  id: string;
  forecastDate: string;
  assetName: string;
  symbol: string;
  market: DailyAccuracyMarket;
  direction: DailyAccuracyDirection;
  directionLabel: DailyAccuracyDirectionLabel;
  probability?: number;
  summary?: string;
  publishedAt: string;
  cutoffAt: string;
  status: DailyForecastRecordStatus;
  originalVersion: number;
  source: string;
  /** System test records never enter accuracy denominator. */
  isSystemTest?: boolean;
  /** Yahoo / internal quote symbol used for verification. */
  quoteSymbol: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  withdrawnAt?: string | null;
  /** Technical structure snapshot — locked at publish; never live-updated. */
  supportLevels?: string[];
  resistanceLevels?: string[];
  confirmation?: string;
  invalidation?: string;
  priceDataSourceLabel?: string;
  priceSnapshotAtLabel?: string;
  priceSnapshot?: import("@/lib/market-data/price-levels").ForecastPriceSnapshot | null;
};

export type DailyVerificationResult = {
  forecastId: string;
  forecastDate: string;
  assetName: string;
  symbol: string;
  previousClose: number;
  actualOpen?: number;
  actualHigh?: number;
  actualLow?: number;
  actualClose: number;
  actualReturnPct: number;
  actualDirection: DailyAccuracyDirection;
  verdict: DailyVerdict;
  verdictLabel: DailyVerdictLabel;
  /** Direction accuracy only — never mixed with path. */
  directionVerdict?: DailyVerdict;
  pathVerdict?: string;
  pathVerdictLabel?: string;
  timingVerdict?: string;
  priceTargetVerdict?: string;
  verifiedAt: string;
  dataSource: string;
  errorMessage?: string;
  isSystemTest?: boolean;
};

export type DailyJsonStore<T> = {
  version: 1;
  updatedAt: string;
  records: T[];
};

export type DailyAccuracyStats = {
  /** All formal daily forecasts (published / verifying / verified / invalid). */
  totalForecasts: number;
  /** HIT + MISS only. */
  verifiedCount: number;
  hitCount: number;
  missCount: number;
  hitRate: number | null;
  hitRate7d: number | null;
  hitRate30d: number | null;
  voidCount: number;
  manualReviewCount: number;
  /** Forecasts with no result yet (true pending). */
  pendingCount: number;
  /** Forecasts marked invalid / late publish. */
  invalidCount: number;
};

export const DIRECTION_LABELS: Record<DailyAccuracyDirection, DailyAccuracyDirectionLabel> = {
  UP: "上涨",
  DOWN: "下跌",
  FLAT: "震荡",
};

export const VERDICT_LABELS: Record<DailyVerdict, DailyVerdictLabel> = {
  HIT: "命中",
  MISS: "未命中",
  VOID: "不计入统计",
  MANUAL_REVIEW: "待人工核对",
};

/** Supported first-party assets (only published ones enter verification). */
export const DAILY_ACCURACY_ASSETS = [
  {
    key: "BTC",
    assetName: "比特币",
    shortName: "比特币",
    symbol: "BTC",
    quoteSymbol: "BTC-USD",
    market: "CRYPTO" as const,
    displayOrder: 1,
  },
  {
    key: "SPX",
    assetName: "标普500指数",
    shortName: "标普500",
    symbol: "SPX",
    quoteSymbol: "^GSPC",
    market: "US" as const,
    displayOrder: 2,
  },
  {
    key: "NDX",
    assetName: "纳斯达克100",
    shortName: "纳指",
    symbol: "NDX",
    quoteSymbol: "^NDX",
    market: "US" as const,
    displayOrder: 3,
  },
  {
    key: "SSE",
    assetName: "上证指数",
    shortName: "上证",
    symbol: "SSEC",
    quoteSymbol: "000001.SS",
    market: "CN" as const,
    displayOrder: 4,
  },
  {
    key: "HSTECH",
    assetName: "恒生科技指数",
    shortName: "恒科",
    symbol: "HSTECH",
    quoteSymbol: "HSTECH.HK",
    market: "HK" as const,
    displayOrder: 5,
  },
  {
    key: "GLD",
    assetName: "黄金ETF",
    shortName: "黄金",
    symbol: "GLD",
    quoteSymbol: "GLD",
    market: "US" as const,
    displayOrder: 6,
  },
  {
    key: "WTI",
    assetName: "WTI原油",
    shortName: "WTI",
    symbol: "WTI",
    quoteSymbol: "CL=F",
    market: "US_FUTURES" as const,
    displayOrder: 7,
    displayNote: "行情及验证使用WTI近月连续合约，不代表特定交割月份的现货价格。",
  },
] as const;
