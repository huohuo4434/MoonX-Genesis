export type FocusDossierEvidenceStatus = "READY" | "INCOMPLETE" | "MISSING";

export type FocusDossierDay = {
  date: string;
  state: "OCCURRED" | "TODAY" | "PENDING" | "MISSING";
  direction: string | null;
  summary: string;
  confirmation: string | null;
  invalidation: string | null;
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
  } | null;
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
