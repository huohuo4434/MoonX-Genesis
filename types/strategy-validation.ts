import type { ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";

export type StrategyValidationSeverity = "INFO" | "WARNING" | "CRITICAL";
export type StrategyValidationGateStatus = "COLLECTING" | "BLOCKED" | "DEMO_VALIDATED";
export type StrategyExperimentTrialStatus = "OPEN" | "TARGET" | "STOP" | "TIME" | "CANCELLED";

export type StrategyValidationInvariant = {
  key: string;
  label: string;
  ok: boolean;
  severity: StrategyValidationSeverity;
  current: string;
  required: string;
  message: string;
};

export type StrategyPerformanceMetrics = {
  strategyType: ThreeHorizonStrategyType;
  closedTrades: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  grossPnlUsdt: number;
  feesUsdt: number;
  fundingUsdt: number;
  cashDividendUsdt: number;
  netPnlUsdt: number;
  averageR: number | null;
  expectancyR: number | null;
  profitFactor: number | null;
  maxDrawdownPct: number | null;
  averageEntrySlippageBps: number | null;
  sampleReady: boolean;
};

export type StrategyExperimentSummary = {
  id: string;
  strategyType: ThreeHorizonStrategyType;
  name: string;
  version: string;
  enabled: boolean;
  confidenceDelta: number;
  description: string;
  openTrials: number;
  closedTrials: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  averageR: number | null;
  expectancyR: number | null;
  profitFactor: number | null;
};

export type StrategyReconciliationEvent = {
  id: string;
  severity: StrategyValidationSeverity;
  code: string;
  symbol: string | null;
  decisionId: string | null;
  message: string;
  resolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
};

export type StrategyValidationDashboard = {
  databaseReady: boolean;
  generatedAt: string;
  phase: "DEMO_VALIDATION_PHASE3";
  realTradingLocked: true;
  realTradingNotice: string;
  gateStatus: StrategyValidationGateStatus;
  gateLabel: string;
  stableDays: number;
  heartbeatAvailabilityPct: number | null;
  maxAccountDrawdownPct: number | null;
  snapshotCount: number;
  unresolvedCriticalEvents: number;
  unresolvedWarningEvents: number;
  invariants: StrategyValidationInvariant[];
  performance: StrategyPerformanceMetrics[];
  experiments: StrategyExperimentSummary[];
  recentEvents: StrategyReconciliationEvent[];
  lastCycleAt: string | null;
  lastCycleOk: boolean;
  lastCycleMessage: string;
};

export type StrategyValidationCycleReport = {
  ok: boolean;
  runId: string;
  source: "CRON" | "ADMIN" | "SYSTEM";
  startedAt: string;
  finishedAt: string;
  snapshotWritten: boolean;
  activeDecisions: number;
  currentPositions: number;
  protectedPositions: number;
  closedMetricsUpserted: number;
  experimentTrialsOpened: number;
  experimentTrialsClosed: number;
  criticalIssues: number;
  warningIssues: number;
  message: string;
};
