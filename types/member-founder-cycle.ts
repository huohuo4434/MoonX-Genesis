export type FounderCycleVerificationStatus = "UNVERIFIED_SOURCE_CLAIM" | "TEACHER_CLAIM_PENDING";

export type LocalizedText = { zh: string; en: string };

export type FounderCycleClaim = {
  id: string;
  category: "BAZI_STRUCTURE" | "ZIWEI_CROSS_CHECK" | "CYCLE_WINDOW" | "HISTORICAL_BACKTEST";
  verificationStatus: FounderCycleVerificationStatus;
  teacherClaim: LocalizedText;
  mooxInterpretation: LocalizedText;
};

export type FounderCycleCase = {
  id: "JENSEN_HUANG" | "ELON_MUSK";
  name: LocalizedText;
  assumedBazi: string;
  birthInput: LocalizedText | null;
  calibrationStatus: LocalizedText;
  structureTags: LocalizedText[];
  claims: FounderCycleClaim[];
};

export type FounderInfluenceScorePolicy = {
  status: "MOOX_PROVISIONAL";
  displayOnly: true;
  reviewThreshold: 75;
  thresholdSource: LocalizedText;
  description: LocalizedText;
  thresholds: Array<{ min: number; label: LocalizedText; displayMeaning: LocalizedText }>;
};

export type MemberFounderCyclePack = {
  schemaVersion: "2026-08-14.v1";
  title: LocalizedText;
  sourceArtifact: "黄仁勋马斯克.zip";
  ingestedAt: "2026-08-14";
  sourcePublishedAt: null;
  verificationStatus: FounderCycleVerificationStatus;
  executionAuthority: "RESEARCH_ONLY";
  consensusEligible: false;
  tradingEligible: false;
  archiveNotice: LocalizedText;
  methodology: Array<{ title: LocalizedText; description: LocalizedText }>;
  cases: FounderCycleCase[];
  influenceScorePolicy: FounderInfluenceScorePolicy;
};
