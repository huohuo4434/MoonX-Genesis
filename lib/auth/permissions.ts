import "server-only";

import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/is-admin";
import { redirect } from "next/navigation";

export type AppRole = "user" | "admin";
export type MembershipStatus = "inactive" | "active" | "expired";
export type MembershipPlan = "MONTHLY" | "QUARTERLY" | "YEARLY";
export type PaymentNetwork = "TRC20" | "BEP20";
export type FounderDiscountPercent = 10 | 20;
export type FounderDiscountStatus = "active" | "forfeited";

export interface PendingPayment {
  paymentId: string;
  userId: string;
  email: string;
  plan: MembershipPlan;
  network: PaymentNetwork;
  tx_hash: string;
  amount: number;
  list_price?: number;
  discount_percent?: 10 | 20 | 0;
  founder_rank?: number | null;
  submitted_at: string;
  status: "pending";
  notificationStatus?: "sent" | "email_failed" | "email_not_configured";
  isSystemTest?: boolean;
}

export interface PaymentHistoryItem {
  paymentId: string;
  plan: MembershipPlan;
  network: PaymentNetwork;
  tx_hash: string;
  amount: number;
  list_price?: number;
  discount_percent?: 10 | 20 | 0;
  founder_rank?: number | null;
  submitted_at: string;
  reviewed_at?: string;
  status: "approved" | "rejected" | "pending";
  notificationStatus?: "sent" | "email_failed" | "email_not_configured";
  isSystemTest?: boolean;
}

export interface AppMetadata {
  role?: AppRole;
  membership_status?: MembershipStatus;
  membership_plan?: MembershipPlan | null;
  membership_started_at?: string | null;
  membership_expires_at?: string | null;
  pending_payment?: PendingPayment | null;
  payment_history?: PaymentHistoryItem[] | null;
  display_name?: string | null;
  referral_code?: string | null;
  referred_by_code?: string | null;
  referred_by_user_id?: string | null;
  founder_member_rank?: number | null;
  founder_discount_percent?: FounderDiscountPercent | null;
  founder_discount_status?: FounderDiscountStatus | null;
  founder_discount_granted_at?: string | null;
  founder_discount_forfeited_at?: string | null;
}

export interface AuthUserView {
  id: string;
  email: string;
  created_at: string;
  app_metadata: AppMetadata;
}

export function readAppMetadata(user: { app_metadata?: Record<string, unknown> } | null | undefined): AppMetadata {
  const raw = (user?.app_metadata ?? {}) as AppMetadata;
  return {
    role: raw.role === "admin" ? "admin" : "user",
    membership_status: raw.membership_status ?? "inactive",
    membership_plan: raw.membership_plan ?? null,
    membership_started_at: raw.membership_started_at ?? null,
    membership_expires_at: raw.membership_expires_at ?? null,
    pending_payment: raw.pending_payment ?? null,
    payment_history: raw.payment_history ?? null,
    display_name: raw.display_name ?? null,
    referral_code: raw.referral_code ?? null,
    referred_by_code: raw.referred_by_code ?? null,
    referred_by_user_id: raw.referred_by_user_id ?? null,
    founder_member_rank: typeof raw.founder_member_rank === "number" ? raw.founder_member_rank : null,
    founder_discount_percent: raw.founder_discount_percent === 20 || raw.founder_discount_percent === 10 ? raw.founder_discount_percent : null,
    founder_discount_status: raw.founder_discount_status === "active" || raw.founder_discount_status === "forfeited" ? raw.founder_discount_status : null,
    founder_discount_granted_at: raw.founder_discount_granted_at ?? null,
    founder_discount_forfeited_at: raw.founder_discount_forfeited_at ?? null,
  };
}

export function toAuthUserView(user: User): AuthUserView {
  return {
    id: user.id,
    email: (user.email ?? "").toLowerCase(),
    created_at: user.created_at,
    app_metadata: readAppMetadata(user),
  };
}

async function loadCurrentUser(): Promise<AuthUserView | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  // Prefer fresh app_metadata from admin API when available
  const admin = getAdminClient();
  if (admin) {
    const { data: full } = await admin.auth.admin.getUserById(data.user.id);
    if (full.user) return toAuthUserView(full.user);
  }
  return toAuthUserView(data.user);
}

/** Deduplicate repeated user reads during the same server render/request. */
export const getCurrentUser = cache(loadCurrentUser);

export function isAdmin(user: AuthUserView | null | undefined): boolean {
  if (!user) return false;
  return isAdminUser({
    email: user.email,
    role: user.app_metadata?.role,
    isAdmin: user.app_metadata?.role === "admin",
  });
}

export function isActiveMember(user: AuthUserView | null | undefined): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const meta = user.app_metadata;
  const expiry = meta.membership_expires_at ? new Date(meta.membership_expires_at) : null;
  if (expiry instanceof Date && !Number.isNaN(expiry.getTime())) {
    return expiry.getTime() > Date.now();
  }
  return meta.membership_status === "active";
}

export function canAccessMemberContent(user: AuthUserView | null | undefined): boolean {
  return isAdmin(user) || isActiveMember(user);
}

export async function requireAdmin(): Promise<AuthUserView | null> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return null;
  return user;
}

export async function requireMember(): Promise<AuthUserView | null> {
  const user = await getCurrentUser();
  if (!user || !canAccessMemberContent(user)) return null;
  return user;
}

export async function requireAdminOrRedirect(next = "/admin"): Promise<AuthUserView> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!isAdmin(user)) redirect("/forbidden");
  return user;
}

export const PLAN_DAYS: Record<MembershipPlan, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

export const PLAN_PRICES: Record<MembershipPlan, number> = {
  MONTHLY: 80,
  QUARTERLY: 200,
  YEARLY: 700,
};

export const PLAN_LABELS: Record<MembershipPlan, string> = {
  MONTHLY: "月会员",
  QUARTERLY: "季度会员",
  YEARLY: "年度会员",
};

export { computeNewExpiry } from "@/lib/payments/membership-dates";

export async function listAllAuthUsers(): Promise<AuthUserView[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data?.users) return [];
  return data.users.filter((u) => Boolean(u.email)).map(toAuthUserView);
}

export async function updateUserAppMetadata(
  userId: string,
  patch: Partial<AppMetadata>
): Promise<AppMetadata> {
  const admin = getAdminClient();
  if (!admin) throw new Error("服务未配置");

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("用户不存在");

  const current = readAppMetadata(data.user);
  const email = (data.user.email ?? "").toLowerCase();
  const promoteOrKeepAdmin = isAdminUser({
    email,
    role: patch.role ?? current.role,
    isAdmin: patch.role === "admin" || current.role === "admin",
  });

  if (promoteOrKeepAdmin) {
    // Never degrade admin membership; allow email-based promotion to admin.
    const next: AppMetadata = {
      ...current,
      ...patch,
      role: "admin",
      membership_status: "active",
      membership_plan: null,
      membership_expires_at: null,
      pending_payment: patch.pending_payment === undefined ? null : patch.pending_payment,
    };
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...(data.user.app_metadata ?? {}), ...next },
    });
    if (updateErr) throw new Error(updateErr.message);
    return next;
  }

  const next: AppMetadata = {
    ...current,
    ...patch,
    role: "user",
  };

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(data.user.app_metadata ?? {}), ...next },
  });
  if (updateErr) throw new Error(updateErr.message);
  return next;
}
