import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyProtectionOutboxPreflight } from "../lib/bitget/protection-outbox-preflight-core";

test("a terminal or missing decision without an exchange position reconciles its stale protection task", () => {
  for (const decisionStatus of ["BLOCKED", "CLOSED", "ERROR", "OBSERVING", null]) {
    assert.equal(classifyProtectionOutboxPreflight({ decisionStatus, matchingExchangePosition: false }), "RECONCILE_NO_POSITION");
  }
});

test("a terminal or missing decision with exchange exposure stays fail-closed instead of attaching stale levels", () => {
  for (const decisionStatus of ["BLOCKED", "CLOSED", "ERROR", "OBSERVING", null]) {
    assert.equal(
      classifyProtectionOutboxPreflight({ decisionStatus, matchingExchangePosition: true }),
      "BLOCK_TERMINAL_DECISION_WITH_POSITION"
    );
  }
});

test("only explicitly active decisions continue through the existing protection path", () => {
  for (const decisionStatus of ["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING"]) {
    assert.equal(classifyProtectionOutboxPreflight({ decisionStatus, matchingExchangePosition: false }), "PROCEED");
  }
});

test("the executor checks decision and exchange truth before remote protection submission", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/bitget/demo-client.ts"), "utf8");
  const branchStart = source.indexOf('if (acquired.action_type === "PLACE_PROTECTION")');
  const submitAt = source.indexOf("submitProtectionOrderDirect", branchStart);
  assert.ok(branchStart >= 0 && submitAt > branchStart);
  const preSubmit = source.slice(branchStart, submitAt);
  assert.match(preSubmit, /getOutboxDecisionStatus\(acquired\.decision_id\)/);
  assert.match(preSubmit, /getBitgetDemoCurrentPositions\(\)/);
  assert.match(preSubmit, /status: "RECONCILED"/);
  assert.match(preSubmit, /BLOCK_TERMINAL_DECISION_WITH_POSITION/);
});
