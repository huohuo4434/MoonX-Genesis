export function isRecoverableLegacyTimeExit(input: {
  decisionId: string;
  decisionSymbol: string;
  decisionStatus: string;
  rejectionCode: string;
  outboxDecisionId: string | null;
  outboxSymbol: string | null;
  outboxAction: string | null;
  outboxStatus: string | null;
  outboxLastError: string | null;
  failureStage: string | null;
  remoteSubmissionAttempted: string | null;
}): boolean {
  if (input.decisionStatus !== "ERROR" || input.rejectionCode !== "TIME_EXIT_FAILED") return false;
  if (input.outboxDecisionId !== input.decisionId || input.outboxSymbol !== input.decisionSymbol) return false;
  if (input.outboxAction !== "CLOSE_MARKET" || input.outboxStatus !== "FAILED") return false;
  if (input.failureStage !== "REMOTE_ORDER_WRITE") return false;
  if (input.remoteSubmissionAttempted !== "true") return false;
  const message = input.outboxLastError ?? "";
  return /(?:Bitget\s*)?25238\b/i.test(message) && /posSide/i.test(message) && /reduceOnly/i.test(message);
}
