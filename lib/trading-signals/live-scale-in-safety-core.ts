export type ScaleInAuthorityRejection =
  | "MANAGE_ONLY"
  | "SCAN_ONLY"
  | "NEW_ENTRY_CUTOFF_REACHED"
  | "FORECAST_AUTHORITY_UNAVAILABLE"
  | "CANONICAL_FORECAST_MISSING"
  | "CANONICAL_DIRECTION_MISMATCH"
  | "RISK_BLOCKED"
  | "LEDGER_INCONSISTENT"
  | "DECISION_NOT_OPEN";

export function evaluateScaleInAuthority(input: {
  manageOnly: boolean;
  scanOnly: boolean;
  nowMs: number;
  cutoffMs: number;
  authorityReadsOk: boolean;
  canonicalDirection: "LONG" | "SHORT" | "NEUTRAL" | null;
  decisionDirection: "LONG" | "SHORT";
  riskBlocked: boolean;
  ledgerConsistent: boolean;
  decisionStatus: string;
}): { allowed: true } | { allowed: false; rejectionCode: ScaleInAuthorityRejection } {
  if (input.manageOnly) return { allowed: false, rejectionCode: "MANAGE_ONLY" };
  if (input.scanOnly) return { allowed: false, rejectionCode: "SCAN_ONLY" };
  if (input.nowMs >= input.cutoffMs) return { allowed: false, rejectionCode: "NEW_ENTRY_CUTOFF_REACHED" };
  if (!input.authorityReadsOk) return { allowed: false, rejectionCode: "FORECAST_AUTHORITY_UNAVAILABLE" };
  if (!input.canonicalDirection || input.canonicalDirection === "NEUTRAL") {
    return { allowed: false, rejectionCode: "CANONICAL_FORECAST_MISSING" };
  }
  if (input.canonicalDirection !== input.decisionDirection) {
    return { allowed: false, rejectionCode: "CANONICAL_DIRECTION_MISMATCH" };
  }
  if (input.riskBlocked) return { allowed: false, rejectionCode: "RISK_BLOCKED" };
  if (!input.ledgerConsistent) return { allowed: false, rejectionCode: "LEDGER_INCONSISTENT" };
  if (input.decisionStatus !== "OPEN") return { allowed: false, rejectionCode: "DECISION_NOT_OPEN" };
  return { allowed: true };
}

export function rollbackRemovedAddedQuantity(input: {
  beforeQuantity: number;
  addedQuantity: number;
  observedQuantity: number | null;
}): boolean {
  if (input.observedQuantity == null) return true;
  if (![input.beforeQuantity, input.addedQuantity, input.observedQuantity].every(Number.isFinite)) return false;
  const tolerance = Math.max(1e-8, Math.abs(input.addedQuantity) * 0.01);
  return input.observedQuantity <= input.beforeQuantity + tolerance;
}

export function isManagedScaleInRecovery(input: { status: string; rejectionCode: string | null }): boolean {
  return input.status === "ERROR" && input.rejectionCode === "SCALE_IN_PROTECTION_UNRESOLVED";
}

export function evaluateUnresolvedScaleInRecovery(input: {
  baselineQuantity: number | null;
  currentQuantity: number;
  hasFullPositionSideProtection: boolean;
}): "BASELINE_RESTORED" | "FULLY_PROTECTED" | "REPAIR_REQUIRED" {
  if (
    input.baselineQuantity != null &&
    Number.isFinite(input.baselineQuantity) &&
    rollbackRemovedAddedQuantity({
      beforeQuantity: input.baselineQuantity,
      addedQuantity: Math.max(1e-8, input.currentQuantity - input.baselineQuantity),
      observedQuantity: input.currentQuantity,
    })
  ) return "BASELINE_RESTORED";
  if (input.hasFullPositionSideProtection) return "FULLY_PROTECTED";
  return "REPAIR_REQUIRED";
}

export function requiresAuthoritativeRiskRefresh(scaleInOrderSuccess: number): boolean {
  return Number.isFinite(scaleInOrderSuccess) && scaleInOrderSuccess > 0;
}

export function scaleInExecutionIdentity(input: {
  decisionId: string;
  technicalTriggerFingerprint: string;
}): string {
  return `${input.decisionId}:scale-in-2:${input.technicalTriggerFingerprint}`;
}
