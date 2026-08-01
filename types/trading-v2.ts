import type {
  TradeSignalDashboardSnapshot,
  TradeSignalDirection,
  TradeSignalRecord,
} from "@/types/trading-signal";

export type TradeSignalAction =
  | "PUBLISH"
  | "ARM"
  | "TRIGGER"
  | "ENTER"
  | "TARGET1"
  | "TARGET2"
  | "TARGET3"
  | "MOVE_STOP_BREAKEVEN"
  | "STOP"
  | "CLOSE"
  | "CANCEL";

export type PaperPositionStatus = "OPEN" | "PARTIAL" | "CLOSED";
export type PaperOrderStatus = "FILLED" | "CANCELLED";
export type SignalAlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface TradeRiskSettings {
  id: string;
  riskPerTradePct: number;
  maxPositionPct: number;
  star1PositionPct: number;
  star2PositionPct: number;
  star3PositionPct: number;
  star4PositionPct: number;
  star5PositionPct: number;
  dailyLossStopPct: number;
  maxConsecutiveLosses: number;
  breakevenAfterTarget1: boolean;
  target1ClosePct: number;
  target2ClosePct: number;
  updatedAt: string;
}

export interface PaperTradingAccount {
  id: string;
  name: string;
  baseCurrency: string;
  initialCash: number;
  cashBalance: number;
  realizedPnl: number;
  unrealizedPnl: number;
  currentEquity: number;
  peakEquity: number;
  maxDrawdownPct: number;
  consecutiveLosses: number;
  paused: boolean;
  pauseReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaperPosition {
  id: string;
  accountId: string;
  signalId: string;
  symbol: string;
  assetName: string;
  direction: TradeSignalDirection;
  status: PaperPositionStatus;
  originalQuantity: number;
  remainingQuantity: number;
  averageEntryPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  target3: number | null;
  realizedPnl: number;
  unrealizedPnl: number;
  openedAt: string;
  closedAt: string | null;
  updatedAt: string;
}

export interface PaperOrder {
  id: string;
  accountId: string;
  signalId: string;
  positionId: string | null;
  orderType: string;
  side: string;
  status: PaperOrderStatus;
  quantity: number;
  price: number;
  notional: number;
  note: string;
  createdAt: string;
  filledAt: string | null;
}

export interface PaperEquitySnapshot {
  id: string;
  accountId: string;
  equity: number;
  cash: number;
  realizedPnl: number;
  unrealizedPnl: number;
  drawdownPct: number;
  capturedAt: string;
}

export interface TradeSignalAlert {
  id: string;
  signalId: string;
  alertType: string;
  severity: SignalAlertSeverity;
  price: number | null;
  message: string;
  actionRequired: string;
  resolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface TradePlanReadiness {
  ready: boolean;
  missing: string[];
}

export interface PositionSizingPlan {
  allowed: boolean;
  reason: string;
  entryPrice: number;
  stopLoss: number;
  riskBudget: number;
  riskPerUnit: number;
  quantity: number;
  notionalAmount: number;
  positionSizePct: number;
  cappedBy: "RISK" | "POSITION" | "OBSERVE_ONLY" | "INVALID";
}

export interface ForecastDraftGenerationResult {
  message: string;
  created: number;
  existing: number;
  skipped: number;
  details: Array<{
    assetId: string;
    forecastId: string;
    result: "CREATED" | "EXISTS" | "SKIPPED";
    reason: string;
  }>;
}

export interface MonitorResult {
  signalId: string;
  price: number;
  recommendation: TradeSignalAction | "NONE" | "CONFIRM_REQUIRED";
  message: string;
  executedActions: TradeSignalAction[];
}

export interface TradingV2Snapshot {
  generatedAt: string;
  databaseReady: boolean;
  signalSnapshot: TradeSignalDashboardSnapshot;
  riskSettings: TradeRiskSettings;
  account: PaperTradingAccount;
  positions: PaperPosition[];
  orders: PaperOrder[];
  equityCurve: PaperEquitySnapshot[];
  alerts: TradeSignalAlert[];
  drafts: Array<TradeSignalRecord & { readiness: TradePlanReadiness }>;
  actionableSignals: TradeSignalRecord[];
}
