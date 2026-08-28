export type ProtectionOutboxPreflightAction =
  | "PROCEED"
  | "RECONCILE_NO_POSITION"
  | "BLOCK_TERMINAL_DECISION_WITH_POSITION";

const ACTIVE_DECISION_STATUSES = new Set(["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING"]);

/**
 * A protection task may only use the levels of the decision that created it.
 * Only an explicitly active decision may submit its levels. A terminal,
 * missing, or otherwise unknown authority must never attach stale levels to a
 * later same-symbol position. Exchange absence makes the task safely
 * reconcilable; exchange presence is a custody mismatch that remains closed.
 */
export function classifyProtectionOutboxPreflight(input: {
  decisionStatus: string | null | undefined;
  matchingExchangePosition: boolean;
}): ProtectionOutboxPreflightAction {
  const status = String(input.decisionStatus ?? "").trim().toUpperCase();
  if (ACTIVE_DECISION_STATUSES.has(status)) return "PROCEED";
  return input.matchingExchangePosition
    ? "BLOCK_TERMINAL_DECISION_WITH_POSITION"
    : "RECONCILE_NO_POSITION";
}
