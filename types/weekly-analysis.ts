/** Member weekly market analysis — separate from daily accuracy. */

export type WeeklyOverallDirection =
  | "上涨"
  | "下跌"
  | "震荡"
  | "震荡上涨"
  | "震荡下跌"
  | "先涨后跌"
  | "先跌后涨"
  | "探底回升"
  | "冲高回落"
  | "暂无判断"
  | "观望";

export type WeeklyAnalysisStatus = "draft" | "internal_review" | "published" | "archived";

export type WeeklyVisibility = "member" | "admin" | "internal";

export type WeeklyRiskLevel = "低" | "中等" | "中高" | "高";

export type WeeklyBasisWeights = {
  technical: number;
  liuyao: number;
  cycle: number;
  qimen: number;
  macro: number;
  bazi: number;
  /** Human-readable explanation of how the source was used. */
  note?: string;
};

export type WeeklyAnalysisRevision = {
  version: number;
  previousContent: string;
  changedAt: string;
  reason: string;
};

/**
 * Curated, member-safe explanation for a material pre-window revision.
 * This is intentionally separate from the full internal revision trail so
 * source ids, working notes and raw research never reach member clients.
 */
export type WeeklyMemberRevisionNotice = {
  changedAt: string;
  previousLabelZh: string;
  previousLabelEn: string;
  previousSummaryZh: string;
  previousSummaryEn: string;
  currentSummaryZh: string;
  currentSummaryEn: string;
  reasonZh: string;
  reasonEn: string;
};

export type WeeklyKeyDate = {
  /** Gregorian date in YYYY-MM-DD. Never expose only a stem/branch label. */
  date: string;
  label: string;
  expectedEffect: "上涨" | "下跌" | "转折" | "波动放大" | "企稳" | "冲高回落" | "探底回升";
  sources: Array<"LIUYAO" | "QIMEN" | "BAZI" | "TECHNICAL" | "MACRO">;
  confidence?: number;
  note?: string;
};

export type WeeklySourceOpinionKey =
  | "BINGWU_LIUYAO"
  | "WOLF_LIUYAO"
  | "USER_LIUYAO"
  | "QIMEN_TIMING";

/**
 * Immutable, pre-window source snapshot used only for forward attribution.
 *
 * A source id by itself is not enough to award a hit: the independent
 * direction/path must be captured before the target week. Qimen is timing-only
 * under the MOOX governance policy and therefore must not carry a direction.
 */
export type WeeklySourceOpinion = {
  sourceKey: WeeklySourceOpinionKey;
  sourceRecordId: string;
  role: "DIRECTION" | "TIMING";
  direction?: WeeklyOverallDirection;
  path?: string;
  keyDates?: string[];
  lockedAt: string;
};

export type WeeklyAnalysisRecord = {
  id: string;
  assetId: string;
  assetName: string;
  symbol: string;
  /** Public display code (e.g. SHCOMP, CL). */
  displaySymbol?: string;
  weekStart: string;
  weekEnd: string;
  overallDirection: WeeklyOverallDirection;
  weeklyPath: string;
  headline: string;
  probabilities: { up: number; flat: number; down: number };
  strongWindow?: string;
  weakWindow?: string;
  /** Key dates converted to exact Gregorian dates by CalendarService. */
  keyDates?: WeeklyKeyDate[];
  /** Editorial research influence. These are not statistical probabilities. */
  basisWeights?: WeeklyBasisWeights;
  keySupport?: string[];
  keyResistance?: string[];
  invalidation: string;
  confirmation?: string;
  catalysts?: string[];
  risks?: string[];
  priceSnapshot?: import("@/lib/market-data/price-levels").ForecastPriceSnapshot;
  priceDataSourceLabel?: string;
  priceSnapshotAtLabel?: string;
  riskLevel: WeeklyRiskLevel;
  confidence: number;
  publishedAt: string;
  updatedAt: string;
  status: WeeklyAnalysisStatus;
  visibility: WeeklyVisibility;
  /** Admin-only provenance. Never send to non-admin clients. */
  sourceIds?: string[];
  /** Admin-only forward snapshots. Never infer these after the target week starts. */
  sourceOpinions?: WeeklySourceOpinion[];
  version: number;
  originalLocked?: boolean;
  revisions?: WeeklyAnalysisRevision[];
  /** Explicitly curated version change that members may see. */
  memberRevisionNotice?: WeeklyMemberRevisionNotice;
};

/** Public-safe teaser — no direction / path / levels. */
export type WeeklyAnalysisTeaser = {
  id: string;
  assetId: string;
  assetName: string;
  symbol: string;
  displaySymbol?: string;
  weekStart: string;
  weekEnd: string;
  status: WeeklyAnalysisStatus;
  publishedAt: string;
  updatedAt: string;
  isReady: boolean;
};

/** Member-facing fields (no sourceIds). */
export type WeeklyAnalysisMemberView = Omit<WeeklyAnalysisRecord, "sourceIds" | "sourceOpinions" | "revisions">;

export type WeeklyAnalysisPublicSummary = {
  /** Saturday/Sunday automatically switch to the next Monday-Sunday window. */
  displayMode?: "CURRENT_WEEK" | "NEXT_WEEK";
  headingZh?: string;
  subtitleZh?: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  publishedAtLabel: string;
  lastUpdatedLabel: string;
  publishedCount: number;
  /** Canonical core coverage count. */
  coverageCount: number;
  assetNames: string[];
  teasers: WeeklyAnalysisTeaser[];
  nextPublishHint: string;
  /** Member-facing source blend note for the active weekly edition. */
  researchBlendNoteZh?: string;
  researchBlendNoteEn?: string;
  /** Optional historical source verification note; never rewrites the locked forecast. */
  sourceVerificationNoteZh?: string;
  sourceVerificationNoteEn?: string;
};

/** Slot for member page — published analysis or empty placeholder. */
export type WeeklyMarketSlot =
  | { kind: "published"; analysis: WeeklyAnalysisMemberView }
  | {
      kind: "unpublished";
      assetId: string;
      assetName: string;
      symbol: string;
      displaySymbol: string;
    };
