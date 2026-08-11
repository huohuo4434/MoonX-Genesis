import assert from "node:assert/strict";
import test from "node:test";
import {
  auditLiveCommissioningRecoveryCore,
  type LiveCommissioningStoredFailure,
} from "../lib/bitget/live-commissioning-recovery-core";

const failure: LiveCommissioningStoredFailure = {
  outboxId: "outbox-1",
  decisionId: "decision-1",
  symbol: "ETHUSDT",
  action: "OPEN_MARKET",
  status: "FAILED",
  clientOid: "mx-old",
  failureStage: "STATUS_QUERY",
  remoteSubmissionAttempted: false,
};

function dependencies(patch: Record<string, unknown> = {}) {
  return {
    loadStoredFailures: async () => [failure],
    getPositions: async () => [],
    getOpenOrders: async () => [],
    getPendingStrategyOrders: async () => [],
    lookupExactOrder: async () => null,
    now: () => new Date("2026-08-12T00:00:00.000Z"),
    ...patch,
  };
}

const input = { decisionId: "decision-1", clientOid: "mx-old", symbol: "ETHUSDT" };

test("exact non-dispatched failure plus current zero-state produces recovery evidence", async () => {
  const calls: string[] = [];
  const result = await auditLiveCommissioningRecoveryCore(input, dependencies({
    loadStoredFailures: async () => { calls.push("stored"); return [failure]; },
    getPositions: async () => { calls.push("positions"); return []; },
    getOpenOrders: async () => { calls.push("orders"); return []; },
    getPendingStrategyOrders: async () => { calls.push("strategies"); return []; },
    lookupExactOrder: async () => { calls.push("lookup"); return null; },
  }));
  assert.deepEqual(new Set(calls), new Set(["stored", "positions", "orders", "strategies", "lookup"]));
  assert.equal(result?.orderLookup, "ABSENT");
  assert.equal(result?.remoteSubmissionAttempted, false);
  assert.equal(result?.outboxId, "outbox-1");
});

test("audit has one shared wall-clock budget and fails closed on a hanging read", async () => {
  const startedAt = Date.now();
  const result = await auditLiveCommissioningRecoveryCore(
    { ...input, timeoutMs: 25 },
    dependencies({ lookupExactOrder: () => new Promise(() => undefined) })
  );
  assert.equal(result, null);
  assert.ok(Date.now() - startedAt < 250, "bounded audit must not wait for an unbounded historical/read query");
});

test("any rejected read fails closed", async () => {
  const result = await auditLiveCommissioningRecoveryCore(input, dependencies({
    getPendingStrategyOrders: async () => { throw new Error("Bitget unavailable"); },
  }));
  assert.equal(result, null);
});

test("duplicate or mismatched stored references fail closed", async () => {
  assert.equal(await auditLiveCommissioningRecoveryCore(input, dependencies({
    loadStoredFailures: async () => [failure, failure],
  })), null);
  assert.equal(await auditLiveCommissioningRecoveryCore(input, dependencies({
    loadStoredFailures: async () => [{ ...failure, clientOid: "different" }],
  })), null);
});

test("remote evidence or any current exchange state forbids retry", async () => {
  const unsafePatches = [
    { loadStoredFailures: async () => [{ ...failure, remoteSubmissionAttempted: true }] },
    { loadStoredFailures: async () => [{ ...failure, failureStage: "AMBIGUOUS_WRITE" }] },
    { lookupExactOrder: async () => ({ orderId: "bitget-order" }) },
    { getPositions: async () => [{ symbol: "ETHUSDT", total: 0.01 }] },
    { getOpenOrders: async () => [{}] },
    { getPendingStrategyOrders: async () => [{}] },
  ];
  for (const patch of unsafePatches) {
    assert.equal(await auditLiveCommissioningRecoveryCore(input, dependencies(patch)), null);
  }
});
