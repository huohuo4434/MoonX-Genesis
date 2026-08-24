/**
 * Next-trading-day / member daily forecast model.
 * Separate from homepage AssetForecastSummary and research library records.
 */

export type ForecastAccessLevel = "public" | "member" | "premium";

export type ForecastStatus =
  | "draft"
  | "reviewed"
  | "scheduled"
  | "published"
  | "revised"
  | "expired"
  | "verified";

export type DailyForecastMarket = "crypto" | "us" | "cn" | "hk" | "commodity";

export type DailyForecastDirection =
  | "强势看涨"
  | "看涨"
  | "略微看涨"
  | "中性"
  | "略微看跌"
  | "看跌"
  | "强势看跌";

export type ForecastHitGrade = "命中" | "部分命中" | "未命中" | "已失效" | "待验证";

export interface DailyForecastRevision {
  version: number;
  updatedAt: string;
  reason: string;
  previousDirection?: DailyForecastDirection;
  previousConfidence?: number;
}

export interface DailyForecastVerification {
  actualDirection?: string;
  actualChangePct?: number;
  hit?: boolean;
  hitGrade?: ForecastHitGrade;
  reviewNote?: string;
  verifiedAt?: string;
}

export interface DailyForecast {
  id: string;
  assetId: string;
  assetName: string;
  symbol: string;
  market: DailyForecastMarket;

  /** ISO date YYYY-MM-DD — the target market session date, not merely the publish day. */
  forecastForDate: string;
  /** Stable market-session key, e.g. US-2026-08-04. */
  targetSessionKey?: string;
  /** Exact human-facing target session including the date. */
  targetSessionLabel?: string;
  tradingSessionLabel: string;

  publishedAt: string;
  updatedAt?: string;
  /** When member content becomes publicly visible as "today". */
  publicAt?: string;
  verificationAt?: string;

  accessLevel: ForecastAccessLevel;
  status: ForecastStatus;
  version: number;

  direction: DailyForecastDirection;
  /** Display label when richer than enum (e.g. 震荡偏多 / 先抑后扬). */
  directionLabel?: string;
  confidence: number;

  /** Locked multi-method agreement rating. Stars describe agreement, not upside size. */
  consensusStars?: 1 | 2 | 3 | 4 | 5;
  consensusScore?: number;
  consensusLabel?: string;
  consensusModuleCount?: number;
  consensusNote?: string;

  headline?: string;
  summary: string;
  expectedPath?: string[];
  /** Intraday path semantics only; weekly language is normalized at display time. */
  pathBias?: string;
  intradayRhythm?: string[];
  signalStrength?: "低" | "中" | "高";
  waitForConfirmation?: boolean;
  marketRiskLevel?: "低" | "中" | "高";

  probabilities?: { up: number; flat: number; down: number };
  /** When false, shown on today page but excluded from daily accuracy. */
  accuracyEligible?: boolean;
  accuracyExclusionReason?: string;

  supportLevels?: string[];
  resistanceLevels?: string[];
  targetLevels?: string[];

  keyTimeWindows?: Array<{
    label: string;
    start?: string;
    end?: string;
    description: string;
  }>;

  catalysts?: string[];
  risks?: string[];
  invalidation?: string;
  /** Direction confirmation with concrete price + method */
  confirmation?: string;
  /** Locked market snapshot at publish time — never live-updated for history */
  priceSnapshot?: import("@/lib/market-data/price-levels").ForecastPriceSnapshot;
  priceDataSourceLabel?: string;
  priceSnapshotAtLabel?: string;

  /** Full auditable Qimen evidence persisted/overlaid by the daily research layer. */
  qimenEvidence?: string; // MOOX_QIMEN_DAILY_RESONANCE_V7201_TYPES
  /** Official daily view derived from the active, source-arbitrated weekly/stage Liuyao record. */
  liuyaoEvidence?: string;
  /** Short traditional-divination research phrase for compact UI display. */
  qimenMysticNote?: string;
  /** 奇六共振·信心提高 / 奇六分歧·两种观点并列 / 奇门独立验算. */
  qimenAgreementLabel?: string;
  qimenParallelDirection?: "UP" | "DOWN" | "SIDEWAYS" | string;
  liuyaoOfficialDirection?: string | null;
  /** @deprecated Compatibility only. Qimen is not the authority for official direction. */
  qimenPrimaryDirection?: "UP" | "DOWN" | "SIDEWAYS" | string;
  /** @deprecated Compatibility only. Liuyao is the official weekly/stage authority. */
  liuyaoAuxiliaryDirection?: string | null;
  directionConflict?: boolean;
  methodPriority?: string;

  evidenceRecordIds?: string[];
  correctionNote?: string;

  reviewedBy?: string;
  reviewedAt?: string;
  publishedBy?: string;

  revisionHistory?: DailyForecastRevision[];
  verificationResult?: DailyForecastVerification;
}

/** Public teaser — safe to serialize to non-member HTML. No direction/levels. */
export interface DailyForecastTeaser {
  id: string;
  assetId: string;
  assetName: string;
  symbol: string;
  market: DailyForecastMarket;
  forecastForDate: string;
  tradingSessionLabel: string;
  status: ForecastStatus;
  updatedAt?: string;
  publishedAt?: string;
  /** True when a reviewed/published forecast exists (not draft placeholder). */
  isReady: boolean;
}

export interface TomorrowForecastPublicSummary {
  nextDateLabel: string;
  nextDateIso: string;
  assetCount: number;
  assetNames: string[];
  lastUpdatedLabel: string;
  /** Human-reviewed and published (not draft/reviewed). */
  publishedCount: number;
  /** Draft slots planned for next session. */
  draftCount: number;
  /** All slots are still draft — show "预测草稿待人工审核". */
  allDraft: boolean;
  teasers: DailyForecastTeaser[];
}
