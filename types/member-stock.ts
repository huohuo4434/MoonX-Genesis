/** Member benefit stock forecasts — separate from index daily accuracy. */

/** Formal published directions only. */
export type MemberStockPrimaryDirection =
  | "明显上涨"
  | "震荡偏涨"
  | "区间震荡"
  | "震荡偏跌"
  | "明显下跌"
  | "先涨后跌"
  | "先跌后涨";

/** @deprecated Prefer MemberStockPrimaryDirection — kept for legacy display mapping */
export type MemberStockDirection = MemberStockPrimaryDirection | "上涨" | "下跌" | "震荡上涨" | "震荡下跌" | "探底回升" | "冲高回落";

export type MemberStockClosingBias =
  | "偏涨"
  | "略偏上涨"
  | "中性"
  | "略偏下跌"
  | "偏跌"
  | "偏弱";

export type MemberStockPublishStatus = "draft" | "internal_review" | "published" | "archived";

export type MemberStockRiskLevel = "低" | "中等" | "中高" | "高";

export type MemberStockVerificationStatus =
  | "pending"
  | "hit"
  | "miss"
  | "void"
  | "manual_review"
  | "not_eligible";

export type MemberBenefitStock = {
  stockId: string;
  name: string;
  symbol: string;
  market: string;
  marketLabel: string;
  tags: string[];
  listingDate: string;
  quoteSymbol: string;
  existingRating?: string;
  status: "online" | "hidden";
  sourceLabel: string;
};

export type MemberStockDailyForecast = {
  id: string;
  stockId: string;
  forecastDate: string;
  role: "today" | "tomorrow";
  /** Public badge — e.g. 区间震荡，略偏上涨 */
  direction: string;
  primaryDirection: MemberStockPrimaryDirection;
  closingBias: MemberStockClosingBias;
  pathDirection: string;
  probabilities: { up: number; flat: number; down: number };
  headline: string;
  expectedPath: string;
  /** Numeric levels only; empty = hide on UI */
  keySupport: string[];
  keyResistance: string[];
  invalidation: string;
  confirmation?: string;
  riskNote?: string;
  riskLevel: MemberStockRiskLevel;
  confidence: number;
  publishedAt: string;
  updatedAt: string;
  status: MemberStockPublishStatus;
  visibility: "member";
  accuracyEligible: boolean;
  verificationStatus: MemberStockVerificationStatus;
  publicSourceLabel: string;
  sourceIds?: string[];
  internalNotes?: string;
  priceSnapshot?: import("@/lib/market-data/price-levels").ForecastPriceSnapshot;
  priceDataSourceLabel?: string;
  priceSnapshotAtLabel?: string;
};

export type MemberStockWeeklyAnalysis = {
  id: string;
  stockId: string;
  weekStart: string;
  weekEnd: string;
  overallDirection: string;
  primaryDirection: MemberStockPrimaryDirection;
  closingBias: MemberStockClosingBias;
  pathDirection: string;
  weeklyPath: string;
  headline: string;
  probabilities: { up: number; flat: number; down: number };
  strongWindow?: string;
  weakWindow?: string;
  keySupport: string[];
  keyResistance: string[];
  invalidation: string;
  confirmation?: string;
  riskNote?: string;
  riskLevel: MemberStockRiskLevel;
  confidence: number;
  publishedAt: string;
  updatedAt: string;
  status: MemberStockPublishStatus;
  visibility: "member";
  publicSourceLabel: string;
  sourceIds?: string[];
  internalNotes?: string;
  priceSnapshot?: import("@/lib/market-data/price-levels").ForecastPriceSnapshot;
  priceDataSourceLabel?: string;
  priceSnapshotAtLabel?: string;
};

export type MemberStockVerificationResult = {
  forecastId: string;
  stockId: string;
  forecastDate: string;
  predictedDirection: string;
  actualReturnPct: number;
  actualClose: number;
  previousClose: number;
  actualDirection: "上涨" | "下跌" | "震荡";
  verdict: "hit" | "miss" | "void" | "manual_review";
  verdictLabel: string;
  pathHit?: boolean;
  closingBiasHit?: boolean;
  reviewSummary: string;
  verifiedAt: string;
  dataSource: string;
  publishedAt: string;
};

export type MemberStockLockedCard = {
  stockId: string;
  name: string;
  symbol: string;
  marketLabel: string;
  tags: string[];
  analysisReady: boolean;
  locked: true;
};

export type MemberStockDailyMemberView = Omit<
  MemberStockDailyForecast,
  "sourceIds" | "internalNotes"
>;

export type MemberStockWeeklyMemberView = Omit<
  MemberStockWeeklyAnalysis,
  "sourceIds" | "internalNotes"
>;
