export type ThreeHorizonStrategyType = "INTRADAY" | "SWING" | "POSITION";
export type ThreeHorizonStrategyMode = "SHADOW" | "DEMO" | "LIVE";
export type ThreeHorizonDirection = "LONG" | "SHORT" | "NEUTRAL";
export type ThreeHorizonDecisionStatus =
  | "OBSERVING"
  | "READY"
  | "SHADOW_READY"
  | "BLOCKED"
  | "ORDER_SUBMITTED"
  | "OPEN"
  | "PARTIAL"
  | "CLOSING"
  | "CLOSED"
  | "EXPIRED"
  | "ERROR";

export type ThreeHorizonCondition = {
  key: string;
  label: string;
  met: boolean;
  value: string;
  weight: number;
};

export type ThreeHorizonStrategyProfile = {
  strategyType: ThreeHorizonStrategyType;
  label: string;
  description: string;
  enabled: boolean;
  mode: ThreeHorizonStrategyMode;
  symbols: string[];
  environmentTimeframe: string;
  directionTimeframe: string;
  entryTimeframe: string;
  scanIntervalMinutes: number;
  riskPerTradePct: number;
  maxHoldingMinutes: number;
  planningMinConfidence: number;
  minConfidence: number;
  maxTradesPerDay: number;
  lastScanAt: string | null;
  updatedAt: string;
};

export type ThreeHorizonRiskSnapshot = {
  equityUsdt: number | null;
  dailyNetPnlUsdt: number;
  weeklyNetPnlUsdt: number;
  dailyLossPct: number;
  weeklyLossPct: number;
  openRiskPct: number;
  cryptoGroupRiskPct: number;
  consecutiveLosses: number;
  dailyLossLimitPct: number;
  weeklyLossLimitPct: number;
  openRiskLimitPct: number;
  cryptoGroupRiskLimitPct: number;
  blocked: boolean;
  blockReason: string;
};

export type ThreeHorizonStrategyDecision = {
  id: string;
  runId: string;
  planId: string | null;
  strategyType: ThreeHorizonStrategyType;
  strategyLabel: string;
  mode: ThreeHorizonStrategyMode;
  symbol: string;
  status: ThreeHorizonDecisionStatus;
  direction: ThreeHorizonDirection;
  confidence: number;
  technicalScore: number;
  forecastScore: number;
  conditionsMet: number;
  conditionsTotal: number;
  conditions: ThreeHorizonCondition[];
  rejectionCode: string;
  rejectionReason: string;
  currentPrice: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  quantity: number | null;
  riskAmountUsdt: number | null;
  riskPct: number | null;
  maxHoldingUntil: string | null;
  expiresAt: string | null;
  clientOid: string | null;
  bitgetOrderId: string | null;
  protectionOrderId: string | null;
  openedAt: string | null;
  closedAt: string | null;
  realizedPnlUsdt: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ThreeHorizonStrategyStats = {
  strategyType: ThreeHorizonStrategyType;
  scansToday: number;
  symbolsEvaluatedToday: number;
  readyToday: number;
  shadowReadyToday: number;
  blockedToday: number;
  orderAttemptsToday: number;
  openedToday: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  netPnlUsdt: number;
  averageR: number | null;
};

export type ThreeHorizonStrategyDashboard = {
  databaseReady: boolean;
  generatedAt: string;
  executionEnvironmentAllowed: boolean;
  executionSafetyNotice: string;
  profiles: ThreeHorizonStrategyProfile[];
  risk: ThreeHorizonRiskSnapshot;
  latestDecisions: ThreeHorizonStrategyDecision[];
  stats: ThreeHorizonStrategyStats[];
};

export type ThreeHorizonRunReport = {
  ok: boolean;
  runId: string;
  source: "CRON" | "ADMIN" | "SYSTEM";
  startedAt: string;
  finishedAt: string;
  scannedStrategies: ThreeHorizonStrategyType[];
  decisions: ThreeHorizonStrategyDecision[];
  managedOpenDecisions: number;
  orderAttempts: number;
  orderSuccess: number;
  orderErrors: number;
  message: string;
};

export type ThreeHorizonPublicStrategy = {
  strategyType: ThreeHorizonStrategyType;
  label: string;
  description: string;
  enabled: boolean;
  mode: ThreeHorizonStrategyMode;
  modeLabel: string;
  holdingLabel: string;
  timeframeLabel: string;
  riskPerTradePct: number;
  lastScanAt: string | null;
  stats: ThreeHorizonStrategyStats;
  decisions: ThreeHorizonStrategyDecision[];
};
