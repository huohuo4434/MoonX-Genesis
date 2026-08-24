export type UnifiedLiveHorizon = "SHORT" | "MEDIUM" | "LONG";
export type UnifiedLiveSide = "LONG" | "SHORT";
export type UnifiedLiveMode = "PAUSED" | "MANAGE_ONLY" | "LIVE";
export type UnifiedLiveSizingMode =
  | "FIXED_MARGIN"
  | "EQUITY_PERCENT"
  | "FIXED_NOTIONAL"
  | "RISK_PERCENT";
export type UnifiedLiveSliceStatus =
  | "PENDING"
  | "OPEN"
  | "PARTIALLY_CLOSED"
  | "CLOSED"
  | "CLOSED_MANUAL"
  | "ORPHAN_PENDING_CLAIM"
  | "BLOCKED";
export type UnifiedLiveResonance = "RESONANT" | "DIVERGENT" | "UNKNOWN";

export interface UnifiedLiveHorizonSetting {
  horizon: UnifiedLiveHorizon;
  enabled: boolean;
  sizingMode: UnifiedLiveSizingMode;
  sizingValue: number;
  leverage: number;
  maxOpenPositions: number;
  maxLossPercent: number;
  dailyLossPercent: number;
  weeklyLossPercent: number;
  maxMarginUsePercent: number;
  target1ReducePercent: number;
  isolatedMargin: true;
}

export interface UnifiedLivePositionSizingInput {
  equity: number;
  availableMargin: number;
  entryPrice: number;
  stopPrice: number;
  sizingMode: UnifiedLiveSizingMode;
  sizingValue: number;
  leverage: number;
  maxMarginUsePercent: number;
  maxLossPercent: number;
  feeAndSlippagePercent?: number;
}

export interface UnifiedLivePositionSizingResult {
  accepted: boolean;
  reason?: string;
  leverage: number;
  marginAmount: number;
  notionalAmount: number;
  quantity: number;
  projectedLoss: number;
  projectedLossPercent: number;
}

export interface UnifiedLiveMethodInput {
  assetPolicy: "CORE" | "FOCUS";
  horizon: UnifiedLiveHorizon;
  qimenDirection?: string | null;
  liuyaoDirection?: string | null;
  technicalDirection?: "LONG" | "SHORT" | "WAIT" | null;
}

export interface UnifiedLiveMethodDecision {
  allowed: boolean;
  side: UnifiedLiveSide | null;
  resonance: UnifiedLiveResonance;
  riskMultiplier: number;
  reasons: string[];
  formalDirectionSource: "LIUYAO" | "LIUYAO_QIMEN_RESONANCE" | "NONE";
  technicalCanOverrideDirection: false;
}

export interface UnifiedLiveExchangePosition {
  positionKey: string;
  symbol: string;
  side: UnifiedLiveSide;
  quantity: number;
  entryPrice: number;
  markPrice?: number | null;
  leverage?: number | null;
  marginMode?: string | null;
  updatedAt?: string | null;
}

export interface UnifiedLiveExchangeOrder {
  orderKey: string;
  symbol: string;
  side?: string | null;
  reduceOnly?: boolean;
  stopLoss?: boolean;
  takeProfit?: boolean;
  status?: string | null;
}

export interface UnifiedLiveCustodySliceLike {
  id: string;
  symbol: string;
  horizon: UnifiedLiveHorizon;
  side: UnifiedLiveSide;
  status: UnifiedLiveSliceStatus | string;
  quantity: number;
  openedAt: Date | string;
  maxHoldMinutes: number;
  exchangePositionKey?: string | null;
}

export interface UnifiedLiveCustodyIssue {
  code:
    | "ORPHAN_EXCHANGE_POSITION"
    | "SITE_ONLY_POSITION"
    | "PROTECTION_MISSING"
    | "TIME_EXIT_DUE"
    | "DUPLICATE_SLICE"
    | "SNAPSHOT_UNAVAILABLE";
  severity: "WARN" | "BLOCKER";
  symbol?: string;
  positionKey?: string;
  sliceId?: string;
  detail: string;
}

export interface UnifiedLiveCustodyAudit {
  collectedAt: string;
  snapshotAvailable: boolean;
  issues: UnifiedLiveCustodyIssue[];
  orphanPositions: UnifiedLiveExchangePosition[];
  siteOnlySlices: UnifiedLiveCustodySliceLike[];
  protectionMissing: string[];
  timeExitDue: string[];
  freezeNewEntries: boolean;
}
