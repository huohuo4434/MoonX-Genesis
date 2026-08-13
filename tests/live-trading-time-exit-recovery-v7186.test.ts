import test from "node:test";
import assert from "node:assert/strict";
import { isRecoverableLegacyTimeExit } from "../lib/trading-signals/legacy-time-exit-recovery-core";

const valid = () => ({
  decisionId: "decision-1",
  decisionSymbol: "ETHUSDT",
  decisionStatus: "ERROR",
  rejectionCode: "TIME_EXIT_FAILED",
  outboxDecisionId: "decision-1",
  outboxSymbol: "ETHUSDT",
  outboxAction: "CLOSE_MARKET",
  outboxStatus: "FAILED",
  outboxLastError: "Bitget 25238: posSide and reduceOnly cannot be assigned together",
  failureStage: "REMOTE_ORDER_WRITE",
  remoteSubmissionAttempted: "true",
});

test("only the exact deterministic legacy time-exit failure re-enters position management", () => {
  assert.equal(isRecoverableLegacyTimeExit(valid()), true);
  for (const patch of [
    { decisionStatus: "OPEN" },
    { rejectionCode: "ORDER_ERROR" },
    { outboxDecisionId: "decision-2" },
    { outboxSymbol: "BTCUSDT" },
    { outboxAction: "OPEN_MARKET" },
    { outboxStatus: "ACKNOWLEDGED" },
    { failureStage: null },
    { failureStage: "LOCAL_PREFLIGHT" },
    { failureStage: "ACCOUNT_CONFIG_WRITE" },
    { failureStage: "AMBIGUOUS_WRITE" },
    { failureStage: "STATUS_QUERY" },
    { remoteSubmissionAttempted: "false" },
    { outboxLastError: "Bitget 25204: order absent" },
  ]) {
    assert.equal(isRecoverableLegacyTimeExit({ ...valid(), ...patch }), false, JSON.stringify(patch));
  }
});
