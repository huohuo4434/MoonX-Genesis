/** Daily forecast accuracy types — separate from long-term research verification. */

export type DailyAccuracyMarket = "CRYPTO" | "US" | "CN" | "HK" | "US_FUTURES";

export type DailyAccuracyDirection = "UP" | "DOWN" | "FLAT";

export type DailyAccuracyDirectionLabel = "上涨" | "下跌" | "震荡" | "暂无判断" | "观望";

/** Full intraday path taxonomy used by MOOX verification. */
export type DailyAccuracyPattern =
  | "UP"
  | "DOWN"
  | "RANGE"
  | "RANGE_UP"
  | "RANGE_DOWN"
  | "UP_THEN_DOWN"
  | "DOWN_THEN_UP"
  | "SURGE_THEN_PULLBACK"
  | "DIP_THEN_RECOVERY";

export type DailyAccuracyPatternLabel =
  | "上涨"
  | "下跌"
  | "震荡"
  | "震荡上涨"
  | "震荡下跌"
  | "先涨后跌"
  | "先跌后涨"
  | "冲高回落"
  | "探底回升";

export type DailyValidationMode = "FULL_PATH" | "LEGACY_DIRECTION_ONLY" | "UNVERIFIABLE";

export type DailyForecastRecordStatus =
  | "draft"
  | "published"
  | "verifying"
  | "verified"
  | "invalid";

export type DailyVerdict =
  | "FULL_HIT"
  | "PARTIAL_HIT"
  | "HIT" // legacy alias, treated as FULL_HIT in public stats
  | "MISS"
  | "UNVERIFIABLE"
  | "VOID"
  | "MANUAL_REVIEW";

export type DailyVerdictLabel =
  | "完全命中"
  | "部分命中"
  | "命中"
  | "未命中"
  | "无法验证"
  | "不计入统计"
  | "待人工核对";

export type DailyForecastRecord = {
  id: string;
  forecastDate: string;
  assetName: string;
  symbol: string;
  market: DailyAccuracyMarket;
  direction: DailyAccuracyDirection;
  directionLabel: DailyAccuracyDirectionLabel;
  /** Original path snapshot. New records should always populate this. */
  predictedPattern?: DailyAccuracyPattern;
  predictedPatternLabel?: DailyAccuracyPatternLabel;
  expectedPath?: string[];
  probability?: number;
  /** Locked at publication for star-bucket verification. */
  consensusStars?: 1 | 2 | 3 | 4 | 5;
  consensusScore?: number;
  consensusLabel?: string;
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
  actualPattern?: DailyAccuracyPattern;
  actualPatternLabel?: DailyAccuracyPatternLabel;
  validationMode?: DailyValidationMode;
  verdict: DailyVerdict;
  verdictLabel: DailyVerdictLabel;
  /** Direction accuracy is reported separately from full-path accuracy. */
  directionVerdict?: DailyVerdict;
  pathVerdict?: DailyVerdict | string;
  pathVerdictLabel?: string;
  patternScore?: number;
  pathScore?: number;
  zoneScore?: number;
  conditionScore?: number;
  totalScore?: number;
  validationExplanation?: string;
  mainHighTime?: string | null;
  mainLowTime?: string | null;
  sessionRangePct?: number;
  closeLocation?: number;
  /** Locked intraday close path used to explain the final pattern classification. */
  intradayPath?: Array<{ time: string; close: number }>;
  thresholds?: {
    neutralPct: number;
    meaningfulMovePct: number;
    reversalPct: number;
    surgePct: number;
    atrPct?: number | null;
  };
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
  /** New path-aware counts. Optional for backwards-compatible persisted stats. */
  fullHitCount?: number;
  partialHitCount?: number;
  unverifiableCount?: number;
  missCount: number;
  hitRate: number | null;
  weightedHitRate?: number | null;
  pathHitRate?: number | null;
  directionHitRate?: number | null;
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

export const PATTERN_LABELS: Record<DailyAccuracyPattern, DailyAccuracyPatternLabel> = {
  UP: "上涨",
  DOWN: "下跌",
  RANGE: "震荡",
  RANGE_UP: "震荡上涨",
  RANGE_DOWN: "震荡下跌",
  UP_THEN_DOWN: "先涨后跌",
  DOWN_THEN_UP: "先跌后涨",
  SURGE_THEN_PULLBACK: "冲高回落",
  DIP_THEN_RECOVERY: "探底回升",
};

export const VERDICT_LABELS: Record<DailyVerdict, DailyVerdictLabel> = {
  FULL_HIT: "完全命中",
  PARTIAL_HIT: "部分命中",
  HIT: "命中",
  MISS: "未命中",
  UNVERIFIABLE: "无法验证",
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
    assetName: "国际金价",
    shortName: "黄金",
    symbol: "GOLD",
    quoteSymbol: "GC=F",
    market: "US_FUTURES" as const,
    displayOrder: 6,
    displayNote: "行情及验证使用COMEX黄金期货连续合约GC=F，单位为美元/盎司。",
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
