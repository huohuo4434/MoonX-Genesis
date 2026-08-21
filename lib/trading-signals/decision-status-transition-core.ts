const ACTIVE_EXECUTION_STATUSES = new Set(["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING"]);
const PLANNING_STATUSES = new Set(["OBSERVING", "READY", "SHADOW_READY", "BLOCKED", "EXPIRED"]);

export function protectExecutionLifecycleStatus(input: {
  currentStatus: string;
  requestedStatus: string;
  bitgetOrderId?: string | null;
  closedAt?: Date | string | null;
}) {
  const preserve = Boolean(input.bitgetOrderId)
    && !input.closedAt
    && ACTIVE_EXECUTION_STATUSES.has(input.currentStatus)
    && PLANNING_STATUSES.has(input.requestedStatus);
  return {
    status: preserve ? input.currentStatus : input.requestedStatus,
    preserveExecutionMetadata: preserve,
  };
}
