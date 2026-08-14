export type ChanDirection = "BULL" | "BEAR" | "NEUTRAL";
export type ChanAction = "BUY_CANDIDATE" | "SELL_CANDIDATE" | "HOLD" | "TAKE_PROFIT" | "DO_NOT_CHASE" | "WAIT";
export type ChanTimeframe = "5m" | "30m" | "1H" | "4H" | "1D" | "1W";

export type ChanCandle = { timestamp: number; open: number; high: number; low: number; close: number; volume: number | null };
export type ChanFractal = { index: number; timestamp: number; kind: "TOP" | "BOTTOM"; price: number };
export type ChanStroke = { startIndex: number; endIndex: number; startPrice: number; endPrice: number; direction: "UP" | "DOWN"; complete: boolean };
export type ChanSegment = { startStroke: number; endStroke: number; direction: "UP" | "DOWN"; complete: boolean };
export type ChanZone = { startStroke: number; endStroke: number; low: number; high: number };
export type ChanStructure = {
  sufficient: boolean;
  normalizedCandles: ChanCandle[];
  fractals: ChanFractal[];
  strokes: ChanStroke[];
  segments: ChanSegment[];
  zones: ChanZone[];
  trendState: "INCOMPLETE" | "NEAR_COMPLETE" | "COMPLETE";
  divergence: boolean;
  divergenceEvidence: { priceExtended: boolean; momentumContracted: boolean; zoneConfirmed: boolean; segmentComplete: boolean };
  buyPoint: "NONE" | "FIRST_RESEARCH" | "SECOND" | "THIRD";
  sellPoint: "NONE" | "FIRST" | "SECOND" | "THIRD";
  riskLevels: {
    long: { invalidation: number; tp1: number; tp2: number; breakevenTrigger: number } | null;
    short: { invalidation: number; tp1: number; tp2: number; breakevenTrigger: number } | null;
  };
};

export type ChanExecutionInputs = {
  authoritativeDirection: ChanDirection;
  directionConflict: boolean;
  structure: ChanStructure;
  chanScore: number | null;
  qiaoqiaoScore: number | null;
  marketFlowScore: number | null;
  nanaScore: number | null;
  liquidityEventScore: number | null;
  atTopZone: boolean;
  standardPullback: boolean;
};

export type ChanExecutionDecision = {
  action: ChanAction;
  feasibilityScore: number | null;
  direction: ChanDirection;
  hardWaitReasons: string[];
  explanation: string;
  weights: { chan: 35; qiaoqiao: 20; marketFlow: 15; nana: 15; liquidityEvent: 15 };
  executionAuthority: "RESEARCH_ONLY";
  tradingEligible: false;
};

export type ChanMultiTimeframeFrame = {
  timeframe: Extract<ChanTimeframe, "30m" | "1H" | "4H" | "1D">;
  structure: ChanStructure;
  error: string | null;
};

export type ChanMultiTimeframeDecision = {
  action: "BUY_CANDIDATE" | "SELL_CANDIDATE" | "WAIT";
  authoritativeDirection: ChanDirection;
  reasons: string[];
  technicalBias: "BULL" | "BEAR" | "MIXED" | "NONE";
  chanWeight: 35;
  chanContribution: number;
  confirmation: number | null;
  invalidation: number | null;
  timeframeSignals: Array<{
    timeframe: ChanMultiTimeframeFrame["timeframe"];
    signal: "BULL" | "BEAR" | "NONE";
    complete: boolean;
    available: boolean;
  }>;
  executionAuthority: "RESEARCH_ONLY";
  tradingEligible: false;
};

export type ChanSourceEvidencePack = { version: "2026-08-14.v1"; sourceArtifacts: Array<{ id: "COURSE_ZIP" | "SPY_SCREENSHOT"; name: string; sourcePublishedAt: null }>; executionAuthority: "RESEARCH_ONLY"; tradingEligible: false; transcribedLessons: 12; transcriptRange: "2026-07-06..2026-08-13"; untranscribedAudioClaimedLearned: false; mooxPolicy: string; notes: Array<{ source: "WOLF" | "NANA" | "GAOSHAN"; sourceArtifact: "COURSE_ZIP" | "SPY_SCREENSHOT"; claim: string; status: "TEACHER_CLAIM_PENDING" }> };
