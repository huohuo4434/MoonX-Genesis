import test from "node:test";
import assert from "node:assert/strict";
import { buildTradingCandidateFunnel, type FunnelDecision } from "../lib/trading-signals/trading-candidate-funnel-core";

const now = new Date("2026-08-27T02:00:00+08:00");
const row = (overrides: Partial<FunnelDecision> = {}): FunnelDecision => ({
  strategyType: "INTRADAY", symbol: "BTCUSDT", direction: "LONG", status: "OBSERVING",
  conditions: [{ key: "entry", label: "1m触发", met: false, value: "waiting", weight: 1 }],
  rejectionCode: "ENTRY_NOT_TRIGGERED", rejectionReason: "等待", entryPrice: 70000, stopLoss: 69000,
  target1: 72000, target2: 74000, updatedAt: "2026-08-27T01:30:00+08:00",
  clientOid: null, bitgetOrderId: null, ...overrides,
});

test("real order error evidence counts as an attempt but local blocks do not", () => {
  const result = buildTradingCandidateFunnel([
    row({ symbol: "ORDERFAIL", status: "ERROR", rejectionCode: "ORDER_ERROR", conditions: [] }),
    row({ symbol: "LOCALBLOCK", status: "BLOCKED", rejectionCode: "ACCOUNT_CONFIG_BLOCK", clientOid: "created-before-remote", conditions: [] }),
    row({ symbol: "UNKNOWNREMOTE", status: "BLOCKED", rejectionCode: "ORDER_STATUS_UNKNOWN", clientOid: "moox-1", conditions: [] }),
  ], now);
  assert.equal(result.overall.stages.find((stage) => stage.key === "attempted")?.count, 2);
  assert.equal(result.overall.stages.find((stage) => stage.key === "opened")?.count, 0);
});

test("status query blocks are not remote attempts without authoritative evidence", () => {
  const result = buildTradingCandidateFunnel([
    row({ symbol: "LOCALQUERY", status: "BLOCKED", rejectionCode: "STATUS_QUERY_BLOCK", clientOid: "local-only", conditions: [] }),
    row({ symbol: "REMOTEUNKNOWN", status: "BLOCKED", rejectionCode: "ORDER_STATUS_UNKNOWN", clientOid: "remote-unknown", conditions: [] }),
    row({ symbol: "EXCHANGEID", status: "BLOCKED", rejectionCode: "STATUS_QUERY_BLOCK", bitgetOrderId: "123", conditions: [] }),
  ], now);
  assert.equal(result.overall.stages.find((stage) => stage.key === "attempted")?.count, 2);
});

test("equal targets are rejected by the same strict ordering as execution", () => {
  const result = buildTradingCandidateFunnel([row({ target2: 72000 })], now);
  assert.equal(result.overall.stages.find((stage) => stage.key === "geometry")?.count, 0);
  assert.equal(result.overall.noAttemptReasons[0]?.code, "INVALID_LEVEL_GEOMETRY");
});

test("candidate funnel uses latest daily decision and remains monotonic", () => {
  const result = buildTradingCandidateFunnel([
    row({ updatedAt: "2026-08-27T00:30:00+08:00", status: "READY", conditions: [{ key: "entry", label: "entry", met: true, value: "yes", weight: 1 }] }),
    row(),
    row({ symbol: "ETHUSDT", direction: "NEUTRAL", rejectionCode: "NO_DIRECTION" }),
    row({ symbol: "HYPEUSDT", status: "OPEN", conditions: [{ key: "entry", label: "entry", met: true, value: "yes", weight: 1 }] }),
  ], now);
  assert.deepEqual(result.overall.stages.map((stage) => stage.count), [3, 2, 2, 1, 1, 1, 1]);
  assert.ok(result.overall.stages.every((stage, index, stages) => index === 0 || stage.count <= stages[index - 1]!.count));
  assert.equal(result.horizons[0]!.noAttemptReasons[0]!.code, "ENTRY_NOT_TRIGGERED");
});

test("invalid long and short geometry is explained before entry triggers", () => {
  const result = buildTradingCandidateFunnel([
    row({ symbol: "BADLONG", stopLoss: 71000 }),
    row({ symbol: "BADSHORT", direction: "SHORT", stopLoss: 69000, target1: 68000, target2: 67000 }),
  ], now);
  assert.equal(result.overall.stages.find((stage) => stage.key === "geometry")?.count, 0);
  assert.equal(result.overall.noAttemptReasons[0]?.code, "INVALID_LEVEL_GEOMETRY");
  assert.equal(result.overall.noAttemptReasons[0]?.count, 2);
});

test("remote attempts are separated from candidates that never reached the exchange", () => {
  const result = buildTradingCandidateFunnel([
    row({ symbol: "REMOTEUNKNOWN", status: "BLOCKED", rejectionCode: "ORDER_STATUS_UNKNOWN", conditions: [] }),
    row({ symbol: "ORDERFAIL", status: "ERROR", rejectionCode: "ORDER_ERROR", conditions: [] }),
    row({ symbol: "PENDING", status: "ORDER_SUBMITTED", rejectionCode: "", conditions: [] }),
    row({ symbol: "WAITING", status: "OBSERVING", rejectionCode: "ENTRY_NOT_TRIGGERED", conditions: [] }),
  ], now);
  assert.deepEqual(result.overall.postAttemptReasons.map((reason) => reason.code).sort(), ["ORDER_ERROR", "ORDER_STATUS_UNKNOWN", "ORDER_SUBMITTED"]);
  assert.deepEqual(result.overall.noAttemptReasons.map((reason) => reason.code), ["ENTRY_NOT_TRIGGERED"]);
});

test("position-management failures remain formed positions instead of unfilled attempts", () => {
  const result = buildTradingCandidateFunnel([
    row({ symbol: "EXITFAIL", status: "ERROR", rejectionCode: "TIME_EXIT_FAILED", bitgetOrderId: "entry-1", conditions: [] }),
    row({ symbol: "PROTECTIONFAIL", status: "ERROR", rejectionCode: "PROTECTION_ORDER_FAILED", bitgetOrderId: "entry-2", conditions: [] }),
  ], now);
  assert.equal(result.overall.stages.find((stage) => stage.key === "attempted")?.count, 2);
  assert.equal(result.overall.stages.find((stage) => stage.key === "opened")?.count, 2);
  assert.deepEqual(result.overall.postAttemptReasons, []);
});
