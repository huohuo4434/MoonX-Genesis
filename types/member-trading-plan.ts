export type MemberTradingPlanState =
  | "LONG_READY"
  | "SHORT_READY"
  | "WAIT_CONFIRMATION"
  | "CONFLICT_WAIT"
  | "RISK_REDUCE"
  | "EXIT_OR_PROTECT"
  | "INVALID_LEVEL_GEOMETRY"
  | "INSTRUMENT_UNAVAILABLE"
  | "NO_AUTHORITY";

export type MemberTradingInstrument = {
  canonicalSymbol: string;
  displayName: string;
  assetClass: "CRYPTO" | "COMMODITY" | "EQUITY" | "ETF";
  bitgetSymbol: string | null;
  availability: "AVAILABLE" | "UNAVAILABLE";
  executionScope: "PAPER_LOCAL" | "RESEARCH_ONLY";
  discoveredAt: string;
};

export type MemberTradingPlan = {
  schema: "moonx.member.trading-plan.v1";
  planId: string;
  planGroupId: string;
  version: number;
  revisionId: string;
  symbol: string;
  instrument: MemberTradingInstrument;
  generatedAt: string;
  validUntil: string;
  state: MemberTradingPlanState;
  authority: {
    direction: "LONG" | "SHORT" | "NEUTRAL";
    horizon: "DAY" | "WEEK" | "MONTH" | null;
    forecastId: string | null;
    forecastVersion: string | null;
    publishedAt: string | null;
    lockedAt: string | null;
    validFrom: string | null;
    validUntil: string | null;
    valid: boolean;
  };
  chan: {
    action: "BUY_CANDIDATE" | "SELL_CANDIDATE" | "WAIT";
    technicalBias: "BULL" | "BEAR" | "MIXED" | "NONE";
    stage: string;
    stageLabel: string;
    confirmation: number | null;
    invalidation: number | null;
    reasons: string[];
    timeframes: Array<{
      timeframe: "30m" | "1H" | "4H" | "1D";
      available: boolean;
      complete: boolean;
      stage: string;
      stageLabel: string;
    }>;
  };
  execution: {
    levelStatus: "VALID" | "HIDDEN_NO_AUTHORITY" | "INVALID_LEVEL_GEOMETRY";
    currentPrice: number | null;
    entryZone: [number, number] | null;
    confirmationAboveOrBelow: number | null;
    stopLoss: number | null;
    takeProfits: [number, number, number] | null;
    triggerRule: string;
    invalidationRule: string;
    statusReason: string;
  };
  risk: {
    paperOnly: true;
    serverExecutionAllowed: false;
    memberLocalAgentEligible: boolean;
    tradingEligible: boolean;
    riskPerTradePct: number;
    maxPositionPct: number;
    leverageCap: number;
    allowScaleIn: false;
  };
  evidence: {
    formalPublishedPlanOnly: true;
    researchOnlyExcluded: true;
    sourcePlanContentHash: string;
  };
};

export type MemberPaperEvent = {
  id: string;
  positionId: string | null;
  sourcePlanId: string;
  sourcePlanVersion: number;
  eventType: "ENTER" | "EXIT";
  price: number;
  quantity: number;
  realizedPnl: number;
  createdAt: string;
};

export type MemberPaperAccount = {
  id: string;
  userId: string;
  initialCash: number;
  cashBalance: number;
  realizedPnl: number;
  unrealizedPnl: number;
  equity: number;
  peakEquity: number;
  maxDrawdownPct: number;
  paused: boolean;
  pauseReason: string;
  createdAt: string;
  updatedAt: string;
};

export type MemberPaperPosition = {
  id: string;
  sourcePlanId: string;
  sourcePlanVersion: number;
  symbol: string;
  direction: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfits: [number, number, number];
  realizedPnl: number;
  unrealizedPnl: number;
  openedAt: string;
  closedAt: string | null;
};

export type MemberPaperSnapshot = {
  schema: "moonx.member.paper.v1";
  generatedAt: string;
  account: MemberPaperAccount;
  positions: MemberPaperPosition[];
  events: MemberPaperEvent[];
};
