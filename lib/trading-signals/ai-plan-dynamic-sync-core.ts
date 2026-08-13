import type { AiTradePlanStatus } from "@/types/ai-trade-plan";

const PERIODIC_AUDIT_REFRESH_MS = 5 * 60 * 1000;

export type StoredPlanDynamicAudit = {
  id: string;
  status: AiTradePlanStatus;
  conditionsMet: number;
  conditionsTotal: number;
  lastCheckedAt: Date | null;
  clientOid: string | null;
  bitgetOrderId: string | null;
  closeReason: string | null;
};

export type DecisionDynamicAudit = {
  id: string;
  planId: string | null;
  conditionsMet: number;
  conditionsTotal: number;
  clientOid: string | null;
  bitgetOrderId: string | null;
  rejectionReason: string;
};

const TERMINAL_STATUSES = new Set<AiTradePlanStatus>([
  "CLOSED",
  "EXPIRED",
  "INVALIDATED",
  "EXECUTION_ERROR",
]);

/**
 * Keeps lifecycle changes synchronous while avoiding an identical plan UPDATE and
 * event INSERT on every one-minute scan. Unchanged plans are still read and are
 * periodically checkpointed, so active-plan audit does not disappear.
 */
export function shouldWriteDynamicPlanAudit(input: {
  current: StoredPlanDynamicAudit;
  decision: DecisionDynamicAudit;
  desiredStatus: AiTradePlanStatus;
  now: Date;
  refreshAfterMs?: number;
  force?: boolean;
}): boolean {
  const { current, decision, desiredStatus, now } = input;
  // A post-gate block or execution attempt is a distinct audit transition even
  // when the projected plan status and condition counters remain unchanged.
  if (input.force) return true;
  if (current.status !== desiredStatus) return true;
  if (current.conditionsMet !== decision.conditionsMet || current.conditionsTotal !== decision.conditionsTotal) return true;
  if (decision.planId !== current.id) return true;
  if (decision.clientOid && decision.clientOid !== current.clientOid) return true;
  if (decision.bitgetOrderId && decision.bitgetOrderId !== current.bitgetOrderId) return true;
  if (TERMINAL_STATUSES.has(desiredStatus) && decision.rejectionReason !== (current.closeReason ?? "")) return true;

  const refreshAfterMs = Math.max(0, input.refreshAfterMs ?? PERIODIC_AUDIT_REFRESH_MS);
  if (!current.lastCheckedAt) return true;
  return now.getTime() - current.lastCheckedAt.getTime() >= refreshAfterMs;
}

export async function writeDynamicPlanAuditIfRequired(input: {
  current: StoredPlanDynamicAudit;
  decision: DecisionDynamicAudit;
  desiredStatus: AiTradePlanStatus;
  now: Date;
  refreshAfterMs?: number;
  force?: boolean;
  write: () => Promise<void>;
}): Promise<boolean> {
  if (!shouldWriteDynamicPlanAudit(input)) return false;
  await input.write();
  return true;
}

export function postPlanDecisionRequiresSync(input: {
  evaluationReady: boolean;
  initialDecisionStatus: string;
}): boolean {
  // The normal path mutates the decision only after the plan gate when it was
  // executable: either it records the gate block or it attempts execution.
  return input.evaluationReady && input.initialDecisionStatus === "READY";
}
