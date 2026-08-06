export const COMMITTEE_BUILDER_ROLE_IDS = [
  "MARKET_STRUCTURE",
  "LIUYAO_QIMEN",
  "MACRO_EVENT",
  "CONTRARIAN",
  "RISK",
] as const;

export const COMMITTEE_ROLE_IDS = [...COMMITTEE_BUILDER_ROLE_IDS, "REVIEWER"] as const;

export type CommitteeBuilderRoleId = (typeof COMMITTEE_BUILDER_ROLE_IDS)[number];
export type CommitteeRoleId = (typeof COMMITTEE_ROLE_IDS)[number];

export type CommitteeStance = "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED";
export type PublishDecision = "APPROVED" | "NEEDS_REVIEW" | "REJECTED";
export type CommitteeRunMode = "MODEL" | "PROMPT_PREVIEW";

export const COMMITTEE_EVIDENCE_LABELS = [
  "MARKET_CONTEXT",
  "TECHNICAL",
  "LIUYAO_QIMEN",
  "MACRO_EVENTS",
  "EXISTING_VIEW",
  "RISK_CONSTRAINTS",
  "SOURCE_NOTES",
] as const;

export type CommitteeEvidenceLabel = (typeof COMMITTEE_EVIDENCE_LABELS)[number];

export interface CommitteeInput {
  asset: string;
  symbol?: string;
  horizon: string;
  asOf: string;
  marketContext: string;
  technicalEvidence: string;
  liuyaoQimenEvidence: string;
  macroEvidence: string;
  existingView: string;
  riskConstraints: string;
  sourceNotes: string;
}

export interface CommitteeRoleOpinion {
  roleId: CommitteeBuilderRoleId;
  roleName: string;
  stance: CommitteeStance;
  confidence: number;
  thesis: string;
  evidenceRefs: CommitteeEvidenceLabel[];
  supportingPoints: string[];
  risks: string[];
  invalidation: string;
  proposedAction: string;
  dataGaps: string[];
}

export interface CommitteeReview {
  roleId: "REVIEWER";
  verdict: CommitteeStance;
  confidence: number;
  consensus: string;
  disagreements: string[];
  finalView: string;
  timeWindow: string;
  invalidation: string;
  riskPlan: string;
  publishDecision: PublishDecision;
  publishReason: string;
  unsupportedClaims: string[];
  nextChecks: string[];
}

export type VerificationGateSeverity = "INFO" | "WARNING" | "BLOCKER";

export interface VerificationGateResult {
  id: string;
  label: string;
  passed: boolean;
  severity: VerificationGateSeverity;
  message: string;
}

export interface CommitteePromptPreview {
  builderSystemPrompt: string;
  builderUserPrompt: string;
  reviewerSystemPrompt: string;
}

export interface CommitteeRun {
  id: string;
  inputHash: string;
  createdAt: string;
  model: string;
  mode: CommitteeRunMode;
  executionPolicy: "RESEARCH_ONLY";
  input: CommitteeInput;
  opinions: CommitteeRoleOpinion[];
  review: CommitteeReview | null;
  gates: VerificationGateResult[];
  promptPreview?: CommitteePromptPreview;
  saved: boolean;
}
