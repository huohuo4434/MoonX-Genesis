export type AiTradingDeskPlanStatus =
  | "OBSERVE"
  | "WAIT_LONG"
  | "WAIT_SHORT"
  | "READY"
  | "POSITION_OPEN"
  | "BLOCKED"
  | "ERROR";

export interface AiTradingDeskSettings {
  enabled: boolean;
  showCurrentPositions: boolean;
  showTradeHistory: boolean;
  showAbsolutePnl: boolean;
  historyLimit: number;
  updatedAt: string;
}

export interface AiTradingDeskPlan {
  symbol: string;
  assetName: string;
  status: AiTradingDeskPlanStatus;
  statusLabel: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number;
  weeklyText: string;
  dailyText: string;
  actionText: string;
  triggerText: string;
  invalidationText: string;
  keyLevel: number | null;
  currentPrice: number | null;
  lastCheckedAt: string | null;
}

export interface AiTradingDeskPosition {
  symbol: string;
  direction: "LONG" | "SHORT";
  averageEntryPrice: number;
  markPrice: number;
  profitRatePct: number;
  leverage: number;
  marginMode: string;
  openedAt: string | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskSource: "BITGET_ORDER" | "SYSTEM_PLAN" | "NONE";
  unrealisedPnlUsdt: number | null;
}

export interface AiTradingDeskTrade {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  openPrice: number;
  closePrice: number;
  returnPct: number;
  netProfitUsdt: number | null;
  openedAt: string | null;
  closedAt: string | null;
}

export interface AiTradingDeskStats {
  closedTrades: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  averageReturnPct: number | null;
  bestReturnPct: number | null;
  worstReturnPct: number | null;
  tradeCurveMaxDrawdownPct: number | null;
  netProfitUsdt: number | null;
}

export interface AiTradingDeskSnapshot {
  generatedAt: string;
  lastSyncedAt: string | null;
  mode: "BITGET_DEMO";
  strategyEnabled: boolean;
  mirrorEnabled: boolean;
  executionAllowed: boolean;
  serverHealthy: boolean;
  syncStatus: "OK" | "PARTIAL" | "ERROR" | "DISABLED";
  syncMessage: string;
  settings: AiTradingDeskSettings;
  plans: AiTradingDeskPlan[];
  positions: AiTradingDeskPosition[];
  recentTrades: AiTradingDeskTrade[];
  stats: AiTradingDeskStats;
}
