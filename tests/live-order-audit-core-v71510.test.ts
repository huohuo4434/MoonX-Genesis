import test from "node:test";
import assert from "node:assert/strict";
import { auditFailureReferencesCore, type FailureAuditDecisionRow, type FailureAuditOutboxRow } from "../lib/bitget/live-order-audit-core";

const now = "2026-08-09T10:00:00.000Z";
function decision(overrides: Partial<FailureAuditDecisionRow> = {}): FailureAuditDecisionRow {
  return {
    id: "d1",
    symbol: "BTCUSDT",
    status: "REJECTED",
    rejectionCode: "ORDER_ERROR",
    rejectionReason: "legacy order error",
    clientOid: "mx-1",
    bitgetOrderId: null,
    updatedAt: now,
    ...overrides,
  };
}
function outbox(overrides: Partial<FailureAuditOutboxRow> = {}): FailureAuditOutboxRow {
  return {
    id: "o1",
    decisionId: "d1",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    status: "FAILED",
    clientOid: "mx-1",
    bitgetOrderId: null,
    attemptCount: 1,
    failureStage: "REMOTE_ORDER_WRITE",
    bitgetCode: "40017",
    httpStatus: 400,
    remoteSubmissionAttempted: true,
    lastError: "remote failed",
    updatedAt: now,
    ...overrides,
  };
}

async function run(input: {
  outboxRows?: FailureAuditOutboxRow[];
  decisionRows?: FailureAuditDecisionRow[];
  lookup?: (ref: { clientOid?: string; orderId?: string }) => Promise<any>;
}) {
  return auditFailureReferencesCore({
    outboxRows: input.outboxRows ?? [],
    decisionRows: input.decisionRows ?? [],
    positions: [],
    strategies: [],
    lookupOrder: input.lookup ?? (async () => null),
  });
}

test("decision-only ORDER_ERROR with clientOid and existing order is unsafe", async () => {
  const report = await run({
    decisionRows: [decision()],
    lookup: async ({ clientOid }) => ({ orderId: "123", clientOid, orderStatus: "live" }),
  });
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].source, "DECISION");
  assert.equal(report.items[0].orderLookup, "FOUND");
  assert.equal(report.safeToConsiderResume, false);
});

test("decision-only ORDER_ERROR with clientOid confirmed absent can be safe", async () => {
  const report = await run({ decisionRows: [decision()], lookup: async () => null });
  assert.equal(report.items[0].orderLookup, "ABSENT");
  assert.equal(report.safeToConsiderResume, true);
});

test("decision-only ORDER_ERROR query failure is unsafe", async () => {
  const report = await run({
    decisionRows: [decision()],
    lookup: async () => { throw new Error("order-info timeout"); },
  });
  assert.equal(report.items[0].orderLookup, "QUERY_ERROR");
  assert.equal(report.safeToConsiderResume, false);
});

test("decision-only legacy ORDER_ERROR without clientOid/orderId is UNKNOWN and unsafe", async () => {
  const report = await run({ decisionRows: [decision({ clientOid: null, bitgetOrderId: null })] });
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].orderLookup, "NOT_CHECKED");
  assert.equal(report.items[0].legacyUnverifiedRemotePossible, true);
  assert.equal(report.safeToConsiderResume, false);
});

test("outbox empty but unverified decision exists can never become safe by every([])", async () => {
  const report = await run({ decisionRows: [decision({ clientOid: null, bitgetOrderId: null })], outboxRows: [] });
  assert.equal(report.items.length, 1);
  assert.equal(report.safeToConsiderResume, false);
});

test("outbox and decision sharing clientOid are deduplicated and both audited once", async () => {
  let lookups = 0;
  const report = await run({
    outboxRows: [outbox()],
    decisionRows: [decision()],
    lookup: async () => { lookups += 1; return null; },
  });
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].source, "MERGED");
  assert.equal(lookups, 1);
  assert.equal(report.safeToConsiderResume, true);
});

test("local-only preflight/config failure with no remote identifier does not block resume by itself", async () => {
  const report = await run({
    outboxRows: [outbox({ clientOid: null, bitgetOrderId: null, failureStage: "ACCOUNT_CONFIG_WRITE", remoteSubmissionAttempted: false })],
  });
  assert.equal(report.items[0].orderLookup, "NOT_CHECKED");
  assert.equal(report.safeToConsiderResume, true);
});

test("no auditable failure rows is fail-closed for AUTO_ORDER recovery", async () => {
  const report = await run({ outboxRows: [], decisionRows: [] });
  assert.equal(report.items.length, 0);
  assert.equal(report.safeToConsiderResume, false);
});

test("outbox clientOid+orderId and decision orderId-only still deduplicate", async () => {
  let lookups = 0;
  const report = await run({
    outboxRows: [outbox({ clientOid: "mx-merge", bitgetOrderId: "ord-merge" })],
    decisionRows: [decision({ id: "d-merge", clientOid: null, bitgetOrderId: "ord-merge" })],
    lookup: async () => { lookups += 1; return null; },
  });
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].source, "MERGED");
  assert.equal(lookups, 1);
});

test("decision without refs merges by decisionId into outbox clientOid and absent order can be safe", async () => {
  let lookups = 0;
  const report = await run({
    outboxRows: [outbox({ decisionId: "d-linked", clientOid: "mx-linked", bitgetOrderId: null })],
    decisionRows: [decision({ id: "d-linked", clientOid: null, bitgetOrderId: null })],
    lookup: async ({ clientOid }) => {
      lookups += 1;
      assert.equal(clientOid, "mx-linked");
      return null;
    },
  });
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].source, "MERGED");
  assert.equal(report.items[0].decisionId, "d-linked");
  assert.equal(report.items[0].clientOid, "mx-linked");
  assert.equal(report.items[0].orderLookup, "ABSENT");
  assert.equal(lookups, 1);
  assert.equal(report.safeToConsiderResume, true);
});

test("decisionId-linked outbox reference that resolves to an existing order is unsafe", async () => {
  const report = await run({
    outboxRows: [outbox({ decisionId: "d-found", clientOid: "mx-found" })],
    decisionRows: [decision({ id: "d-found", clientOid: null, bitgetOrderId: null })],
    lookup: async ({ clientOid }) => ({ orderId: "ord-found", clientOid, orderStatus: "live" }),
  });
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].source, "MERGED");
  assert.equal(report.items[0].orderLookup, "FOUND");
  assert.equal(report.safeToConsiderResume, false);
});

test("decisionId-linked outbox reference query error remains unsafe", async () => {
  const report = await run({
    outboxRows: [outbox({ decisionId: "d-query", clientOid: "mx-query" })],
    decisionRows: [decision({ id: "d-query", clientOid: null, bitgetOrderId: null })],
    lookup: async () => { throw new Error("order-info unavailable"); },
  });
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].source, "MERGED");
  assert.equal(report.items[0].orderLookup, "QUERY_ERROR");
  assert.equal(report.safeToConsiderResume, false);
});
