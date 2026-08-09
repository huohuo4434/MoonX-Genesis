import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateLegacyAuditBatch,
  evaluateLegacyDecisionAudit,
  evaluateLiveResumeReadiness,
  shouldWriteLegacyReconciliation,
  decideLegacyConfirmationAction,
  LEGACY_RECONCILE_CONFIRMATION_PHRASE,
  resolveExecutionFailureAuditSafety,
  type LegacyHistoricalEvidence,
  type LegacyHistoricalQueryStatus,
} from "../lib/bitget/legacy-order-reconciliation-core";

const absentStatus = (): LegacyHistoricalQueryStatus => ({
  ordinaryOrders: "ABSENT",
  fills: "ABSENT",
  currentOpenOrders: "ABSENT",
  currentStrategyOrders: "ABSENT",
  historicalStrategyOrders: "ABSENT",
  currentPositions: "ABSENT",
  historicalPositions: "ABSENT",
  financialRecords: "ABSENT",
});

const emptyEvidence = (): LegacyHistoricalEvidence => ({
  ordinaryOrders: 0, fills: 0, currentOpenOrders: 0, currentStrategyOrders: 0,
  historicalStrategyOrders: 0, currentPositions: 0, historicalPositions: 0,
  financialRecords: 0, mooxOrdinaryOrders: 0, mooxFills: 0, mooxCurrentOpenOrders: 0,
  mooxCurrentStrategyOrders: 0, mooxHistoricalStrategyOrders: 0,
  ambiguousPositionChanges: 0, ambiguousFinancialRecords: 0,
});

function item(status = absentStatus(), evidence = emptyEvidence()) {
  return evaluateLegacyDecisionAudit({
    decisionId: "d1",
    symbol: "ETHUSDT",
    updatedAt: "2026-08-09T07:00:00.000Z",
    rejectionReason: "legacy order error",
    historicalQueryStatus: status,
    evidence,
  });
}

test("legacy error without identifiers remains unsafe until every historical query finishes", () => {
  const status = absentStatus();
  status.ordinaryOrders = "NOT_CHECKED";
  const evaluated = item(status);
  assert.equal(evaluated.safeAsAbsent, false);
  assert.equal(evaluateLegacyAuditBatch([evaluated]).canConfirmLegacyAbsent, false);
});

test("any Bitget historical query failure blocks reconciliation", () => {
  const status = absentStatus();
  status.fills = "QUERY_ERROR";
  assert.equal(evaluateLegacyAuditBatch([item(status)]).canConfirmLegacyAbsent, false);
});

test("historical order or fill blocks reconciliation even when legacy identifiers are missing", () => {
  for (const key of ["ordinaryOrders", "fills"] as const) {
    const evidence = emptyEvidence();
    evidence[key] = 1;
    const evaluated = item(absentStatus(), evidence);
    assert.equal(evaluated.foundTradingEvidence, true);
    assert.equal(evaluateLegacyAuditBatch([evaluated]).canConfirmLegacyAbsent, false);
  }
});

test("position, open order, strategy order, or ambiguous account change blocks reconciliation", () => {
  for (const key of ["currentPositions", "currentOpenOrders", "currentStrategyOrders", "historicalStrategyOrders", "historicalPositions", "financialRecords", "ambiguousPositionChanges", "ambiguousFinancialRecords"] as const) {
    const evidence = emptyEvidence();
    evidence[key] = 1;
    assert.equal(evaluateLegacyAuditBatch([item(absentStatus(), evidence)]).canConfirmLegacyAbsent, false, key);
  }
});

test("all historical evidence absent allows separate admin confirmation but does not imply resume", () => {
  const batch = evaluateLegacyAuditBatch([item()]);
  assert.equal(batch.canConfirmLegacyAbsent, true);
  const readiness = evaluateLiveResumeReadiness({
    accountQuerySucceeded: true,
    positionsCount: 0,
    openOrdersCount: 0,
    pendingStrategyOrdersCount: 0,
    legacyUnresolvedCount: 1,
    allLegacyReconciliationsValid: false,
    allHistoricalQueriesSucceeded: true,
    heartbeatFresh: true,
    quotesFresh: true,
    apiSecurityQuerySucceeded: true,
    withdrawPermission: false,
    tradingPermission: true,
    managementPermission: true,
    executionFailureAuditSucceeded: true,
    executionFailureAuditSafe: true,
  });
  assert.equal(readiness.safeToConsiderResume, false);
});

test("legacy reconciliation plan is idempotent", () => {
  assert.equal(shouldWriteLegacyReconciliation({ rejectionCode: "ORDER_ERROR" }), true);
  assert.equal(shouldWriteLegacyReconciliation({ rejectionCode: "LEGACY_RECONCILED", storedStatus: "RECONCILED_ABSENT" }), false);
  assert.equal(shouldWriteLegacyReconciliation({ rejectionCode: "ORDER_ERROR", storedStatus: "RECONCILED_ABSENT" }), false);
});

test("repeat administrator confirmation is an idempotent no-op after immutable reconciliation exists", () => {
  assert.equal(decideLegacyConfirmationAction({
    confirmation: LEGACY_RECONCILE_CONFIRMATION_PHRASE,
    unresolvedCount: 0,
    reconciledCount: 10,
    canConfirmLegacyAbsent: false,
    storedReconciliationsValid: true,
  }), "NOOP_ALREADY_RECONCILED");
  assert.equal(decideLegacyConfirmationAction({
    confirmation: LEGACY_RECONCILE_CONFIRMATION_PHRASE,
    unresolvedCount: 10,
    reconciledCount: 0,
    canConfirmLegacyAbsent: true,
    storedReconciliationsValid: false,
  }), "WRITE");
  assert.equal(decideLegacyConfirmationAction({
    confirmation: "WRONG",
    unresolvedCount: 10,
    reconciledCount: 0,
    canConfirmLegacyAbsent: true,
    storedReconciliationsValid: false,
  }), "REJECT");
});


test("empty old execution audit is safe only after the new legacy reconciliation ledger is complete", () => {
  assert.equal(resolveExecutionFailureAuditSafety({
    hasOutstandingExecutionEvidence: false,
    legacyAuditSafe: false,
    legacyUnresolvedCount: 0,
    legacyReconciliationsValid: true,
    legacyHistoricalQueriesSucceeded: true,
  }), true);
  assert.equal(resolveExecutionFailureAuditSafety({
    hasOutstandingExecutionEvidence: false,
    legacyAuditSafe: false,
    legacyUnresolvedCount: 1,
    legacyReconciliationsValid: false,
    legacyHistoricalQueriesSucceeded: false,
  }), false);
  assert.equal(resolveExecutionFailureAuditSafety({
    hasOutstandingExecutionEvidence: true,
    legacyAuditSafe: false,
    legacyUnresolvedCount: 0,
    legacyReconciliationsValid: true,
    legacyHistoricalQueriesSucceeded: true,
  }), false);
});

test("resume readiness requires all zero state, fresh server/quotes, reconciled legacy and no withdraw permission", () => {
  const base = {
    accountQuerySucceeded: true,
    positionsCount: 0,
    openOrdersCount: 0,
    pendingStrategyOrdersCount: 0,
    legacyUnresolvedCount: 0,
    allLegacyReconciliationsValid: true,
    allHistoricalQueriesSucceeded: true,
    heartbeatFresh: true,
    quotesFresh: true,
    apiSecurityQuerySucceeded: true,
    withdrawPermission: false,
    tradingPermission: true,
    managementPermission: true,
    executionFailureAuditSucceeded: true,
    executionFailureAuditSafe: true,
  };
  assert.equal(evaluateLiveResumeReadiness(base).safeToConsiderResume, true);
  for (const patch of [
    { positionsCount: 1 }, { openOrdersCount: 1 }, { pendingStrategyOrdersCount: 1 },
    { heartbeatFresh: false }, { quotesFresh: false }, { withdrawPermission: true },
    { allHistoricalQueriesSucceeded: false }, { legacyUnresolvedCount: 1 },
    { executionFailureAuditSucceeded: false }, { executionFailureAuditSafe: false },
  ]) {
    assert.equal(evaluateLiveResumeReadiness({ ...base, ...patch }).safeToConsiderResume, false, JSON.stringify(patch));
  }
});
