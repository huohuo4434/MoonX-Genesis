import assert from "node:assert/strict";
import test from "node:test";
import {
  isLegacyRoundingMismatch,
  minimumAcceptedPaymentAmount,
  paymentAmountShortfall,
} from "../lib/payments/payment-amount-policy";

test("founder payment accepts the discounted base amount when exchange removes the suffix", () => {
  assert.equal(minimumAcceptedPaymentAmount({ plan: "MONTHLY", discountPercent: 20 }), 64);
  assert.equal(paymentAmountShortfall({ paidAmount: 64, minimumAmount: 64 }), 0);
});

test("true underpayment remains blocked", () => {
  assert.equal(paymentAmountShortfall({ paidAmount: 63.99, minimumAmount: 64 }), 0.01);
});

test("legacy amount mismatch orders are eligible for automatic recovery", () => {
  assert.equal(isLegacyRoundingMismatch("Payment amount is less than order amount (64/64.00321)"), true);
  assert.equal(isLegacyRoundingMismatch("Transfer recipient does not match order receive address"), false);
});
