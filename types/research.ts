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
  verificationEligibility?: "formal" | "provisional";
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
  tags: string[];
  /** Groups records published together as part of a named research collection. */
  collectionId?: string;
  /** Long-range speculative scenarios (multi-year) are styled/labeled distinctly. */
  isLongRange?: boolean;
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
