import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyTransferForOrderDiscovery,
  isLegacyRoundingMismatch,
  matchesPaymentUniqueSuffix,
  minimumAcceptedPaymentAmount,
  paymentUniqueSuffix,
  paymentAmountShortfall,
} from "../lib/payments/payment-amount-policy";
import {
  matchesExistingManualReviewEvidence,
  isPaymentMembershipActivatedSnapshot,
  manualGoodwillVerificationWindow,
  runAuditInsertWithRecovery,
  runManualGoodwillActivationCore,
  runRequiredGoodwillAuditFinalization,
} from "../lib/payments/manual-goodwill-core";
import { discoverTronTransferCandidate } from "../lib/payments/verify-chain";
import { buildAdminGoodwillRequest } from "../lib/payments/admin-goodwill-form-core";
import fs from "node:fs";

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

test("exact five-decimal suffix discovers a bounded underpayment but never classifies it as full", () => {
  const suffix = paymentUniqueSuffix(64.00209);
  assert.ok(Math.abs(suffix - 0.00209) < 0.0000001);
  assert.equal(matchesPaymentUniqueSuffix({ amount: 62.50209, uniqueSuffix: suffix }), true);
  assert.equal(classifyTransferForOrderDiscovery({
    expectedAmount: 64.00209,
    minimumAmount: 64,
    actualAmount: 62.50209,
    uniqueSuffix: suffix,
  }), "UNDERPAID_MANUAL_REVIEW");
  assert.equal(classifyTransferForOrderDiscovery({
    expectedAmount: 64.00209,
    minimumAmount: 64,
    actualAmount: 64.00209,
    uniqueSuffix: suffix,
  }), "FULL_AMOUNT");
});

test("wrong suffix, non-positive amount, and excessive shortfall are rejected", () => {
  const base = { expectedAmount: 64.00209, minimumAmount: 64, uniqueSuffix: 0.00209 };
  assert.equal(classifyTransferForOrderDiscovery({ ...base, actualAmount: 62.50208 }), "REJECT");
  assert.equal(classifyTransferForOrderDiscovery({ ...base, actualAmount: 0.00209 }), "REJECT");
  assert.equal(classifyTransferForOrderDiscovery({ ...base, actualAmount: 61.50209 }), "REJECT");
});

test("manual goodwill core records authoritative evidence before one membership grant and is idempotent", async () => {
  const calls: string[] = [];
  const order = {
    status: "expired",
    expectedAmount: 64.00209,
    minimumAmount: 64,
    uniqueSuffix: 0.00209,
    membershipExpiresAt: null,
    paidAmount: null,
  };
  const result = await runManualGoodwillActivationCore({
    order,
    claimedActualAmount: 62.50209,
    verifyAuthoritativeTransfer: async () => {
      calls.push("verify");
      return { amountNormalized: 62.50209 };
    },
    recordEvidence: async () => {
      calls.push("evidence");
      return order;
    },
    ensureEvidenceAudit: async () => { calls.push("evidence-audit"); },
    claimActivation: async (claimedOrder) => {
      calls.push("claim");
      return { kind: "ACQUIRED", ownerToken: "owner-1", order: claimedOrder, membershipAlreadyGranted: false };
    },
    grantMembership: async () => {
      calls.push("grant");
      return { membershipExpiresAt: "2026-09-13T00:00:00.000Z", grantApplied: true, grantSkipped: null };
    },
    finalizeActivation: async () => { calls.push("activate"); },
  });
  assert.deepEqual(calls, ["verify", "evidence", "evidence-audit", "claim", "grant", "activate"]);
  assert.equal(result.actualReceivedAmount, 62.50209);

  let alreadyPaidCalls = 0;
  const repeated = await runManualGoodwillActivationCore({
    order: { ...order, status: "paid", paidAmount: 62.50209, membershipExpiresAt: result.membershipExpiresAt },
    verifyAuthoritativeTransfer: async () => { alreadyPaidCalls += 1; return { amountNormalized: 62.50209 }; },
    recordEvidence: async () => { alreadyPaidCalls += 1; return order; },
    ensureEvidenceAudit: async () => { alreadyPaidCalls += 1; },
    claimActivation: async (claimedOrder) => { alreadyPaidCalls += 1; return { kind: "BUSY", order: claimedOrder }; },
    grantMembership: async () => { alreadyPaidCalls += 1; return { membershipExpiresAt: null, grantApplied: false, grantSkipped: null }; },
    finalizeActivation: async () => { alreadyPaidCalls += 1; },
  });
  assert.equal(repeated.alreadyActivated, true);
  assert.equal(alreadyPaidCalls, 0);
});

test("manual goodwill core rejects an untrusted claimed amount before evidence or membership writes", async () => {
  let writes = 0;
  await assert.rejects(() => runManualGoodwillActivationCore({
    order: {
      status: "expired",
      expectedAmount: 64.00209,
      minimumAmount: 64,
      uniqueSuffix: 0.00209,
      membershipExpiresAt: null,
      paidAmount: null,
    },
    claimedActualAmount: 64.00209,
    verifyAuthoritativeTransfer: async () => ({ amountNormalized: 62.50209 }),
    recordEvidence: async (transfer) => { writes += 1; return { status: "expired", expectedAmount: 64.00209, minimumAmount: 64, uniqueSuffix: 0.00209, membershipExpiresAt: null, paidAmount: transfer.amountNormalized }; },
    ensureEvidenceAudit: async () => { writes += 1; },
    claimActivation: async (claimedOrder) => { writes += 1; return { kind: "BUSY", order: claimedOrder }; },
    grantMembership: async () => { writes += 1; return { membershipExpiresAt: null, grantApplied: false, grantSkipped: null }; },
    finalizeActivation: async () => { writes += 1; },
  }), /权威金额不一致/);
  assert.equal(writes, 0);
});

test("missing required evidence audit is retried before claim and blocks every membership write on failure", async () => {
  let claimCalls = 0;
  let grantCalls = 0;
  let auditAttempts = 0;
  const invoke = () => runManualGoodwillActivationCore({
    order: { status: "manual_review", expectedAmount: 64.00209, minimumAmount: 64, uniqueSuffix: 0.00209, membershipExpiresAt: null, paidAmount: 62.50209 },
    verifyAuthoritativeTransfer: async () => ({ amountNormalized: 62.50209 }),
    recordEvidence: async (transfer) => ({ status: "manual_review", expectedAmount: 64.00209, minimumAmount: 64, uniqueSuffix: 0.00209, membershipExpiresAt: null, paidAmount: transfer.amountNormalized }),
    ensureEvidenceAudit: async () => {
      auditAttempts += 1;
      if (auditAttempts === 1) throw new Error("evidence audit unavailable");
    },
    claimActivation: async (claimedOrder) => { claimCalls += 1; return { kind: "ACQUIRED", ownerToken: "owner-retry", order: claimedOrder, membershipAlreadyGranted: false }; },
    grantMembership: async () => { grantCalls += 1; return { membershipExpiresAt: "2026-09-14T00:00:00.000Z", grantApplied: true, grantSkipped: null }; },
    finalizeActivation: async () => undefined,
  });
  await assert.rejects(invoke, /evidence audit unavailable/);
  assert.equal(claimCalls, 0);
  assert.equal(grantCalls, 0);
  await invoke();
  assert.equal(auditAttempts, 2);
  assert.equal(claimCalls, 1);
  assert.equal(grantCalls, 1);
});

test("concurrent goodwill requests allow only the CAS owner to enter membership grant", async () => {
  const order = { status: "expired", expectedAmount: 64.00209, minimumAmount: 64, uniqueSuffix: 0.00209, membershipExpiresAt: null, paidAmount: null };
  let ownerClaimed = false;
  let grants = 0;
  let finalizations = 0;
  const invoke = () => runManualGoodwillActivationCore({
    order,
    verifyAuthoritativeTransfer: async () => ({ amountNormalized: 62.50209 }),
    recordEvidence: async () => order,
    ensureEvidenceAudit: async () => undefined,
    claimActivation: async (claimedOrder) => {
      if (ownerClaimed) return { kind: "BUSY" as const, order: claimedOrder };
      ownerClaimed = true;
      return { kind: "ACQUIRED" as const, ownerToken: "owner", order: claimedOrder, membershipAlreadyGranted: false };
    },
    grantMembership: async () => {
      grants += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { membershipExpiresAt: "2026-09-14T00:00:00.000Z", grantApplied: true, grantSkipped: null };
    },
    finalizeActivation: async () => { finalizations += 1; },
  });
  const results = await Promise.allSettled([invoke(), invoke()]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(results.filter((item) => item.status === "rejected").length, 1);
  assert.equal(grants, 1);
  assert.equal(finalizations, 1);
});

test("crash after membership event recovers without adding a second membership period", async () => {
  const order = { status: "manual_review", expectedAmount: 64.00209, minimumAmount: 64, uniqueSuffix: 0.00209, membershipExpiresAt: null, paidAmount: 62.50209 };
  let membershipPeriods = 0;
  let eventApplied = false;
  let attempts = 0;
  const invoke = () => runManualGoodwillActivationCore({
    order,
    verifyAuthoritativeTransfer: async () => ({ amountNormalized: 62.50209 }),
    recordEvidence: async () => order,
    ensureEvidenceAudit: async () => undefined,
    claimActivation: async (claimedOrder) => ({
      kind: "ACQUIRED",
      ownerToken: `owner-${attempts + 1}`,
      order: claimedOrder,
      membershipAlreadyGranted: eventApplied,
    }),
    grantMembership: async () => {
      if (!eventApplied) {
        eventApplied = true;
        membershipPeriods += 1;
        return { membershipExpiresAt: "2026-09-14T00:00:00.000Z", grantApplied: true, grantSkipped: null };
      }
      return { membershipExpiresAt: "2026-09-14T00:00:00.000Z", grantApplied: false, grantSkipped: "already_applied" };
    },
    finalizeActivation: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("audit unavailable after grant");
    },
  });
  await assert.rejects(invoke, /audit unavailable/);
  const recovered = await invoke();
  assert.equal(recovered.grantSkipped, "already_applied");
  assert.equal(membershipPeriods, 1);
  assert.equal(attempts, 2);
});

test("required audit failure leaves recoverable pending state and never reports completed", async () => {
  const events: string[] = [];
  await assert.rejects(() => runRequiredGoodwillAuditFinalization({
    persistAuditPending: async () => { events.push("AUDIT_PENDING"); },
    writeRequiredAudit: async () => { events.push("AUDIT_FAILED"); throw new Error("insert failed"); },
    persistCompleted: async () => { events.push("COMPLETED"); },
  }), /insert failed/);
  assert.deepEqual(events, ["AUDIT_PENDING", "AUDIT_FAILED"]);

  await runRequiredGoodwillAuditFinalization({
    persistAuditPending: async () => { events.push("RETRY_PENDING"); },
    writeRequiredAudit: async () => { events.push("AUDIT_SAVED"); },
    persistCompleted: async () => { events.push("COMPLETED"); },
  });
  assert.deepEqual(events.slice(-3), ["RETRY_PENDING", "AUDIT_SAVED", "COMPLETED"]);
});

test("audit writer treats returned insert errors as failures and accepts only authoritative recovery", async () => {
  let lookups = 0;
  await assert.rejects(() => runAuditInsertWithRecovery({
    idempotencyKey: "audit-1",
    lookupExisting: async () => { lookups += 1; return false; },
    insert: async () => ({ error: "database unavailable" }),
  }), /database unavailable/);
  assert.equal(lookups, 2);

  let recoveredLookups = 0;
  await runAuditInsertWithRecovery({
    idempotencyKey: "audit-2",
    lookupExisting: async () => { recoveredLookups += 1; return recoveredLookups === 2; },
    insert: async () => ({ error: "ambiguous network response" }),
  });
  assert.equal(recoveredLookups, 2);
});

test("goodwill verification ends at the original expiry and activated manual-review is displayed as membership active", () => {
  const window = manualGoodwillVerificationWindow({
    createdAt: "2026-08-14T12:46:04.000Z",
    expiresAt: "2026-08-14T13:31:04.000Z",
  });
  assert.equal(window.notBefore.toISOString(), "2026-08-14T12:41:04.000Z");
  assert.equal(window.notAfter.toISOString(), "2026-08-14T13:31:04.000Z");
  assert.equal(isPaymentMembershipActivatedSnapshot({ status: "manual_review", membershipGranted: true }), true);
  assert.equal(isPaymentMembershipActivatedSnapshot({ status: "manual_review", membershipGranted: false }), false);
});

test("admin goodwill form requires explicit confirmation and builds only the existing audited action", () => {
  const valid = {
    orderId: "123e4567-e89b-42d3-a456-426614174000",
    txHash: "A".repeat(64),
    claimedActualAmount: "62.502090",
    reason: "Binance 提现手续费导致少付，本次客服一次性特批",
    confirmed: true,
  };
  const built = buildAdminGoodwillRequest(valid);
  assert.equal(built.ok, true);
  if (built.ok) {
    assert.deepEqual(built.payload, {
      orderId: valid.orderId,
      action: "activate_goodwill_underpayment",
      txHash: "a".repeat(64),
      claimedActualAmount: 62.50209,
      reason: valid.reason,
      confirm: true,
    });
  }
  assert.equal(buildAdminGoodwillRequest({ ...valid, confirmed: false }).ok, false);
  assert.equal(buildAdminGoodwillRequest({ ...valid, orderId: "not-a-uuid" }).ok, false);
  assert.equal(buildAdminGoodwillRequest({ ...valid, txHash: "a".repeat(63) }).ok, false);
  assert.equal(buildAdminGoodwillRequest({ ...valid, reason: "太短" }).ok, false);
  assert.equal(buildAdminGoodwillRequest({ ...valid, claimedActualAmount: "-1" }).ok, false);
});

test("duplicate chain evidence is idempotent only for the same order and authoritative transfer", () => {
  const input = {
    existing: {
      matchedOrderId: "order-1",
      amountNormalized: 62.50209,
      recipientAddress: "TRecipient",
      tokenContract: "TContract",
    },
    orderId: "order-1",
    amountNormalized: 62.50209,
    recipientAddress: "TRecipient",
    tokenContract: "TContract",
  };
  assert.equal(matchesExistingManualReviewEvidence(input), true);
  assert.equal(matchesExistingManualReviewEvidence({ ...input, orderId: "order-2" }), false);
  assert.equal(matchesExistingManualReviewEvidence({ ...input, amountNormalized: 64.00209 }), false);
  assert.equal(matchesExistingManualReviewEvidence({ ...input, recipientAddress: "TOther" }), false);
});

test("TRON account discovery returns a manual-review candidate and rejects wrong address, future, or ambiguous matches", async () => {
  const originalFetch = globalThis.fetch;
  const now = Date.now();
  const recipient = "TTwZUWZiQfbMm9iyL2iT9qDivWqHttvmZ2";
  const contract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  const row = (overrides: Record<string, unknown> = {}) => ({
    transaction_id: "a".repeat(64),
    block_timestamp: now - 60_000,
    to: recipient,
    type: "Transfer",
    value: "62502090",
    token_info: { address: contract, decimals: 6, symbol: "USDT" },
    ...overrides,
  });
  const expected = {
    recipientAddress: recipient,
    tokenContract: contract,
    expectedAmount: 64.00209,
    minimumAmount: 64,
    uniqueSuffix: 0.00209,
    notBefore: new Date(now - 10 * 60_000),
    notAfter: new Date(now + 10 * 60_000),
  };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ data: [row()] }), { status: 200 });
    const candidate = await discoverTronTransferCandidate(expected);
    assert.equal(candidate?.classification, "UNDERPAID_MANUAL_REVIEW");
    assert.equal(candidate?.amountNormalized, 62.50209);

    globalThis.fetch = async () => new Response(JSON.stringify({ data: [row({ value: "64002090" })] }), { status: 200 });
    const fullCandidate = await discoverTronTransferCandidate(expected);
    assert.equal(fullCandidate?.classification, "FULL_AMOUNT");
    assert.equal(fullCandidate?.amountNormalized, 64.00209);

    globalThis.fetch = async () => new Response(JSON.stringify({ data: [row({ to: "TWrongAddress" })] }), { status: 200 });
    assert.equal(await discoverTronTransferCandidate(expected), null);

    globalThis.fetch = async () => new Response(JSON.stringify({ data: [row({ token_info: { decimals: 6, symbol: "USDT" } })] }), { status: 200 });
    assert.equal(await discoverTronTransferCandidate(expected), null);

    globalThis.fetch = async () => new Response(JSON.stringify({ data: [row({ block_timestamp: now + 60_000 })] }), { status: 200 });
    assert.equal(await discoverTronTransferCandidate(expected), null);

    globalThis.fetch = async () => new Response(JSON.stringify({ data: [row(), row({ transaction_id: "b".repeat(64) })] }), { status: 200 });
    await assert.rejects(() => discoverTronTransferCandidate(expected), /Multiple matching TRON transfers/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin goodwill path remains authenticated and automatic underpayment never reaches membership finalization", () => {
  const route = fs.readFileSync("app/api/admin/payments/auto-orders/route.ts", "utf8");
  const processSource = fs.readFileSync("lib/payments/process-auto-payment.ts", "utf8");
  const checkout = fs.readFileSync("components/payments/CheckoutClient.tsx", "utf8");
  const orderStatus = fs.readFileSync("app/api/payments/order-status/route.ts", "utf8");
  const accountOrders = fs.readFileSync("app/account/orders/page.tsx", "utf8");
  const adminPayments = fs.readFileSync("app/admin/payments/page.tsx", "utf8");
  const adminSummary = fs.readFileSync("lib/payments/admin-payment-summary.ts", "utf8");
  const orderStore = fs.readFileSync("lib/payments/auto-payment-orders.ts", "utf8");
  const goodwillTool = fs.readFileSync("components/admin/AdminGoodwillUnderpaymentTool.tsx", "utf8");
  const adminPage = fs.readFileSync("app/admin/payments/page.tsx", "utf8");
  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /activate_goodwill_underpayment/);
  assert.match(route, /paidAmount \+ 0\.0000001 < order\.expectedAmount/);
  assert.match(processSource, /markOrderException\(claimed, "underpaid"[\s\S]*activated: false/);
  assert.match(checkout, /网站必须实际到账/);
  assert.match(checkout, /以交易所最终“实际到账”预览为准/);
  assert.match(orderStatus, /isAutoPaymentMembershipActivated\(order\)/);
  assert.match(orderStatus, /goodwillState:/);
  assert.match(orderStatus, /auditComplete:/);
  assert.match(accountOrders, /少付特批已开通 · Goodwill approved/);
  assert.match(accountOrders, /特批审计待完成/);
  assert.match(adminPayments, /少付特批已开通/);
  assert.match(adminPayments, /审计待补/);
  assert.match(adminSummary, /autoOrders\.filter\(isAutoPaymentMembershipActivated\)/);
  assert.match(orderStore, /status:\s*"manual_review"[\s\S]*result:\s*"manual_approved_underpaid"/);
  assert.doesNotMatch(orderStore, /action:\s*"manual_goodwill_underpayment"[\s\S]{0,120}result:\s*finalStatus/);
  assert.match(orderStore, /manual-underpayment-evidence:\$\{order\.id\}/);
  assert.match(orderStore, /manual-full-payment:\$\{order\.id\}/);
  assert.match(route, /isAutoPaymentMembershipActivated\(order\)[\s\S]*ensureManualFullPaymentAudit\(order\)/);
  assert.match(checkout, /goodwillState === "COMPLETED" && goodwillAuditComplete/);
  assert.match(checkout, /会员已开通，特批审计待完成/);
  assert.match(goodwillTool, /window\.confirm/);
  assert.match(goodwillTool, /actualReceivedAmount/);
  assert.match(goodwillTool, /Goodwill approved/);
  assert.match(goodwillTool, /服务端会用链上权威金额覆盖并比对/);
  assert.match(adminPage, /<AdminGoodwillUnderpaymentTool \/>/);
});
