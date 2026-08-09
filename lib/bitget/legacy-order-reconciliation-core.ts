export const LEGACY_RECONCILE_CONFIRMATION_PHRASE = "CONFIRM_LEGACY_ORDER_ERRORS_RECONCILED";
export const LIVE_RESUME_CONFIRMATION_PHRASE = "RESUME_LIVE_EXPERIMENT";
export const LEGACY_AUDIT_WINDOW_MS = 60 * 60_000;

export type LegacyRemoteSubmissionPossibility = "POSSIBLE" | "UNLIKELY" | "UNKNOWN";
export type LegacyEvidenceLookup = "FOUND" | "ABSENT" | "QUERY_ERROR" | "NOT_CHECKED";

export type LegacyAuditWindow = {
  startAt: string;
  endAt: string;
};

export type LegacyHistoricalEvidence = {
  ordinaryOrders: number;
  fills: number;
  currentOpenOrders: number;
  currentStrategyOrders: number;
  historicalStrategyOrders: number;
  currentPositions: number;
  historicalPositions: number;
  financialRecords: number;
  mooxOrdinaryOrders: number;
  mooxFills: number;
  mooxCurrentOpenOrders: number;
  mooxCurrentStrategyOrders: number;
  mooxHistoricalStrategyOrders: number;
  ambiguousPositionChanges: number;
  ambiguousFinancialRecords: number;
};

export type LegacyHistoricalQueryStatus = {
  ordinaryOrders: LegacyEvidenceLookup;
  fills: LegacyEvidenceLookup;
  currentOpenOrders: LegacyEvidenceLookup;
  currentStrategyOrders: LegacyEvidenceLookup;
  historicalStrategyOrders: LegacyEvidenceLookup;
  currentPositions: LegacyEvidenceLookup;
  historicalPositions: LegacyEvidenceLookup;
  financialRecords: LegacyEvidenceLookup;
};

export type LegacyDecisionAuditInput = {
  decisionId: string;
  symbol: string;
  updatedAt: string;
  rejectionReason: string;
  clientOid?: string | null;
  orderId?: string | null;
  alreadyReconciled?: boolean;
  historicalQueryStatus: LegacyHistoricalQueryStatus;
  evidence: LegacyHistoricalEvidence;
  queryErrors?: string[];
};

export type LegacyDecisionAuditEvaluation = {
  decisionId: string;
  symbol: string;
  originalErrorAt: string;
  rejectionReason: string;
  remoteSubmissionPossibility: LegacyRemoteSubmissionPossibility;
  auditWindow: LegacyAuditWindow;
  allQueriesSucceeded: boolean;
  foundTradingEvidence: boolean;
  safeAsAbsent: boolean;
  alreadyReconciled: boolean;
  queryErrors: string[];
};

function isoDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid legacy ORDER_ERROR timestamp");
  return date.toISOString();
}

export function legacyAuditWindow(value: string | number | Date, windowMs = LEGACY_AUDIT_WINDOW_MS): LegacyAuditWindow {
  const center = new Date(value).getTime();
  if (!Number.isFinite(center)) throw new Error("Invalid legacy ORDER_ERROR timestamp");
  return {
    startAt: new Date(center - windowMs).toISOString(),
    endAt: new Date(center + windowMs).toISOString(),
  };
}

export function isMooxClientOid(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return /^mx[a-z0-9_-]{4,}$/.test(normalized);
}

export function classifyLegacyRemoteSubmissionPossibility(reason: string): LegacyRemoteSubmissionPossibility {
  const text = reason.toLowerCase();
  if (!text.trim()) return "UNKNOWN";
  if (/preflight|risk|minimum|min order|行情|风控|允许池|时钟|clock|set[-_ ]?leverage|leverage|account config|账户配置|规格|contract config/.test(text)) {
    return "UNLIKELY";
  }
  if (/place[-_ ]?order|remote|order error|订单写入|下单|timeout|network|http 5\d\d|25000|25001|25003|40725/.test(text)) {
    return "POSSIBLE";
  }
  return "UNKNOWN";
}

export function evaluateLegacyDecisionAudit(input: LegacyDecisionAuditInput): LegacyDecisionAuditEvaluation {
  const statuses = Object.values(input.historicalQueryStatus);
  const allQueriesSucceeded = statuses.every((status) => status === "ABSENT" || status === "FOUND");
  const evidence = input.evidence;
  // Fail closed for legacy rows that have no clientOid/orderId.  The audit still
  // exposes the MOOX-specific counts, but any same-symbol trading evidence in
  // the decision time window is enough to block automatic reconciliation.
  const foundTradingEvidence = [
    evidence.ordinaryOrders,
    evidence.fills,
    evidence.currentOpenOrders,
    evidence.currentStrategyOrders,
    evidence.historicalStrategyOrders,
    evidence.currentPositions,
    evidence.historicalPositions,
    evidence.financialRecords,
    evidence.ambiguousPositionChanges,
    evidence.ambiguousFinancialRecords,
  ].some((count) => count > 0);
  const queryErrors = [...(input.queryErrors ?? [])];
  if (!allQueriesSucceeded && !queryErrors.length) queryErrors.push("至少一个Bitget只读历史接口未成功完成核对");
  const safeAsAbsent = allQueriesSucceeded && !foundTradingEvidence;
  return {
    decisionId: input.decisionId,
    symbol: input.symbol,
    originalErrorAt: isoDate(input.updatedAt),
    rejectionReason: input.rejectionReason,
    remoteSubmissionPossibility: classifyLegacyRemoteSubmissionPossibility(input.rejectionReason),
    auditWindow: legacyAuditWindow(input.updatedAt),
    allQueriesSucceeded,
    foundTradingEvidence,
    safeAsAbsent,
    alreadyReconciled: Boolean(input.alreadyReconciled),
    queryErrors,
  };
}

export type LegacyAuditBatchEvaluation = {
  canConfirmLegacyAbsent: boolean;
  unresolvedCount: number;
  reconciledCount: number;
  allHistoricalQueriesSucceeded: boolean;
  foundTradingEvidence: boolean;
  summary: string;
};

export function evaluateLegacyAuditBatch(items: LegacyDecisionAuditEvaluation[]): LegacyAuditBatchEvaluation {
  const unresolved = items.filter((item) => !item.alreadyReconciled);
  const allHistoricalQueriesSucceeded = unresolved.length > 0 && unresolved.every((item) => item.allQueriesSucceeded);
  const foundTradingEvidence = unresolved.some((item) => item.foundTradingEvidence);
  const canConfirmLegacyAbsent = unresolved.length > 0 && allHistoricalQueriesSucceeded && !foundTradingEvidence && unresolved.every((item) => item.safeAsAbsent);
  return {
    canConfirmLegacyAbsent,
    unresolvedCount: unresolved.length,
    reconciledCount: items.length - unresolved.length,
    allHistoricalQueriesSucceeded,
    foundTradingEvidence,
    summary: canConfirmLegacyAbsent
      ? `已完成${unresolved.length}条旧版订单错误的Bitget历史只读核对，未发现MOOX相关交易证据；等待管理员人工确认。`
      : foundTradingEvidence
        ? "历史核对发现订单、成交、策略单或仓位/流水证据，禁止确认旧记录为空。"
        : unresolved.length === 0
          ? "全部旧版订单错误已存在人工核对记录。"
          : "旧版订单错误仍有未完成或失败的Bitget历史查询，保持安全暂停。",
  };
}

export type ResumeReadinessInput = {
  accountQuerySucceeded: boolean;
  positionsCount: number;
  openOrdersCount: number;
  pendingStrategyOrdersCount: number;
  legacyUnresolvedCount: number;
  allLegacyReconciliationsValid: boolean;
  allHistoricalQueriesSucceeded: boolean;
  heartbeatFresh: boolean;
  quotesFresh: boolean;
  apiSecurityQuerySucceeded: boolean;
  withdrawPermission: boolean;
  tradingPermission: boolean;
  managementPermission: boolean;
  executionFailureAuditSucceeded: boolean;
  executionFailureAuditSafe: boolean;
};

export function evaluateLiveResumeReadiness(input: ResumeReadinessInput) {
  const checks = {
    accountQuerySucceeded: input.accountQuerySucceeded,
    positionsEmpty: input.positionsCount === 0,
    openOrdersEmpty: input.openOrdersCount === 0,
    strategyOrdersEmpty: input.pendingStrategyOrdersCount === 0,
    legacyFullyReconciled: input.legacyUnresolvedCount === 0 && input.allLegacyReconciliationsValid,
    historicalQueriesSucceeded: input.allHistoricalQueriesSucceeded,
    heartbeatFresh: input.heartbeatFresh,
    quotesFresh: input.quotesFresh,
    apiSecurityQuerySucceeded: input.apiSecurityQuerySucceeded,
    noWithdrawPermission: !input.withdrawPermission,
    tradingPermission: input.tradingPermission,
    managementPermission: input.managementPermission,
    executionFailureAuditSucceeded: input.executionFailureAuditSucceeded,
    executionFailureAuditSafe: input.executionFailureAuditSafe,
  };
  const safeToConsiderResume = Object.values(checks).every(Boolean);
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return {
    safeToConsiderResume,
    checks,
    failed,
    summary: safeToConsiderResume
      ? "服务器恢复安全门全部通过；仍需管理员单独输入恢复确认短语。"
      : `服务器恢复安全门未通过：${failed.join(", ")}`,
  };
}

export function shouldWriteLegacyReconciliation(input: {
  rejectionCode: string;
  storedStatus?: string | null;
}): boolean {
  return input.rejectionCode === "ORDER_ERROR" && input.storedStatus !== "RECONCILED_ABSENT";
}

export type LegacyConfirmationAction = "REJECT" | "WRITE" | "NOOP_ALREADY_RECONCILED";

export function decideLegacyConfirmationAction(input: {
  confirmation: string;
  unresolvedCount: number;
  reconciledCount: number;
  canConfirmLegacyAbsent: boolean;
  storedReconciliationsValid: boolean;
}): LegacyConfirmationAction {
  if (input.confirmation !== LEGACY_RECONCILE_CONFIRMATION_PHRASE) return "REJECT";
  if (input.unresolvedCount === 0 && input.reconciledCount > 0 && input.storedReconciliationsValid) {
    return "NOOP_ALREADY_RECONCILED";
  }
  return input.unresolvedCount > 0 && input.canConfirmLegacyAbsent ? "WRITE" : "REJECT";
}

export function resolveExecutionFailureAuditSafety(input: {
  hasOutstandingExecutionEvidence: boolean;
  legacyAuditSafe: boolean;
  legacyUnresolvedCount: number;
  legacyReconciliationsValid: boolean;
  legacyHistoricalQueriesSucceeded: boolean;
}): boolean {
  if (input.hasOutstandingExecutionEvidence) return input.legacyAuditSafe;
  return input.legacyUnresolvedCount === 0
    && input.legacyReconciliationsValid
    && input.legacyHistoricalQueriesSucceeded;
}
