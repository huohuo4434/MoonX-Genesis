import type {
  ThreeHorizonCondition,
  ThreeHorizonDecisionStatus,
  ThreeHorizonDirection,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";

export type AiTradePlanTier = "CANDIDATE" | "FORMAL";
export type AiTradePlanStatus =
  | "PUBLISHED"
  | "WATCHING"
  | "ARMED"
  | "ORDER_SUBMITTED"
  | "PARTIALLY_FILLED"
  | "OPEN"
  | "REDUCED"
  | "CLOSED"
  | "CANCELLED"
  | "EXPIRED"
  | "INVALIDATED"
  | "SUPERSEDED"
  | "EXECUTION_ERROR";

export type AiTradePlanExecutionMode = "SHADOW" | "BITGET_DEMO" | "BITGET_LIVE";

export type AiTradeMarketQuote = {
  symbol: string;
  price: number;
  capturedAt: string;
  ageSeconds: number | null;
  fresh: boolean;
};

export type AiTradeIntentDecision = {
  symbol: string;
  strategyType?: ThreeHorizonStrategyType;
  strategyLabel?: string;
  direction: ThreeHorizonDirection;
  status: ThreeHorizonDecisionStatus;
  confidence: number;
  technicalScore?: number;
  forecastScore?: number;
  conditions?: ThreeHorizonCondition[];
  currentPrice: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  conditionsMet: number;
  conditionsTotal: number;
  riskPct?: number | null;
  maxHoldingUntil?: string | null;
  rejectionReason: string;
  updatedAt: string;
};

export type AiTradePlanEvent = {
  id: string;
  planId: string;
  eventType: string;
  title: string;
  detail: string;
  status: AiTradePlanStatus | null;
  bitgetOrderId: string | null;
  clientOid: string | null;
  price: number | null;
  quantity: number | null;
  eventAt: string;
};

export type AiTradePlan = {
  id: string;
  planGroupId: string;
  version: number;
  contentHash: string;
  strategyType: ThreeHorizonStrategyType;
  strategyLabel: string;
  symbol: string;
  direction: ThreeHorizonDirection;
  tier: AiTradePlanTier;
  status: AiTradePlanStatus;
  executionMode: AiTradePlanExecutionMode;
  thesisSummary: string;
  planningConfidence: number;
  executionThreshold: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  triggerRule: string;
  confirmationTimeframe: string;
  orderTypeIfTriggered: string;
  protectiveStop: number;
  target1: number;
  target2: number;
  target3: number;
  riskPercent: number;
  maxLeverage: number;
  validFrom: string;
  expiresAt: string;
  invalidationRule: string;
  cancelIf: string;
  conditionsMet: number;
  conditionsTotal: number;
  currentPrice: number | null;
  distanceToEntryPct: number | null;
  publishedAt: string;
  lastCheckedAt: string | null;
  submittedAt: string | null;
  firstFillAt: string | null;
  averageFillPrice: number | null;
  closedAt: string | null;
  closeReason: string | null;
  clientOid: string | null;
  bitgetOrderId: string | null;
  sourceDecisionId: string | null;
  forecastId: string | null;
  forecastVersion: string | null;
  forecastHorizon: "DAY" | "WEEK" | "MONTH" | null;
  forecastPublishedAt: string | null;
  forecastLockedAt: string | null;
  forecastValidFrom: string | null;
  forecastValidUntil: string | null;
  forecastSource: string | null;
  createdAt: string;
  updatedAt: string;
  events: AiTradePlanEvent[];
};

export type AiTradePlanSummary = {
  publishedToday: number;
  watching: number;
  armed: number;
  submittedOrOpen: number;
  closedToday: number;
};

export type AiTradePlanDashboard = {
  databaseReady: boolean;
  generatedAt: string;
  summary: AiTradePlanSummary;
  decisions: AiTradeIntentDecision[];
  quotes: AiTradeMarketQuote[];
  plans: AiTradePlan[];
  notice: string;
};

export type AiTradePlanExecutionGate = {
  plan: AiTradePlan | null;
  allowed: boolean;
  code: string;
  reason: string;
};
