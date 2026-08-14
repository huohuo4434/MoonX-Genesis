import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("SPCX featured research is rendered once outside the asset-card loop", () => {
  const source = read("components/conviction/ConvictionListClient.tsx");
  const renderCount = (source.match(/<SpcxWatchlistFeature\s*\/>/g) ?? []).length;
  assert.equal(renderCount, 1);
  assert.equal(/palette\./.test(source), false);
  assert.match(source, /WATCHLIST_ACCENTS\[card\.slug\]\s*\?\?\s*DEFAULT_WATCHLIST_ACCENT/);
});

test("automatic payment flow accepts exchange rounding and emails the administrator", () => {
  const processSource = read("lib/payments/process-auto-payment.ts");
  const submitSource = read("app/api/payments/auto-submit/route.ts");
  const verifySource = read("lib/payments/verify-chain.ts");
  assert.match(processSource, /minimumAcceptedPaymentAmount/);
  assert.match(verifySource, /below minimum accepted amount/);
  assert.doesNotMatch(verifySource, /exceeds order amount/);
  assert.match(submitSource, /kind:\s*"hash_submitted"/);
  assert.match(submitSource, /notifyAdminAutoPayment/);
});

test("failed automatic payments remain recoverable from the admin dashboard", () => {
  const routeSource = read("app/api/admin/payments/auto-orders/route.ts");
  const pageSource = read("app/admin/payments/page.tsx");
  const actionsSource = read("components/admin/AdminAutoPaymentActions.tsx");
  const cronSource = read("app/api/cron/reconcile-payments/route.ts");
  assert.match(routeSource, /"retry",\s*"activate",\s*"activate_goodwill_underpayment",\s*"resend_admin_email"/);
  assert.match(actionsSource, /确认到账并手动开通/);
  assert.match(pageSource, /交易哈希/);
  assert.match(pageSource, /管理员邮件/);
  assert.match(cronSource, /recoverLegacyAmountMismatchOrders/);
  assert.match(cronSource, /retryFailedAdminPaymentNotifications/);
  assert.match(read("lib/payments/auto-payment-orders.ts"), /paid_amount:\s*paidAmount/);
  assert.match(read("lib/payments/auto-payment-orders.ts"), /actualReceivedAmount:\s*paidAmount/);
});

test("btckik remains observation-only and cannot influence automated trade overlays", () => {
  const source = read("lib/trading-signals/external-analyst-signals.ts");
  assert.match(source, /if \(source === "BTCKIK"\) return false/);
  assert.match(source, /username:\s*"btckik"/);
  assert.match(read("config/navigation.ts"), /alphaFeed:\s*"\/member\/alpha-feed"/);
});


test("manual membership activation reconciles payment without adding days twice", () => {
  const finalizer = read("lib/payments/finalize-auto-payment.ts");
  assert.match(finalizer, /wasOrderAlreadyFulfilledByManualMembership/);
  assert.match(finalizer, /manual_activation_metadata_already_applied/);
  assert.match(finalizer, /membershipExpiresAt && grantApplied/);
});
