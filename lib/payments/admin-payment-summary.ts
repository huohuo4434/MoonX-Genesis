import "server-only";

import { isAutoPaymentMembershipActivated, isCompletedManualGoodwill, listAllAutoPaymentOrders, type AutoPaymentOrder } from "@/lib/payments/auto-payment-orders";
import { listPaymentOrders, type PaymentOrderRecord } from "@/lib/payments/payment-orders-store";

export function autoPaymentNeedsAdminAttention(order: AutoPaymentOrder): boolean {
  if (isCompletedManualGoodwill(order) || ["paid", "overpaid"].includes(order.status)) return false;
  if (order.metadata.membershipGranted) return true;
  return Boolean(order.txHash) && ["underpaid", "manual_review", "rejected", "expired"].includes(order.status);
}

export type AdminPaymentQueueSummary = {
  autoOrders: AutoPaymentOrder[];
  legacyOrders: PaymentOrderRecord[];
  autoAttention: AutoPaymentOrder[];
  autoProcessing: AutoPaymentOrder[];
  autoPaid: AutoPaymentOrder[];
  legacyPending: PaymentOrderRecord[];
  legacyApproved: PaymentOrderRecord[];
  legacyRejected: PaymentOrderRecord[];
  legacyTests: PaymentOrderRecord[];
  pendingCount: number;
};

/**
 * One read-only aggregation for every admin surface that displays payment queue counts.
 * This deliberately does not mutate historical orders or memberships.
 */
export async function getAdminPaymentQueueSummary(limit = 200): Promise<AdminPaymentQueueSummary> {
  const [autoOrders, legacyOrders] = await Promise.all([
    listAllAutoPaymentOrders(limit),
    listPaymentOrders(),
  ]);

  const autoAttention = autoOrders.filter(autoPaymentNeedsAdminAttention);
  const autoProcessing = autoOrders.filter((order) => order.status === "pending" || order.status === "verifying");
  const autoPaid = autoOrders.filter(isAutoPaymentMembershipActivated);
  const production = legacyOrders.filter((order) => !order.isTest);
  const legacyPending = production.filter((order) => order.status === "pending");
  const legacyApproved = production.filter((order) => order.status === "approved");
  const legacyRejected = production.filter((order) => order.status === "rejected");
  const legacyTests = legacyOrders.filter((order) => order.isTest);

  return {
    autoOrders,
    legacyOrders,
    autoAttention,
    autoProcessing,
    autoPaid,
    legacyPending,
    legacyApproved,
    legacyRejected,
    legacyTests,
    pendingCount: autoAttention.length + autoProcessing.length + legacyPending.length,
  };
}
