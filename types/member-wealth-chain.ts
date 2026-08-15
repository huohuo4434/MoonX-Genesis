export type WealthChainLocalizedText = { zh: string; en: string };

export type WealthChainTopic =
  | "AI_INFRASTRUCTURE"
  | "CAPITAL_CYCLE"
  | "MEMORY_CYCLE"
  | "MONETARY_POLICY"
  | "SECTOR_ROTATION"
  | "VALUATION"
  | "INVESTOR_DISCIPLINE";

export type WealthChainEpisode = {
  id: string;
  sourceVideoId: string;
  sourceContentSha256: string;
  sourceTranscriptFile: string;
  sourcePublishedAt: null;
  verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING";
  topics: WealthChainTopic[];
  assets: string[];
  horizon: WealthChainLocalizedText;
  title: WealthChainLocalizedText;
  thesis: WealthChainLocalizedText;
  evidenceToWatch: WealthChainLocalizedText[];
  confirmationSignals: WealthChainLocalizedText[];
  invalidationSignals: WealthChainLocalizedText[];
  portfolioUse: WealthChainLocalizedText;
};

export type WealthChainMemberEpisode = Omit<
  WealthChainEpisode,
  "sourceVideoId" | "sourceContentSha256" | "sourceTranscriptFile"
>;

export type MemberWealthChainPack = {
  schemaVersion: "2026-08-15.v1";
  ingestedAt: "2026-08-15";
  title: WealthChainLocalizedText;
  description: WealthChainLocalizedText;
  archiveNotice: WealthChainLocalizedText;
  executionAuthority: "RESEARCH_ONLY";
  consensusEligible: false;
  tradingEligible: false;
  episodeCount: 8;
  episodes: WealthChainEpisode[];
};

export type MemberWealthChainView = Omit<MemberWealthChainPack, "episodes"> & {
  episodes: WealthChainMemberEpisode[];
};
