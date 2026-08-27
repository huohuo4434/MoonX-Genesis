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


export interface BitgetRuntimeExecutionFailure {
  outboxId: string;
  decisionId: string | null;
  symbol: string;
  action: string;
  status: string;
  stage: string;
  bitgetCode: string | null;
  httpStatus: number | null;
  remoteSubmissionAttempted: boolean | null;
  clientOid: string | null;
  bitgetOrderId: string | null;
  attemptCount: number;
  lastError: string;
  updatedAt: string;
}

export interface BitgetRuntimeState {
  databaseReady: boolean;
  mode: "BITGET_DEMO_REST_CRON" | "BITGET_LIVE_EXPERIMENT_REST_CRON";
  source: BitgetRuntimeSource;
  running: boolean;
  paused: boolean;
  pauseReason: string;
  pauseSource?: string;
  autoRecoveryHealthyRuns?: number;
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
  freshQuotesCount?: number;
  totalSymbols?: number;
  lastMarketError?: string;
  lastAccountError?: string;
  account: BitgetRuntimeAccountSnapshot;
  decisionStatsToday: BitgetRuntimeDecisionStats;
  consecutiveApiErrors: number;
  consecutiveOrderErrors: number;
  lastError: string;
  lastReport: Record<string, unknown> | null;
  recentEvents: BitgetRuntimeEvent[];
  recentExecutionFailures?: BitgetRuntimeExecutionFailure[];
  updatedAt: string;
  liveExperiment?: {
    status: "DISABLED" | "NOT_STARTED" | "ACTIVE" | "COMPLETED" | "STOPPED";
    startedAt: string | null;
    endsAt: string | null;
    initialEquityUsdt: number | null;
    currentEquityUsdt: number | null;
    pnlUsdt: number | null;
    pnlPct: number | null;
    maxDrawdownUsdt: number | null;
    maxDrawdownPct: number | null;
    dailyPnlUsdt: number | null;
    dailyPnlPct: number | null;
    dailyHistory: Array<{ date: string; openingEquityUsdt: number; closingEquityUsdt: number; pnlUsdt: number; pnlPct: number; trades: number }>;
    stopReason: string;
    securityMessage: string;
  };
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
  validation: Record<string, unknown> | null;
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
  memberDeskSync: { ok: boolean; mode?: "INLINE" | "DEDICATED_CRON" | "ON_DEMAND"; error?: string };
  liveExperimentExit?: { attempted: number; success: number; errors: number; messages: string[] };
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

export interface BitgetFailedOrderAuditItem {
  outboxId: string;
  decisionId: string | null;
  symbol: string;
  action: string;
  status: string;
  clientOid: string | null;
  bitgetOrderId: string | null;
  attemptCount: number;
  failureStage: string;
  bitgetCode: string | null;
  httpStatus: number | null;
  remoteSubmissionAttempted: boolean | null;
  lastError: string;
  updatedAt: string;
  orderLookup: "FOUND" | "ABSENT" | "NOT_CHECKED" | "QUERY_ERROR";
  orderStatus: string | null;
  positionPresent: boolean;
  strategyOrderPresent: boolean;
  queryError: string | null;
}

export interface BitgetFailedOrderAuditReport {
  checkedAt: string;
  readOnly: true;
  items: BitgetFailedOrderAuditItem[];
  recentOrderErrorDecisions: Array<{
    id: string;
    symbol: string;
    status: string;
    rejectionCode: string;
    rejectionReason: string;
    clientOid: string | null;
    bitgetOrderId: string | null;
    updatedAt: string;
  }>;
  positionsCount: number | null;
  pendingStrategyOrdersCount: number | null;
  safeToConsiderResume: boolean;
  summary: string;
}

export interface BitgetLegacyOrderErrorAuditItem {
  decisionId: string;
  symbol: string;
  originalErrorAt: string;
  originalRejectionReason: string;
  clientOid: string | null;
  orderId: string | null;
  remoteSubmissionPossibility: "POSSIBLE" | "UNLIKELY" | "UNKNOWN";
  auditWindow: { startAt: string; endAt: string };
  queryStatus: Record<string, "FOUND" | "ABSENT" | "QUERY_ERROR" | "NOT_CHECKED">;
  evidence: Record<string, number>;
  queryErrors: string[];
  allQueriesSucceeded: boolean;
  foundTradingEvidence: boolean;
  safeAsAbsent: boolean;
  reconciled: boolean;
  reconciliation: Record<string, unknown> | null;
}

export interface BitgetLegacyOrderErrorAuditReport {
  checkedAt: string;
  readOnly: true;
  deploymentVersion: string;
  items: BitgetLegacyOrderErrorAuditItem[];
  current: {
    accountQuerySucceeded: boolean;
    accountError: string;
    positionsCount: number | null;
    openOrdersCount: number | null;
    pendingStrategyOrdersCount: number | null;
    securityQuerySucceeded: boolean;
    withdrawPermission: boolean | null;
  };
  unresolvedCount: number;
  reconciledCount: number;
  allHistoricalQueriesSucceeded: boolean;
  foundTradingEvidence: boolean;
  canConfirmLegacyAbsent: boolean;
  summary: string;
}

export interface BitgetLiveResumeReadiness {
  checkedAt: string;
  readOnly: true;
  safeToConsiderResume: boolean;
  summary: string;
  checks: Record<string, boolean>;
  positionsCount: number | null;
  openOrdersCount: number | null;
  pendingStrategyOrdersCount: number | null;
  legacyUnresolvedCount: number;
  legacyReconciledCount: number;
  heartbeatAgeSeconds: number | null;
  quoteAgeSeconds: number | null;
  freshQuotesCount: number;
  totalSymbols: number;
  security: {
    querySucceeded: boolean;
    withdrawalPermission: boolean | null;
    tradingPermission: boolean | null;
    managementPermission: boolean | null;
  };
  executionFailureAudit: {
    querySucceeded: boolean;
    safe: boolean;
    summary: string;
  };
  errors: string[];
}
