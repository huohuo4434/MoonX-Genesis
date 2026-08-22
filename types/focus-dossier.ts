import type { FocusQimenParallelView } from "@/lib/forecasts/focus-qimen-multihorizon";

export type FocusDossierEvidenceStatus = "READY" | "INCOMPLETE" | "MISSING";

export type FocusKeyDayEvidence = {
  date: string;
  type: "LIUYAO" | "QIMEN" | "BAZI" | "TECHNICAL" | "ADMIN";
  label: string;
};

export type FocusAuxiliaryEvidenceView = {
  closedMarketData: "AVAILABLE" | "UNAVAILABLE";
  chan: "AVAILABLE" | "UNAVAILABLE";
  chanTimeframes: Array<"1H" | "4H" | "1D">;
  chanStage: string | null;
  technical: string | null;
  macroNews: string | null;
  note: string;
};

export type FocusBackgroundHorizon = {
  forecastType: string;
  periodStart: string;
  periodEnd: string;
  conclusion: string;
  version: number;
  dailyPath: FocusDossierDay[];
};

export type FocusDossierDay = {
  date: string;
  state: "OCCURRED" | "TODAY" | "PENDING" | "MISSING";
  direction: string | null;
  summary: string;
  rhythmDirection?: string | null;
  rhythmSummary?: string | null;
  confirmation: string | null;
  invalidation: string | null;
  sourceKind?: "TEACHER_DAILY" | "MOOX_WEEK_DERIVED" | "MOOX_PERIOD_DERIVED" | "MOOX_ROLLING_REVISION" | null;
  version?: number | null;
  asOfDate?: string | null;
  rollingReason?: string | null;
  keyDayEvidence?: FocusKeyDayEvidence[];
  auxiliaryEvidence?: FocusAuxiliaryEvidenceView | null;
};

export type FocusSupplementalEvidence = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: "LATE_INGESTED_SOURCE" | "SOURCE_GAP" | "FORWARD_AUXILIARY";
  executionAuthority: "RESEARCH_ONLY";
  sourceArtifact: string;
  sourcePublishedAt: string | null;
  lockedAt: string | null;
  summary: string | null;
  gapNote: string | null;
  includedInHistoricalHitRate: false;
};

export type FocusDossierView = {
  executionAuthority: "RESEARCH_ONLY";
  tradingEligible: false;
  assetId: string;
  asOfDate: string;
  evidenceStatus: FocusDossierEvidenceStatus;
  reportSchemaVersion: "2026-08-15.v1" | "2026-08-19.v2";
  dailyAuthority: {
    forecastId: string;
    forecastType: string;
    direction: string;
    sourcePeriodStart: string;
    sourcePeriodEnd: string;
    displayPeriodStart: string;
    displayPeriodEnd: string;
    version: number;
  } | null;
  weeklyAuthority: {
    direction: string;
    periodStart: string;
    periodEnd: string;
    version: number;
  } | null;
  backgroundHorizons: FocusBackgroundHorizon[];
  statusLabel: string;
  conclusion: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dailyPath: FocusDossierDay[];
  dailyAuditRows: Array<{
    forecastDate: string;
    version: number;
    direction: string;
    path: string;
    validationStatus: string | null;
    publishedAt: string | null;
    previousVersionId: string | null;
    sourceKind: "TEACHER_DAILY" | "MOOX_WEEK_DERIVED" | "MOOX_PERIOD_DERIVED" | "MOOX_ROLLING_REVISION" | null;
    revisionReason: string | null;
    qimenEvidence: string | null;
  }>;
  supportLevels: string[];
  resistanceLevels: string[];
  confirmation: string | null;
  invalidation: string | null;
  occurred: string[];
  pendingVerification: string[];
  nextWeek: {
    periodStart: string;
    periodEnd: string;
    conclusion: string;
    dailyEvidenceReady: boolean;
    dailyPath: FocusDossierDay[];
    supportLevels: string[];
    resistanceLevels: string[];
    confirmation: string | null;
    invalidation: string | null;
    version: number;
    source: string;
    lockedAt: string;
  } | null;
  displayScope: "CURRENT_PERIOD" | "NEXT_PERIOD_READY" | "MONTH_ONLY" | "MISSING";
  weeklyEvidenceStatus: "READY" | "MISSING";
  dailyEvidenceStatus: FocusDossierEvidenceStatus;
  monthlyEvidence: {
    periodStart: string;
    periodEnd: string;
    conclusion: string;
    version: number | null;
    source: string | null;
    lockedAt: string | null;
  } | null;
  supplementalEvidence: FocusSupplementalEvidence[];
  version: number | null;
  publicationStatus: "PUBLISHED" | "MISSING";
  lockStatus: "LOCKED" | "LOCK_NOT_PROVIDED" | "MISSING";
  lockedAt: string | null;
  source: string | null;
  longTermBackground: string | null;
  qimenParallel: FocusQimenParallelView;
};

/** Canonical member-facing Focus report DTO. The legacy dossier name remains as a compatibility alias. */
export type FocusDetailedReport = FocusDossierView;

export type FocusWeekPreparation = {
  assetId: string;
  targetStart: string;
  targetEnd: string;
  status: "READY" | "EVIDENCE_INCOMPLETE" | "AWAITING_FORMAL_EVIDENCE";
  forecastId: string | null;
  missingDates: string[];
};
