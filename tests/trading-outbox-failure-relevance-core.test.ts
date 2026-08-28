import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  RELIABILITY_OUTBOX_FAILURE_COOLDOWN_MS,
  isOutboxFailureCurrent,
} from "../lib/trading-signals/outbox-failure-relevance-core";

const now = new Date("2026-08-29T00:00:00.000Z");

test("recent terminal outbox failures remain fail-closed during the cooldown", () => {
  assert.equal(isOutboxFailureCurrent({
    failedAt: new Date(now.getTime() - RELIABILITY_OUTBOX_FAILURE_COOLDOWN_MS + 1),
    decisionStatus: "CLOSED",
    now,
  }), true);
});

test("old failures linked to terminal decisions remain history without blocking today", () => {
  for (const decisionStatus of ["CLOSED", "BLOCKED", "ERROR", null]) {
    assert.equal(isOutboxFailureCurrent({
      failedAt: new Date(now.getTime() - RELIABILITY_OUTBOX_FAILURE_COOLDOWN_MS - 1),
      decisionStatus,
      now,
    }), false);
  }
});

test("a failed task linked to possible live exposure remains a blocker regardless of age", () => {
  for (const decisionStatus of ["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING"]) {
    assert.equal(isOutboxFailureCurrent({
      failedAt: "2026-08-01T00:00:00.000Z",
      decisionStatus,
      now,
    }), true);
  }
});

test("an invalid failure timestamp fails closed", () => {
  assert.equal(isOutboxFailureCurrent({ failedAt: "not-a-date", decisionStatus: "CLOSED", now }), true);
});

test("the watchdog filters current failures before LIMIT so active exposure cannot be crowded out", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/trading-signals/trading-reliability.ts"), "utf8");
  const queryStart = source.indexOf("SELECT outbox.*, decision.status AS decision_status");
  const queryEnd = source.indexOf("ORDER BY outbox.updated_at DESC LIMIT 50", queryStart);
  assert.ok(queryStart >= 0 && queryEnd > queryStart);
  const query = source.slice(queryStart, queryEnd);
  assert.match(query, /decision\.status IN \('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING'\)/);
  assert.match(query, /outbox\.updated_at >= NOW\(\)-INTERVAL/);
});
