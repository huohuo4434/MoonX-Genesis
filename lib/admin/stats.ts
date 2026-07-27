import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAllMemberForecasts } from "@/lib/data/daily-forecasts";

export interface AdminDashboardStats {
  pendingForecasts: number;
  pendingPayments: number;
  manualReviewOrders: number;
  activeMembers: number;
  expiringSoon: number;
  recentPaid: Array<{
    orderNumber: string;
    paidAmount: number | null;
    chain: string;
    paidAt: string | null;
    txHash: string | null;
  }>;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const admin = createSupabaseAdminClient();
  const forecasts = getAllMemberForecasts();
  const pendingForecasts = forecasts.filter((f) => f.status === "draft" || f.status === "reviewed").length;

  if (!admin) {
    return {
      pendingForecasts,
      pendingPayments: 0,
      manualReviewOrders: 0,
      activeMembers: 0,
      expiringSoon: 0,
      recentPaid: [],
    };
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: pendingPayments },
    { count: manualReviewOrders },
    { count: activeMembers },
    { count: expiringSoon },
    { data: recentPaid },
  ] = await Promise.all([
    admin.from("payment_orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("payment_orders").select("*", { count: "exact", head: true }).eq("status", "manual_review"),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("membership_status", "active")
      .neq("role", "admin"),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("membership_status", "active")
      .neq("role", "admin")
      .lte("membership_expires_at", soon)
      .gt("membership_expires_at", now.toISOString()),
    admin
      .from("payment_orders")
      .select("order_number, paid_amount, chain, paid_at, tx_hash")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(5),
  ]);

  return {
    pendingForecasts,
    pendingPayments: pendingPayments ?? 0,
    manualReviewOrders: manualReviewOrders ?? 0,
    activeMembers: activeMembers ?? 0,
    expiringSoon: expiringSoon ?? 0,
    recentPaid: (recentPaid ?? []).map((o) => ({
      orderNumber: o.order_number,
      paidAmount: o.paid_amount != null ? Number(o.paid_amount) : null,
      chain: o.chain,
      paidAt: o.paid_at,
      txHash: o.tx_hash,
    })),
  };
}
