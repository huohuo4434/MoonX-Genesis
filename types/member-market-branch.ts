export type LocalizedMarketBranchText = {
  zh: string;
  en: string;
};

export type MemberMarketBranchNode = {
  dateRange: string;
  state: "WATCH" | "RISK" | "CONFIRM" | "INVALID";
  label: LocalizedMarketBranchText;
  condition: LocalizedMarketBranchText;
};

export type MemberMarketBranchAsset = {
  id: string;
  assetName: LocalizedMarketBranchText;
  symbol: string;
  venue: LocalizedMarketBranchText;
  stance: "BULLISH_AFTER_CONFIRMATION" | "WAIT_FOR_PULLBACK" | "HOLD_WITH_LEVELS";
  stanceLabel: LocalizedMarketBranchText;
  basePath: LocalizedMarketBranchText;
  decisionRule: LocalizedMarketBranchText;
  invalidation: LocalizedMarketBranchText;
  levels: LocalizedMarketBranchText[];
  nodes: MemberMarketBranchNode[];
};

export type MemberMarketBranchOutlook = {
  id: string;
  asOf: string;
  title: LocalizedMarketBranchText;
  subtitle: LocalizedMarketBranchText;
  integrityNote: LocalizedMarketBranchText;
  timingRule: LocalizedMarketBranchText;
  assets: MemberMarketBranchAsset[];
};
