import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateScaleInAuthority,
  evaluateUnresolvedScaleInRecovery,
  isManagedScaleInRecovery,
  requiresAuthoritativeRiskRefresh,
  rollbackRemovedAddedQuantity,
  scaleInExecutionIdentity,
} from "../lib/trading-signals/live-scale-in-safety-core";

const allowedInput = {
  manageOnly: false,
  scanOnly: false,
  nowMs: 1_000,
  cutoffMs: 2_000,
  authorityReadsOk: true,
  canonicalDirection: "LONG" as const,
  decisionDirection: "LONG" as const,
  riskBlocked: false,
  ledgerConsistent: true,
  decisionStatus: "OPEN",
};

test("manage-only, scan-only and cutoff never authorize scale-in", () => {
  assert.deepEqual(evaluateScaleInAuthority({ ...allowedInput, manageOnly: true }), { allowed: false, rejectionCode: "MANAGE_ONLY" });
  assert.deepEqual(evaluateScaleInAuthority({ ...allowedInput, scanOnly: true }), { allowed: false, rejectionCode: "SCAN_ONLY" });
  assert.deepEqual(evaluateScaleInAuthority({ ...allowedInput, nowMs: 2_000 }), { allowed: false, rejectionCode: "NEW_ENTRY_CUTOFF_REACHED" });
});

test("canonical forecast null, read error and reversal fail closed", () => {
  assert.deepEqual(evaluateScaleInAuthority({ ...allowedInput, canonicalDirection: null }), { allowed: false, rejectionCode: "CANONICAL_FORECAST_MISSING" });
  assert.deepEqual(evaluateScaleInAuthority({ ...allowedInput, authorityReadsOk: false }), { allowed: false, rejectionCode: "FORECAST_AUTHORITY_UNAVAILABLE" });
  assert.deepEqual(evaluateScaleInAuthority({ ...allowedInput, canonicalDirection: "SHORT" }), { allowed: false, rejectionCode: "CANONICAL_DIRECTION_MISMATCH" });
});

test("time-exit and partial decisions cannot scale in", () => {
  assert.deepEqual(evaluateScaleInAuthority({ ...allowedInput, decisionStatus: "CLOSING" }), { allowed: false, rejectionCode: "DECISION_NOT_OPEN" });
  assert.deepEqual(evaluateScaleInAuthority({ ...allowedInput, decisionStatus: "PARTIAL" }), { allowed: false, rejectionCode: "DECISION_NOT_OPEN" });
});

test("rollback requires authoritative quantity disappearance, not order ACK", () => {
  assert.equal(rollbackRemovedAddedQuantity({ beforeQuantity: 1, addedQuantity: 0.5, observedQuantity: 1 }), true);
  assert.equal(rollbackRemovedAddedQuantity({ beforeQuantity: 1, addedQuantity: 0.5, observedQuantity: 1.25 }), false);
  assert.equal(rollbackRemovedAddedQuantity({ beforeQuantity: 1, addedQuantity: 0.5, observedQuantity: 1.5 }), false);
  assert.equal(rollbackRemovedAddedQuantity({ beforeQuantity: 1, addedQuantity: 0.5, observedQuantity: null }), true);
});

test("unresolved protection remains managed and same trigger is idempotent", () => {
  assert.equal(isManagedScaleInRecovery({ status: "ERROR", rejectionCode: "SCALE_IN_PROTECTION_UNRESOLVED" }), true);
  assert.equal(isManagedScaleInRecovery({ status: "ERROR", rejectionCode: "ORDER_ERROR" }), false);
  const first = scaleInExecutionIdentity({ decisionId: "d1", technicalTriggerFingerprint: "INTRADAY:BTCUSDT:LONG:1m:1000" });
  const concurrent = scaleInExecutionIdentity({ decisionId: "d1", technicalTriggerFingerprint: "INTRADAY:BTCUSDT:LONG:1m:1000" });
  const nextCandle = scaleInExecutionIdentity({ decisionId: "d1", technicalTriggerFingerprint: "INTRADAY:BTCUSDT:LONG:1m:1060" });
  assert.equal(first, concurrent);
  assert.notEqual(first, nextCandle);
});

test("unresolved scale-in only recovers at baseline or with complete full protection", () => {
  assert.equal(evaluateUnresolvedScaleInRecovery({ baselineQuantity: 1, currentQuantity: 1, hasFullPositionSideProtection: false }), "BASELINE_RESTORED");
  assert.equal(evaluateUnresolvedScaleInRecovery({ baselineQuantity: 1, currentQuantity: 1.5, hasFullPositionSideProtection: true }), "FULLY_PROTECTED");
  assert.equal(evaluateUnresolvedScaleInRecovery({ baselineQuantity: 1, currentQuantity: 1.5, hasFullPositionSideProtection: false }), "REPAIR_REQUIRED");
  assert.equal(evaluateUnresolvedScaleInRecovery({ baselineQuantity: null, currentQuantity: 1.5, hasFullPositionSideProtection: false }), "REPAIR_REQUIRED");
});

test("only a successful scale-in requires authoritative risk refresh", () => {
  assert.equal(requiresAuthoritativeRiskRefresh(0), false);
  assert.equal(requiresAuthoritativeRiskRefresh(1), true);
});
