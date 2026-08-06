import assert from "node:assert/strict";
import test from "node:test";
import {
  wasOrderAlreadyFulfilledByManualMembership,
} from "../lib/payments/manual-payment-dedupe";

const orderCreatedAt = "2026-08-06T03:00:00.000Z";
const verifiedAt = "2026-08-06T12:00:00.000Z";

test("first-time buyer manually activated after order is not granted twice", () => {
  assert.equal(
    wasOrderAlreadyFulfilledByManualMembership({
      orderPlan: "MONTHLY",
      orderCreatedAt,
      verifiedAt,
      membershipPlan: "MONTHLY",
      membershipStartedAt: "2026-08-06T04:05:00.000Z",
      membershipExpiresAt: "2026-09-05T04:05:00.000Z",
    }),
    true
  );
});

test("existing member renewal remains eligible for an extension", () => {
  assert.equal(
    wasOrderAlreadyFulfilledByManualMembership({
      orderPlan: "MONTHLY",
      orderCreatedAt,
      verifiedAt,
      membershipPlan: "MONTHLY",
      membershipStartedAt: "2026-07-01T00:00:00.000Z",
      membershipExpiresAt: "2026-09-01T00:00:00.000Z",
    }),
    false
  );
});

test("different plan or expired metadata cannot suppress a legitimate grant", () => {
  assert.equal(
    wasOrderAlreadyFulfilledByManualMembership({
      orderPlan: "YEARLY",
      orderCreatedAt,
      verifiedAt,
      membershipPlan: "MONTHLY",
      membershipStartedAt: "2026-08-06T04:05:00.000Z",
      membershipExpiresAt: "2026-09-05T04:05:00.000Z",
    }),
    false
  );
  assert.equal(
    wasOrderAlreadyFulfilledByManualMembership({
      orderPlan: "MONTHLY",
      orderCreatedAt,
      verifiedAt,
      membershipPlan: "MONTHLY",
      membershipStartedAt: "2026-08-06T04:05:00.000Z",
      membershipExpiresAt: "2026-08-06T05:00:00.000Z",
    }),
    false
  );
});
