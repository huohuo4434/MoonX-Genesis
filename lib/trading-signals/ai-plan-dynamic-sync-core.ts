import type { AiTradePlanStatus } from "@/types/ai-trade-plan";
import type { ThreeHorizonDecisionStatus } from "@/types/three-horizon-strategy";

const PERIODIC_AUDIT_REFRESH_MS = 5 * 60 * 1000;

export type DynamicPlanAuditDecision = "NONE" | "CHECKPOINT" | "MATERIAL";

export function resolveDynamicPlanStatus(input: {
  currentStatus: AiTradePlanStatus;
  decisionStatus: ThreeHorizonDecisionStatus;
  rejectionCode: string;
  conditionsMet: number;
  conditionsTotal: number;
  bitgetOrderId: string | null;
}): AiTradePlanStatus {
  const { currentStatus, decisionStatus } = input;
  if (["SUPERSEDED", "CLOSED", "EXPIRED", "INVALIDATED"].includes(currentStatus)) return currentStatus;
  if (["ORDER_SUBMITTED", "PARTIALLY_FILLED", "OPEN", "REDUCED"].includes(currentStatus) &&
      ["OBSERVING", "READY", "SHADOW_READY", "BLOCKED"].includes(decisionStatus)) return currentStatus;
  if (input.rejectionCode === "CONFIDENCE_LOW") return "WATCHING";
  switch (decisionStatus) {
    case "ORDER_SUBMITTED": return "ORDER_SUBMITTED";
    case "OPEN": return "OPEN";
    case "PARTIAL": return "REDUCED";
    case "CLOSING": return "REDUCED";
    case "CLOSED": return "CLOSED";
    case "EXPIRED": return "EXPIRED";
    case "ERROR": return input.bitgetOrderId || currentStatus === "ORDER_SUBMITTED" ? "EXECUTION_ERROR" : currentStatus;
    case "READY":
    case "SHADOW_READY": return "ARMED";
    case "BLOCKED": return input.conditionsMet === input.conditionsTotal ? "ARMED" : "WATCHING";
    default: return "WATCHING";
  }
}

export type StoredPlanDynamicAudit = {
  id: string;
  status: AiTradePlanStatus;
  conditionsMet: number;
  conditionsTotal: number;
  lastCheckedAt: Date | null;
  clientOid: string | null;
  bitgetOrderId: string | null;
  submittedAt: Date | null;
  firstFillAt: Date | null;
  averageFillPrice: number | null;
  closedAt: Date | null;
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

const FILLED_STATUSES = new Set<AiTradePlanStatus>([
  "PARTIALLY_FILLED",
  "OPEN",
  "REDUCED",
  "CLOSED",
]);

/**
 * Keeps lifecycle changes synchronous while avoiding an identical plan UPDATE and
 * event INSERT on every one-minute scan. Unchanged plans are still read and are
 * periodically checkpointed, so active-plan audit does not disappear.
 */
export function classifyDynamicPlanAudit(input: {
  current: StoredPlanDynamicAudit;
  decision: DecisionDynamicAudit;
  desiredStatus: AiTradePlanStatus;
  now: Date;
  refreshAfterMs?: number;
  force?: boolean;
}): DynamicPlanAuditDecision {
  const { current, decision, desiredStatus, now } = input;
  // A post-gate block or execution attempt is a distinct audit transition even
  // when the projected plan status and condition counters remain unchanged.
  if (input.force) return "MATERIAL";
  if (current.status !== desiredStatus) return "MATERIAL";
  if (current.conditionsMet !== decision.conditionsMet || current.conditionsTotal !== decision.conditionsTotal) return "MATERIAL";
  if (decision.planId !== current.id) return "MATERIAL";
  // updateDynamicPlan uses COALESCE for remote identities: an absent value in
  // the decision never clears an already-audited identity.
  if (decision.clientOid != null && decision.clientOid !== current.clientOid) return "MATERIAL";
  if (decision.bitgetOrderId != null && decision.bitgetOrderId !== current.bitgetOrderId) return "MATERIAL";
  if (desiredStatus === "ORDER_SUBMITTED" && !current.submittedAt) return "MATERIAL";
  if (FILLED_STATUSES.has(desiredStatus) && (!current.firstFillAt || current.averageFillPrice == null)) return "MATERIAL";
  if (TERMINAL_STATUSES.has(desiredStatus) && !current.closedAt) return "MATERIAL";
  if (TERMINAL_STATUSES.has(desiredStatus) && decision.rejectionReason !== (current.closeReason ?? "")) return "MATERIAL";

  const refreshAfterMs = Math.max(0, input.refreshAfterMs ?? PERIODIC_AUDIT_REFRESH_MS);
  // A missing audit timestamp is incomplete lifecycle state, not a routine
  // periodic checkpoint, so it stays on the immediate material path.
  if (!current.lastCheckedAt) return "MATERIAL";
  return now.getTime() - current.lastCheckedAt.getTime() >= refreshAfterMs
    ? "CHECKPOINT"
    : "NONE";
}

export function shouldWriteDynamicPlanAudit(input: {
  current: StoredPlanDynamicAudit;
  decision: DecisionDynamicAudit;
  desiredStatus: AiTradePlanStatus;
  now: Date;
  refreshAfterMs?: number;
  force?: boolean;
}): boolean {
  return classifyDynamicPlanAudit(input) !== "NONE";
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

/**
 * Serially synchronizes an already-prefetched maintenance batch. The database
 * adapter must load both decisions and their plan audit snapshot in one read;
 * this core deliberately has no per-row loader, so lifecycle writes remain
 * ordered while the former decision-by-decision SELECT cannot reappear here.
 */
export async function runPrefetchedPlanMaintenance<T>(input: {
  rows: readonly T[];
  hasPlanSnapshot: (row: T) => boolean;
  sync: (row: T) => Promise<void>;
}): Promise<number> {
  let synchronized = 0;
  for (const row of input.rows) {
    if (!input.hasPlanSnapshot(row)) continue;
    await input.sync(row);
    synchronized += 1;
  }
  return synchronized;
}

export async function runClassifiedPlanMaintenance<T>(input: {
  rows: readonly T[];
  classify: (row: T) => DynamicPlanAuditDecision;
  checkpointIdentity?: (row: T) => string;
  writeMaterial: (row: T) => Promise<void>;
  writeDuplicateFresh?: (row: T) => Promise<void>;
  writeCheckpoints: (rows: readonly T[]) => Promise<void>;
}): Promise<{ processed: number; material: number; checkpoints: number }> {
  const checkpoints: T[] = [];
  const identityCounts = new Map<string, number>();
  if (input.checkpointIdentity) {
    for (const row of input.rows) {
      const identity = input.checkpointIdentity(row);
      identityCounts.set(identity, (identityCounts.get(identity) ?? 0) + 1);
    }
  }
  let material = 0;
  for (const row of input.rows) {
    const duplicateIdentity = input.checkpointIdentity
      ? (identityCounts.get(input.checkpointIdentity(row)) ?? 0) > 1
      : false;
    // Multiple decisions linked to one plan retain the legacy, serial update
    // path. This prevents an older prefetched payload from entering a batch or
    // suppressing any per-decision link/event audit.
    if (duplicateIdentity) {
      await (input.writeDuplicateFresh ?? input.writeMaterial)(row);
      material += 1;
      continue;
    }
    const decision = input.classify(row);
    if (decision === "NONE") continue;
    if (decision === "CHECKPOINT") {
      checkpoints.push(row);
      continue;
    }
    // Material lifecycle transitions remain immediate and serial. No checkpoint
    // batch is started until every material row in this prefetched round settles.
    await input.writeMaterial(row);
    material += 1;
  }
  if (checkpoints.length) await input.writeCheckpoints(checkpoints);
  return {
    processed: input.rows.length,
    material,
    checkpoints: checkpoints.length,
  };
}

export function postPlanDecisionRequiresSync(input: {
  evaluationReady: boolean;
  initialDecisionStatus: string;
}): boolean {
  // The normal path mutates the decision only after the plan gate when it was
  // executable: either it records the gate block or it attempts execution.
  return input.evaluationReady && input.initialDecisionStatus === "READY";
}
