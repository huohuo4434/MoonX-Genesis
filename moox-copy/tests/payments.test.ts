import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { computeMembershipExpiresAt } from "../lib/payments/membership-dates";
import { validateTxHash } from "../lib/payments/verify-chain";

describe("payments", () => {
  test("validateTxHash accepts TRON and BSC formats", () => {
    assert.equal(validateTxHash("TRON", "a".repeat(64)), true);
    assert.equal(validateTxHash("BSC", `0x${"b".repeat(64)}`), true);
    assert.equal(validateTxHash("TRON", "0x123"), false);
    assert.equal(validateTxHash("BSC", "a".repeat(64)), false);
  });

  test("computeMembershipExpiresAt extends from active expiry", () => {
    const paidAt = new Date("2026-07-27T12:00:00Z");
    const current = "2026-08-10T12:00:00Z";
    const next = computeMembershipExpiresAt(current, 30, paidAt);
    assert.equal(next.toISOString().slice(0, 10), "2026-09-09");
  });

  test("computeMembershipExpiresAt starts from paidAt when expired", () => {
    const paidAt = new Date("2026-07-27T12:00:00Z");
    const current = "2026-06-01T12:00:00Z";
    const next = computeMembershipExpiresAt(current, 30, paidAt);
    assert.equal(next.toISOString().slice(0, 10), "2026-08-26");
  });
});
