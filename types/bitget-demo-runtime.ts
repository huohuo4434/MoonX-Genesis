export type BitgetRuntimeLevel = "INFO" | "WARNING" | "ERROR" | "SUCCESS";

export type BitgetRuntimeStage =
  | "HEARTBEAT"
  | "MARKET"
  | "ACCOUNT"
  | "STRATEGY"
  | "MIRROR"
  | "RECONCILE"
  | "ORDER"
  | "SMOKE_TEST"
  | "SYSTEM";

export type BitgetRuntimeSource = "CRON" | "ADMIN" | "SYSTEM";

export interface BitgetRuntimeQuote {
  symbol: string;
  price: number;
  capturedAt: string;
}

export interface BitgetRuntimeDecisionStats {
  scanRuns: number;
  symbolsEvaluated: number;
  confidenceBlocked: number;
  alignmentBlocked: number;
  triggerWaiting: number;
  riskBlocked: number;
  marketErrors: number;
  orderAttempts: number;
  executed: number;
}

export interface BitgetRuntimeAccountSnapshot {
  connected: boolean;
  availableUsdt: number | null;
  equityUsdt: number | null;
  detectedUsdt: number | null;
  positionsCount: number;
  pendingStrategyOrdersCount: number;
  checkedAt: string | null;
  message: string;
}

export interface BitgetRuntimeEvent {
  id: string;
  runId: string;
  stage: BitgetRuntimeStage;
  level: BitgetRuntimeLevel;
  symbol: string | null;
  action: string;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface BitgetRuntimeState {
  databaseReady: boolean;
  mode: "BITGET_DEMO_REST_CRON";
  source: BitgetRuntimeSource;
  running: boolean;
  paused: boolean;
  pauseReason: string;
  serverHealthy: boolean;
  cronSecretConfigured: boolean;
  configured: boolean;
  executionAllowed: boolean;
  mirrorEnabled: boolean;
  testOrderAllowed: boolean;
  lastHeartbeatAt: string | null;
  lastMarketAt: string | null;
  lastStrategyAt: string | null;
  lastReconcileAt: string | null;
  lastOrderAttemptAt: string | null;
  lastOrderSuccessAt: string | null;
  heartbeatAgeSeconds: number | null;
  quoteAgeSeconds: number | null;
  latestQuotes: BitgetRuntimeQuote[];
  account: BitgetRuntimeAccountSnapshot;
  decisionStatsToday: BitgetRuntimeDecisionStats;
  consecutiveApiErrors: number;
  consecutiveOrderErrors: number;
  lastError: string;
  lastReport: Record<string, unknown> | null;
  recentEvents: BitgetRuntimeEvent[];
  updatedAt: string;
}

export interface BitgetRuntimeRunReport {
  ok: boolean;
  locked: boolean;
  paused: boolean;
  runId: string;
  source: BitgetRuntimeSource;
  startedAt: string;
  finishedAt: string;
  market: {
    ok: boolean;
    quotes: BitgetRuntimeQuote[];
    message: string;
  };
  strategy: Record<string, unknown> | null;
  threeHorizon: Record<string, unknown> | null;
  generalSignalMonitor: Record<string, unknown> | null;
  mirror: {
    enabled: boolean;
    processed: number;
    success: number;
    skipped: number;
    errors: number;
    messages: string[];
  } | null;
  reconcile: BitgetRuntimeAccountSnapshot;
  memberDeskSync: { ok: boolean; error?: string };
  message: string;
}

export interface BitgetSmokeTestReport {
  ok: boolean;
  testOnly: true;
  symbol: string;
  quantity: string;
  openOrderId: string;
  protectionOrderId: string;
  closeOrderId: string;
  openedAt: string;
  closedAt: string;
  finalPositionCount: number;
  messages: string[];
}
