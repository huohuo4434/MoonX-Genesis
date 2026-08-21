import assert from "node:assert/strict";
import test from "node:test";

import { protectExecutionLifecycleStatus } from "../lib/trading-signals/decision-status-transition-core";

test("an open exchange-backed decision cannot regress to planning BLOCKED", () => {
  assert.deepEqual(protectExecutionLifecycleStatus({
    currentStatus: "OPEN",
    requestedStatus: "BLOCKED",
    bitgetOrderId: "exchange-order-1",
    closedAt: null,
  }), { status: "OPEN", preserveExecutionMetadata: true });
});

test("active execution can still advance through closing and closed states", () => {
  assert.equal(protectExecutionLifecycleStatus({
    currentStatus: "OPEN",
    requestedStatus: "CLOSING",
    bitgetOrderId: "exchange-order-1",
  }).status, "CLOSING");
  assert.equal(protectExecutionLifecycleStatus({
    currentStatus: "CLOSING",
    requestedStatus: "CLOSED",
    bitgetOrderId: "exchange-order-1",
  }).status, "CLOSED");
});

test("a decision without an exchange order retains normal planning transitions", () => {
  assert.equal(protectExecutionLifecycleStatus({
    currentStatus: "READY",
    requestedStatus: "BLOCKED",
    bitgetOrderId: null,
  }).status, "BLOCKED");
});
