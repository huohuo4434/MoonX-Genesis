export type LocalizedResearchText = { zh: string; en: string };

export type MemberResearchMarket = {
  id: "US_BROAD" | "SP500" | "SOX" | "A_SHARES" | "BTC" | "HSTECH";
  label: LocalizedResearchText;
  qimenEnvironment: LocalizedResearchText;
  branchRiskBranches: Array<{ branch: LocalizedResearchText; dates: never[] }>;
};

export type MemberResearchRadarPack = {
  id: string;
  ingestedAt: "2026-08-14";
  sourcePeriod: { start: "2026-08-17"; end: "2026-08-22" };
  sourcePublishedAt: null;
  verificationStatus: "UNVERIFIED_SOURCE_CLAIM";
  executionAuthority: "RESEARCH_ONLY";
  consensusEligible: false;
  qimenRole: LocalizedResearchText;
  markets: MemberResearchMarket[];
  stone: {
    role: LocalizedResearchText;
    currentSignal: null;
    frameworkChain: string[];
    sourceClaims: LocalizedResearchText[];
    mooxInterpretation: LocalizedResearchText[];
    verificationNote: LocalizedResearchText;
  };
};
