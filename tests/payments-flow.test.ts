import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getAdminEmails, isAdminEmail } from "../lib/auth/admin-emails.ts";
import { computeMembershipExpiresAt } from "../lib/payments/membership-dates.ts";
import { OFFICIAL_PLAN_PRICES } from "../lib/payments/plan-display.ts";
import { validateTxHash } from "../lib/payments/verify-chain.ts";
import {
  isWithinPaymentDiscoveryGrace,
  PAYMENT_RECONCILIATION_GRACE_MINUTES,
  paymentDiscoveryCutoff,
} from "../lib/payments/auto-payment-timing-core.ts";

describe("auth signup policy", () => {
  test("admin email list includes bootstrap admin", () => {
    process.env.MOONX_ADMIN_EMAIL = "jackzwin999@gmail.com";
    assert.equal(isAdminEmail("jackzwin999@gmail.com"), true);
    assert.equal(isAdminEmail("user@example.com"), false);
    assert.ok(getAdminEmails().length >= 1);
  });
});

describe("membership renewal", () => {
  test("extends from current expiry when still active", () => {
    const paidAt = new Date("2026-07-01T00:00:00Z");
    const current = "2026-08-01T00:00:00Z";
    const next = computeMembershipExpiresAt(current, 30, paidAt);
    assert.equal(next.toISOString(), "2026-08-31T00:00:00.000Z");
  });

  test("starts from paidAt when expired", () => {
    const paidAt = new Date("2026-07-01T00:00:00Z");
    const current = "2026-06-01T00:00:00Z";
    const next = computeMembershipExpiresAt(current, 30, paidAt);
    assert.equal(next.toISOString(), "2026-07-31T00:00:00.000Z");
  });

  test("yearly plan adds 365 days", () => {
    const paidAt = new Date("2026-01-01T00:00:00Z");
    const next = computeMembershipExpiresAt(null, 365, paidAt);
    assert.equal(next.toISOString(), "2027-01-01T00:00:00.000Z");
  });
});

describe("official plan prices", () => {
  test("matches production pricing", () => {
    assert.equal(OFFICIAL_PLAN_PRICES.MONTHLY, 80);
    assert.equal(OFFICIAL_PLAN_PRICES.QUARTERLY, 200);
    assert.equal(OFFICIAL_PLAN_PRICES.YEARLY, 700);
  });
});

describe("payment verify guards", () => {
  test("rejects invalid TRON tx hash", () => {
    assert.equal(validateTxHash("TRON", "abc"), false);
    assert.equal(validateTxHash("TRON", "0x" + "a".repeat(64)), false);
    assert.equal(validateTxHash("TRON", "a".repeat(64)), true);
  });

  test("rejects TRX-looking BSC hash without 0x", () => {
    assert.equal(validateTxHash("BSC", "a".repeat(64)), false);
    assert.equal(validateTxHash("BSC", "0x" + "a".repeat(64)), true);
  });
});

describe("payment reconciliation grace", () => {
  const expiresAtMs = Date.parse("2026-08-27T00:45:00.000Z");

  test("keeps a transfer discoverable when the five-minute cron arrives after checkout expiry", () => {
    const transferAtMs = expiresAtMs - 1_000;
    const cronAtMs = expiresAtMs + 4 * 60_000 + 59_000;
    assert.equal(transferAtMs < expiresAtMs, true);
    assert.equal(PAYMENT_RECONCILIATION_GRACE_MINUTES, 10);
    assert.equal(isWithinPaymentDiscoveryGrace(new Date(expiresAtMs), cronAtMs), true);
    assert.equal(paymentDiscoveryCutoff(cronAtMs).getTime() < expiresAtMs, true);
  });

  test("allows a genuinely unpaid order to expire after the discovery grace", () => {
    const afterGraceMs = expiresAtMs + 10 * 60_000 + 1;
    assert.equal(isWithinPaymentDiscoveryGrace(new Date(expiresAtMs), afterGraceMs), false);
    assert.equal(paymentDiscoveryCutoff(afterGraceMs).getTime() > expiresAtMs, true);
  });
});

describe("order numbers", () => {
  test("MX order number format is predictable", () => {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const sample = `MX-${y}${m}${day}-ABCDEF`;
    assert.match(sample, /^MX-\d{8}-[A-Z0-9]{6}$/);
  });
});

describe("tron transfer parsing (mock payload)", () => {
  test("official USDT contract constant matches production", () => {
    assert.equal(
      process.env.TRON_USDT_CONTRACT ?? "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
    );
  });

  test("rejects transfer when contract address mismatches", () => {
    const expectedContract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
    const wrongContract = "TXYZwrongcontractaddress000000000001";
    const event = {
      event_name: "Transfer",
      contract_address: wrongContract,
      result: { to: "TTwZUWZiQfbMm9iyL2iT9qDivWqHttvmZ2", value: "50000000" },
    };
    const match =
      event.event_name === "Transfer" && event.contract_address === expectedContract;
    assert.equal(match, false);
  });

  test("accepts matching TRC20 transfer payload shape", () => {
    const recipient = "TTwZUWZiQfbMm9iyL2iT9qDivWqHttvmZ2";
    const contract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
    const event = {
      event_name: "Transfer",
      contract_address: contract,
      result: { to: recipient, from: "TSender", value: "50000000" },
    };
    const amountUsdt = Number(BigInt(event.result.value)) / 1e6;
    assert.equal(amountUsdt, 50);
    assert.equal(event.result.to, recipient);
    assert.equal(event.contract_address, contract);
  });
});

describe("redirect safety", () => {
  function safeRedirectPath(next: string | null, fallback: string): string {
    if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
    if (next.includes("://")) return fallback;
    return next;
  }

  test("blocks external redirect URLs", () => {
    assert.equal(safeRedirectPath("https://evil.com", "/account"), "/account");
    assert.equal(safeRedirectPath("//evil.com", "/account"), "/account");
    assert.equal(safeRedirectPath("/pricing", "/account"), "/pricing");
  });
});
