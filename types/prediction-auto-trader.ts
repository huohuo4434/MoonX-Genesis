export type PredictionAutoSymbol = string;
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
export type PredictionAutoRunSource = "CRON" | "ADMIN" | "BROWSER" | "UNKNOWN";
export type PredictionAutoRunMode = "MONITOR" | "FULL";

export interface PredictionAutoTraderSettings {
  enabled: boolean;
  /** 最多10个币种基础代码，例如 BTC、ETH、SOL。 */
  watchSymbols: PredictionAutoSymbol[];
  /** 兼容旧页面和旧数据库。 */
  btcEnabled: boolean;
  /** 兼容旧页面和旧数据库。 */
  ethEnabled: boolean;
  /** 每多少分钟允许重新评估新开仓；持仓与镜像仍每分钟检查。 */
  strategyIntervalMinutes: number;
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
  lastFullScanAt: string | null;
  lastRunSource: PredictionAutoRunSource;
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

export interface PredictionPointGuidance {
  id: string;
  threshold: number;
  validUntil: string;
  closeInterval: "4H";
  supportConfidence: number;
  summary: string;
  invalidationRule: string;
  sourceLabel: string;
}

export interface PredictionStrategyPlan {
  symbol: PredictionAutoSymbol;
  tradeSymbol: string;
  assetId: string;
  assetName: string;
  weeklyForecast: PredictionForecastLeg | null;
  dailyForecast: PredictionForecastLeg | null;
  weeklyDirection: PredictionAutoDirection;
  dailyDirection: PredictionAutoDirection;
  setup: PredictionAutoSetup;
  confidence: number;
  reason: string;
  pointGuidance: PredictionPointGuidance | null;
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
  latestClosed4hClose: number | null;
  latestClosed4hAt: string | null;
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
  mode: PredictionAutoRunMode;
  source: PredictionAutoRunSource;
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

export interface PredictionAutoTraderServerStatus {
  expectedIntervalMinutes: number;
  strategyIntervalMinutes: number;
  serverHealthy: boolean;
  cronSecretConfigured: boolean;
  heartbeatAgeSeconds: number | null;
  nextExpectedRunAt: string | null;
  nextFullScanAt: string | null;
  statusText: string;
  requiresVercelProForOneMinute: boolean;
}

export interface PredictionAutoTraderDashboard {
  generatedAt: string;
  databaseReady: boolean;
  settings: PredictionAutoTraderSettings;
  server: PredictionAutoTraderServerStatus;
  mirrorEnabled: boolean;
  executionAllowed: boolean;
  plans: PredictionStrategyPlan[];
  recentRuns: PredictionAutoRunLog[];
}
