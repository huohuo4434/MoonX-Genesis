export type PredictionAutoSymbol = "BTC" | "ETH";
export type PredictionAutoDirection = "LONG" | "SHORT" | "NEUTRAL";
export type PredictionAutoSetup =
  | "BUY_DIP"
  | "SELL_RALLY"
  | "HOLD"
  | "MISSING_FORECAST";
export type PredictionAutoRunStatus =
  | "WAITING"
  | "EXECUTED"
  | "MANAGED"
  | "BLOCKED"
  | "SKIPPED"
  | "ERROR";

export interface PredictionAutoTraderSettings {
  enabled: boolean;
  btcEnabled: boolean;
  ethEnabled: boolean;
  positionPct: number;
  stopLossPct: number;
  target1Pct: number;
  target2Pct: number;
  target3Pct: number;
  minDipPct: number;
  reboundConfirmPct: number;
  minRallyPct: number;
  reversalConfirmPct: number;
  minForecastConfidence: number;
  maxTradesPerSymbolDay: number;
  requireDailyWeeklyAlignment: boolean;
  startedAt: string | null;
  lastRunAt: string | null;
  lastMessage: string;
  updatedAt: string;
}

export interface PredictionForecastLeg {
  id: string;
  periodStart: string;
  periodEnd: string;
  direction: string;
  path: string;
  confidence: number;
  sourceLabel: string;
  status: string;
}

export interface PredictionStrategyPlan {
  symbol: PredictionAutoSymbol;
  assetId: string;
  assetName: string;
  weeklyForecast: PredictionForecastLeg | null;
  dailyForecast: PredictionForecastLeg | null;
  weeklyDirection: PredictionAutoDirection;
  dailyDirection: PredictionAutoDirection;
  setup: PredictionAutoSetup;
  confidence: number;
  reason: string;
}

export interface PredictionMarketContext {
  symbol: PredictionAutoSymbol;
  sourceSymbol: string;
  provider: "BITGET";
  interval: "15m";
  capturedAt: string;
  candleCount: number;
  sessionOpen: number;
  sessionHigh: number;
  sessionLow: number;
  currentPrice: number;
  dipPct: number;
  reboundPct: number;
  rallyPct: number;
  reversalPct: number;
  lastCloses: number[];
}

export interface PredictionAutoDecision {
  symbol: PredictionAutoSymbol;
  status: PredictionAutoRunStatus;
  action: string;
  price: number | null;
  plan: PredictionStrategyPlan;
  market: PredictionMarketContext | null;
  signalId: string | null;
  message: string;
}

export interface PredictionAutoRunReport {
  ok: boolean;
  enabled: boolean;
  locked: boolean;
  generatedAt: string;
  decisions: PredictionAutoDecision[];
  bitgetSync: {
    enabled: boolean;
    processed: number;
    success: number;
    skipped: number;
    errors: number;
    messages: string[];
  } | null;
  message: string;
}

export interface PredictionAutoRunLog {
  id: string;
  symbol: PredictionAutoSymbol;
  tradingDate: string;
  status: PredictionAutoRunStatus;
  action: string;
  direction: PredictionAutoDirection;
  price: number | null;
  weeklyForecastId: string | null;
  dailyForecastId: string | null;
  signalId: string | null;
  reason: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface PredictionAutoTraderDashboard {
  generatedAt: string;
  databaseReady: boolean;
  settings: PredictionAutoTraderSettings;
  mirrorEnabled: boolean;
  executionAllowed: boolean;
  plans: PredictionStrategyPlan[];
  recentRuns: PredictionAutoRunLog[];
}
