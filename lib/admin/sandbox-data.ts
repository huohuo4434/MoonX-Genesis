import type { AuthUserView } from "@/lib/auth/permissions";
import type { PaymentOrderRecord } from "@/lib/payments/payment-orders-store";

/** High-confidence sandbox patterns only; ambiguous real users are never hidden. */
export function isLikelySandboxEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  const [local = "", domain = ""] = value.split("@");
  return ["example.com", "example.net", "example.org", "test.local", "localhost"].includes(domain) || /^(test|demo|qa|sandbox|e2e)[+._-]/.test(local) || /\+(test|demo|qa|sandbox)$/.test(local);
}
export function isSandboxUser(user: AuthUserView): boolean { return isLikelySandboxEmail(user.email); }
export function isSandboxOrder(order: PaymentOrderRecord): boolean { return order.isTest || isLikelySandboxEmail(order.userEmail); }
