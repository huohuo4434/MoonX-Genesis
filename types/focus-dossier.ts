export type FocusDossierEvidenceStatus = "READY" | "INCOMPLETE" | "MISSING";

export type FocusDossierDay = {
  date: string;
  state: "OCCURRED" | "TODAY" | "PENDING" | "MISSING";
  direction: string | null;
  summary: string;
  confirmation: string | null;
  invalidation: string | null;
};

export type FocusSupplementalEvidence = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: "LATE_INGESTED_SOURCE" | "SOURCE_GAP";
  executionAuthority: "RESEARCH_ONLY";
  sourceArtifact: string;
  sourcePublishedAt: null;
  lockedAt: null;
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
  statusLabel: string;
  conclusion: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dailyPath: FocusDossierDay[];
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
};

export type FocusWeekPreparation = {
  assetId: string;
  targetStart: string;
  targetEnd: string;
  status: "READY" | "EVIDENCE_INCOMPLETE" | "AWAITING_FORMAL_EVIDENCE";
  forecastId: string | null;
  missingDates: string[];
};
