export type TradingReliabilityMode =
  | "RUNNING"
  | "OPENING_DISABLED"
  | "MANAGE_ONLY"
  | "EMERGENCY_CLOSE_ONLY"
  | "PAUSED"
  | "RECOVERING";

export type TradeExecutionAction =
  | "OPEN_MARKET"
  | "CLOSE_MARKET"
  | "PLACE_PROTECTION"
  | "CANCEL_PROTECTION";

export type TradeExecutionStatus =
  | "PENDING"
  | "PROCESSING"
  | "ACKNOWLEDGED"
  | "CONFIRMED"
  | "FAILED"
  | "RECONCILED";

export type TradingReliabilitySeverity = "INFO" | "WARNING" | "CRITICAL";

export interface TradeExecutionOutboxItem {
  id: string;
  idempotencyKey: string;
  decisionId: string | null;
  actionType: TradeExecutionAction;
  symbol: string;
  status: TradeExecutionStatus;
  attemptCount: number;
  maxAttempts: number;
  clientOid: string | null;
  bitgetOrderId: string | null;
  lastError: string;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TradingReliabilityIncident {
  id: string;
  fingerprint: string;
  severity: TradingReliabilitySeverity;
  code: string;
  symbol: string | null;
  decisionId: string | null;
  message: string;
  occurrenceCount: number;
  resolved: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
}

export interface TradingReliabilityWatchdogReport {
  ok: boolean;
  source: "CRON" | "ADMIN";
  startedAt: string;
  finishedAt: string;
  mode: TradingReliabilityMode;
  modeReason: string;
  openingAllowed: boolean;
  managementAllowed: boolean;
  serverTimeOffsetMs: number | null;
  heartbeatAgeSeconds: number | null;
  marketAgeSeconds: number | null;
  outboxProcessed: number;
  outboxConfirmed: number;
  outboxFailed: number;
  positionsCount: number;
  protectionOrdersCount: number;
  unresolvedCritical: number;
  unresolvedWarnings: number;
  issues: Array<{
    severity: TradingReliabilitySeverity;
    code: string;
    symbol: string | null;
    decisionId: string | null;
    message: string;
  }>;
  repairs: string[];
  message: string;
}

export interface TradingReliabilityDashboard {
  databaseReady: boolean;
  generatedAt: string;
  phase: "TRADE_RELIABILITY_PHASE4";
  realTradingLocked: boolean;
  apiMode: "UTA_V3_DEMO" | "UTA_V3_LIVE";
  paptradingRequired: boolean;
  mode: TradingReliabilityMode;
  modeLabel: string;
  modeReason: string;
  openingAllowed: boolean;
  managementAllowed: boolean;
  serverTimeOffsetMs: number | null;
  clockSkewOk: boolean;
  lastServerTimeSyncAt: string | null;
  lastWatchdogAt: string | null;
  lastHealthyAt: string | null;
  consecutiveHealthyRuns: number;
  consecutiveFailures: number;
  heartbeatAgeSeconds: number | null;
  marketAgeSeconds: number | null;
  pendingOutbox: number;
  processingOutbox: number;
  acknowledgedOutbox: number;
  failedOutbox: number;
  stuckOutbox: number;
  unprotectedPositions: number;
  orphanPositions: number;
  unknownProtectionOrders: number;
  unresolvedCriticalIncidents: number;
  unresolvedWarningIncidents: number;
  recentOutbox: TradeExecutionOutboxItem[];
  recentIncidents: TradingReliabilityIncident[];
  lastReport: TradingReliabilityWatchdogReport | null;
}
