/**
 * Core research data model for the MoonX Research Library, Consensus
 * Engine, Strategic Watchlist, and Timeline. See `lib/data/research-records.ts`,
 * `lib/data/strategic-watchlist.ts`, and `lib/research/consensus-engine.ts`
 * for the data and logic that consume these types.
 */
import type { LocalizedText } from "@/lib/i18n/config";

export type ResearchMarket =
  | "crypto"
  | "us-equity"
  | "china-equity"
  | "hong-kong-equity"
  | "commodity"
  | "index"
  | "semiconductor";

export type ResearchFramework =
  | "oracle-six-yao"
  | "qimen"
  | "cycle"
  | "gann"
  | "harmonic"
  | "chan"
  | "market-flow"
  | "macro"
  | "technical"
  | "internal";

export type ResearchSourceType = "private-teacher" | "public-analyst" | "internal-research" | "external-symbolic-analysis";

export type ResearchDirection =
  | "strong-bullish"
  | "bullish"
  | "slightly-bullish"
  | "neutral"
  | "slightly-bearish"
  | "bearish"
  | "strong-bearish"
  | "insufficient-evidence";

export type ResearchStatus =
  | "pending"
  | "active"
  | "partially-verified"
  | "verified"
  | "invalidated"
  | "archived";

export type ResearchVisibility = "draft" | "internal" | "public" | "archived";

/** A single named point or range within a forecast window (e.g. "Early-August rebound"). */
export interface ForecastWindow {
  id: string;
  /** ISO date for a single point-in-time window. Mutually exclusive with start/end. */
  date?: string;
  start?: string;
  end?: string;
  label: LocalizedText;
  note?: LocalizedText;
}

export interface ResearchRecord {
  id: string;
  publishedAt: string;
  accessLevel?: "public" | "member";
  memberAvailableAt?: string;
  publicAvailableAt?: string;
  previewSummary?: LocalizedText;
  memberContent?: LocalizedText[];
  expiresAt?: string;
  /** Short-lived external observations must not affect long-horizon consensus. */
  excludeFromLongTermConsensus?: boolean;
  sourcePublishedAt?: string | null;
  sourcePublishedAtVerified?: boolean;
  ingestedAt?: string;
  verificationEligibility?: "formal" | "forward-audio" | "provisional";
  retrospectiveNotes?: LocalizedText[];
  sourceSymbol?: string;
  sourceAssetId?: string;
  appliedAssetId?: string;
  mappingType?: "correlated_asset_timing_proxy";
  mappingConfidence?: "low" | "low_to_medium";
  derivedFromWeeklyPath?: boolean;
  forecastStart?: string;
  forecastEnd?: string;
  assetId: string;
  assetName: LocalizedText;
  symbol?: string;
  market: ResearchMarket;
  framework: ResearchFramework;
  sourceType: ResearchSourceType;
  /** Internal-only source reference (e.g. a private handle). Never render on public UI. */
  internalSourceRef?: string;
  /** Anonymous, public-safe attribution (e.g. "Public Analyst 03", "Oracle Research"). */
  publicSourceLabel: LocalizedText;
  direction: ResearchDirection;
  /** 0-100 editorial confidence assigned by MoonX research, not a statistical measure. */
  editorialConfidence: number;
  /** Whether this record is eligible for inclusion in the Consensus Engine. */
  consensusEligible: boolean;
  horizon: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  thesis: LocalizedText[];
  catalysts?: LocalizedText[];
  risks?: LocalizedText[];
  supports?: number[];
  resistances?: number[];
  targets?: number[];
  invalidation?: LocalizedText;
  turningWindows?: ForecastWindow[];
  verificationChecklist?: LocalizedText[];
  status: ResearchStatus;
  /** Public library visibility — only `public` appears in open research lists. */
  visibility?: ResearchVisibility;
  tags: string[];
  /** Groups records published together as part of a named research collection. */
  collectionId?: string;
  /** Long-range speculative scenarios (multi-year) are styled/labeled distinctly. */
  isLongRange?: boolean;
  /** Forecast hierarchy for homepage / weekly edition wiring. */
  layer?: "strategic" | "tactical" | "execution";
  parentRecordId?: string;
  derivedFromRecordIds?: string[];
  sourceStatus?: "raw_source_saved" | "summary_only" | "source_image_pending_relink";
  /** Original teacher / source text kept separate from MoonX interpretation. */
  rawSource?: LocalizedText;
  moonxInterpretation?: LocalizedText;
  hexagramPrimary?: LocalizedText;
  hexagramChanged?: LocalizedText;
  movingLinesNote?: LocalizedText;
  /** Structured, forward-locked interpretation extracted from supplied audio/transcript. */
  verbalForecastEvidence?: {
    sourceMode: "AUDIO_TRANSCRIPT";
    interpretation: string;
    confirmation: string;
    invalidation: string;
  };
  /** Stable alias IDs used by curated import docs (do not duplicate cards). */
  aliases?: string[];
  /** Editorial research score (0–100) when distinct from confidence framing. */
  researchScore?: number;
  ratingDisplay?: LocalizedText;
  researchAttribute?: LocalizedText;
  trendConsistency?: { score: number; max: number; note: LocalizedText };
  shortHorizonSummary?: LocalizedText;
  mediumHorizonSummary?: LocalizedText;
  disclaimer?: LocalizedText;
  /** Anonymous public source profile id (never expose real name). */
  sourceProfileId?: string;
  /** Qualitative source reliability — not a statistical hit rate. */
  sourceReliability?: {
    overall?: LocalizedText;
    strengths?: LocalizedText[];
    weaknesses?: LocalizedText[];
    note?: LocalizedText;
    methods?: LocalizedText[];
  };
  /** Structured hexagram evidence (optional; keeps legacy hexagramPrimary/Changed). */
  hexagramDetail?: {
    primary?: LocalizedText;
    mutual?: LocalizedText;
    transformed?: LocalizedText;
    movingLine?: number;
    worldLine?: LocalizedText;
    responseLine?: LocalizedText;
    movingLines?: Array<{
      from: LocalizedText;
      to: LocalizedText;
      sixSpirit: LocalizedText;
      interpretation: LocalizedText;
      verificationStatus?: "verified" | "pending-human-review";
    }>;
    structureNotes?: LocalizedText[];
  };
  /** Editorial scenario weights (0–100); not statistical probabilities. */
  scenarios?: Array<{
    name: LocalizedText;
    probability: number;
    description?: LocalizedText;
    start?: string;
    end?: string;
  }>;
  /** Pending technical levels when six-yao does not supply prices. */
  levelsPendingLabel?: LocalizedText;
  /** Actual-result / verification payload for completed weeks. */
  verificationResult?: {
    actualDirection?: LocalizedText;
    actualChangePct?: number;
    actualClose?: number;
    dailyResults?: Array<{ date: string; changePct: number; close: number }>;
    conclusion?: LocalizedText;
    scoreEligible?: boolean;
    scoreNote?: LocalizedText;
  };
  /** Hide from homepage today / weekly strips when true. */
  excludeFromHomeViews?: boolean;
  /** Month-branch activation chain for annual six-yao outlooks. */
  monthlyActivation?: Array<{
    period: string;
    earthlyBranch: string;
    mechanism: string;
    expectedEffect: string;
    signalDirectness: "直接" | "半直接" | "间接";
    reliability: "高" | "中高" | "中" | "中低" | "低";
  }>;
  /** Risk-nature research (not a price-direction call). */
  researchKind?: "price" | "risk" | "verification-review";
  /** Surface on strategic watchlist when true. */
  watchlistEligible?: boolean;
  /** Forward-looking bias within a longer annual path. */
  forwardDirection?: LocalizedText;
  riskAssessment?: {
    systemicRisk?: LocalizedText;
    nonSystemicEventRisk?: LocalizedText;
    primaryRisks?: LocalizedText[];
  };
  annualPath?: Array<{
    start: string;
    end: string;
    direction: LocalizedText;
    title: LocalizedText;
    description?: LocalizedText;
  }>;
  verificationStages?: Array<{
    title: LocalizedText;
    status: VerificationStageStatus;
    verificationStart?: string;
    verificationEnd?: string;
    note?: LocalizedText;
  }>;
  /** Mid-term path segments (e.g. oil six-yao phases). */
  expectedPath?: Array<{
    start: string;
    end: string;
    direction: LocalizedText;
    title: LocalizedText;
    description?: LocalizedText;
  }>;
  /** Named price scenarios with editorial probability weights. */
  priceScenarios?: Array<{
    name: LocalizedText;
    probability: number;
    range?: LocalizedText;
    description?: LocalizedText;
  }>;
  relatedRecordIds?: string[];
  notes?: LocalizedText[];
  verificationDate?: string;
  forecastType?: LocalizedText;
  category?: LocalizedText;
  /** Technical confirmation checklist (not auto-scored). */
  technicalConfirmation?: LocalizedText[];
  /** Human review gate — records with pending status must not enter forecasts until approved. */
  humanReviewStatus?: "pending-review" | "approved";
  humanReviewChecklist?: {
    screenshotVerified?: boolean;
    sixRelativesVerified?: boolean;
    worldResponseVerified?: boolean;
    movingLinesVerified?: boolean;
    transformedLinesVerified?: boolean;
    monthDayStrengthVerified?: boolean;
    factorScoresVerified?: boolean;
    cycleComparisonVerified?: boolean;
  };
  /** Redacted public attachment metadata (no personal info on public UI). */
  attachments?: Array<{
    id: string;
    divinationAt: string;
    question: LocalizedText;
    redactedImageUrl?: string;
    adminOriginalStored?: boolean;
  }>;
  /** Optional link to structured Liu Yao factor analysis id. */
  liuYaoFactorAnalysisId?: string;
  /**
   * Cross-record comparison metadata (admin / engine only).
   * Never surface long-horizon comparison details on public pages.
   */
  comparison?: {
    comparedRecordIds: string[];
    earlyStageAlignment: "高" | "中" | "低";
    earlyStageNotes?: LocalizedText;
    laterStageStatus: string;
    laterStageNotes?: LocalizedText;
    adminNote?: LocalizedText;
  };
  /** Forecast-engine weight gates for staged mid/long research. */
  engineUsage?: {
    earlyStage: {
      start: string;
      end: string;
      maxWeightPct: number;
      allowedAsBackground: boolean;
    };
    laterStage: {
      start: string;
      end: string;
      maxWeightPct: number;
      adminRiskOnly: boolean;
    };
  };
  /** Editorial publish gate distinct from ResearchStatus (e.g. internal_review). */
  publishGate?: "internal_review" | "approved" | "blocked";
  /**
   * Admin-only long-term forecast candlestick payload.
   * Must never be returned by public/member APIs or embedded in public HTML.
   */
  forecastChart?: import("@/types/long-term-forecast-chart").LongTermForecastChart;
}

export type LiuYaoFactorDirection = "利多" | "略偏多" | "中性" | "略偏空" | "利空";

export interface LiuYaoFactorScore {
  id: string;
  label: LocalizedText;
  score: number;
  maxScore: 5;
  direction: LiuYaoFactorDirection;
  explanation: LocalizedText;
  evidence: LocalizedText[];
}

export interface LiuYaoFactorAnalysis {
  recordId: string;
  primaryUseGod: LocalizedText;
  secondaryUseGod?: LocalizedText;
  useGodReason: LocalizedText;
  factors: {
    wealth: LiuYaoFactorScore;
    offspring: LiuYaoFactorScore;
    siblings: LiuYaoFactorScore;
    officials: LiuYaoFactorScore;
    parents: LiuYaoFactorScore;
    worldResponse: LiuYaoFactorScore;
    movement: LiuYaoFactorScore;
    timing: LiuYaoFactorScore;
  };
  volatilityScore: number;
  trendScore: number;
  finalDirection: LocalizedText;
  confidence: number;
  warnings: LocalizedText[];
}

export interface CycleAlignment {
  id: string;
  assetId: string;
  records: Array<{
    recordId: string;
    period: LocalizedText;
    direction: LocalizedText;
    confidence: number;
  }>;
  alignmentScore: number;
  conclusion: LocalizedText;
  conflictNotes?: LocalizedText[];
  scoreDisclaimer: LocalizedText;
}

export type ResearchConflictStatus = "观察中" | "已裁决" | "仍有分歧";

/** Cross-framework disagreement for a single asset — never averages opposing views. */
export interface ResearchConflict {
  id: string;
  assetId: string;
  title: LocalizedText;
  status: ResearchConflictStatus;
  records: Array<{
    recordId: string;
    framework: LocalizedText;
    direction: LocalizedText;
    summary: LocalizedText;
  }>;
  resolutionWindow: { start: string; end: string };
  bullishConfirmation: LocalizedText[];
  bearishConfirmation: LocalizedText[];
  currentMoonXView: LocalizedText;
  resolvedRecordId?: string;
}

/** Staged verification for multi-window annual research — never mark full-year hit early. */
export type VerificationStageStatus =
  | "待回填验证"
  | "待验证"
  | "阶段命中"
  | "阶段部分命中"
  | "阶段未命中"
  | "已失效";

/** Anonymous public source profile for public display. */
export interface SourceProfile {
  id: string;
  label: LocalizedText;
  sourceType: LocalizedText;
  anonymity: true;
  sourceReliability: {
    overall: LocalizedText;
    strengths: LocalizedText[];
    weaknesses: LocalizedText[];
    note: LocalizedText;
    /** Optional methodology bullets for private mentors. */
    methods?: LocalizedText[];
  };
}

/** A named grouping of related records, e.g. "China Equity Long-Range Scenario — H2 2026". */
export interface ResearchCollection {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  frameworks: ResearchFramework[];
  sourceType: ResearchSourceType;
  publishedAt: string;
  forecastStart?: string;
  forecastEnd?: string;
}

export type WatchlistRating = "bullish" | "neutral" | "bearish";

export type WatchlistStatus = "pre-ipo-watch" | "ipo-strategic-watch" | "active" | "high-volatility-watch";

export interface WatchlistEntry {
  id: string;
  assetName: LocalizedText;
  symbol: string;
  rating: WatchlistRating;
  ratingNote?: LocalizedText;
  status: WatchlistStatus;
  horizon: LocalizedText;
  mainTheme: LocalizedText[];
  thesis: LocalizedText;
  risks: LocalizedText[];
  nextEvent: LocalizedText;
  nextEventDate?: string;
  /** Number of Research Library records covering this asset (drives the "Research Coverage" stat). */
  researchAssetId: string;
  /** Optional additional metadata surfaced on the card (e.g. IPO price, market). */
  meta?: { labelKey: string; value: LocalizedText }[];
  warning?: LocalizedText;
}

export type TimelineCategory =
  | "crypto"
  | "us-equity"
  | "china-equity"
  | "hong-kong-equity"
  | "semiconductor"
  | "commodity"
  | "oracle"
  | "qimen"
  | "cycle";

export type TimelineVerificationState = "verified" | "pending";

export interface TimelineEvent {
  id: string;
  date?: string;
  start?: string;
  end?: string;
  title: LocalizedText;
  description?: LocalizedText;
  categories: TimelineCategory[];
  verification: TimelineVerificationState;
  isLongRange?: boolean;
}
