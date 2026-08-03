import type { BitgetRuntimeDecisionStats } from "@/types/bitget-demo-runtime";
import type { ThreeHorizonPublicStrategy } from "@/types/three-horizon-strategy";

export type AiTradingDeskPlanStatus =
  | "PLAN_ONLY"
  | "OBSERVE"
  | "WAIT_LONG"
  | "WAIT_SHORT"
  | "READY"
  | "POSITION_OPEN"
  | "BLOCKED"
  | "ERROR";


export type AiTradingDeskOperationalState =
  | "DATA_DISCONNECTED"
  | "CONNECTING"
  | "DATA_DELAYED"
  | "PLAN_ONLY"
  | "WAITING_ENTRY"
  | "SIMULATION_POSITION"
  | "PAUSED"
  | "SERVICE_ERROR";

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
  ledgerSource: "BITGET_DEMO";
  ledgerNotice: string;
  strategyEnabled: boolean;
  mirrorEnabled: boolean;
  executionAllowed: boolean;
  serverHealthy: boolean;
  syncStatus: "OK" | "PARTIAL" | "ERROR" | "DISABLED";
  syncMessage: string;
  operationalState: AiTradingDeskOperationalState;
  operationalStateLabel: string;
  quoteReady: boolean;
  latestQuoteAt: string | null;
  runtime: {
    paused: boolean;
    pauseReason: string;
    lastHeartbeatAt: string | null;
    lastStrategyAt: string | null;
    lastReconcileAt: string | null;
    heartbeatAgeSeconds: number | null;
    quoteAgeSeconds: number | null;
    decisionStatsToday: BitgetRuntimeDecisionStats;
  };
  settings: AiTradingDeskSettings;
  strategies: ThreeHorizonPublicStrategy[];
  plans: AiTradingDeskPlan[];
  positions: AiTradingDeskPosition[];
  recentTrades: AiTradingDeskTrade[];
  stats: AiTradingDeskStats;
}
