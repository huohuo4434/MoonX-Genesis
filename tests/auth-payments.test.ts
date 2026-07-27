import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getAdminEmails, isAdminEmail } from "../lib/auth/admin-emails.ts";
import { validateTxHash } from "../lib/payments/verify-chain.ts";

describe("admin bootstrap", () => {
  test("isAdminEmail recognizes configured admin", () => {
    process.env.MOONX_ADMIN_EMAILS = "jackzwin999@gmail.com";
    assert.equal(isAdminEmail("jackzwin999@gmail.com"), true);
    assert.equal(isAdminEmail("other@example.com"), false);
    assert.ok(getAdminEmails().includes("jackzwin999@gmail.com"));
  });
});

describe("payment verify guards", () => {
  test("rejects invalid TRON tx hash formats used in e2e", () => {
    assert.equal(validateTxHash("TRON", "not-a-real-hash"), false);
    assert.equal(validateTxHash("TRON", "0x123"), false);
    assert.equal(validateTxHash("TRON", "deadbeef".repeat(8)), true);
  });

  test("rejects BSC hash without 0x prefix", () => {
    assert.equal(validateTxHash("BSC", "cafe".repeat(16)), false);
    assert.equal(validateTxHash("BSC", `0x${"cafe".repeat(16)}`), true);
  });
});
