import "server-only";
import { deliverConsultationQuotaForPaidOrder } from "./store";

export async function deliverPaidOrderConsultationQuota(orderId: string) {
  try { await deliverConsultationQuotaForPaidOrder(orderId); return { delivered: true as const, error: null }; }
  catch (error) {
    // Membership activation is authoritative and must not be rolled back by this recoverable add-on.
    void error;
    return { delivered: false as const, error: "CONSULTATION_QUOTA_DELIVERY_PENDING" };
  }
}
