import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentConfig } from "@/lib/payments/config";
import { OFFICIAL_PLAN_PRICES } from "@/lib/payments/plan-display";

export interface PaymentReadiness {
  /** True when login + order + verify APIs can operate end-to-end. */
  trc20Open: boolean;
  bep20Open: boolean;
  reasons: string[];
}

/**
 * Conservative gate: TRC20 is "已开放" only when Supabase, service role,
 * at least one priced active plan, and receive address are all configured.
 */
export async function getPaymentReadiness(): Promise<PaymentReadiness> {
  const cfg = getPaymentConfig();
  const reasons: string[] = [];

  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!hasSupabaseUrl) reasons.push("Supabase URL 未配置");
  if (!hasAnonKey) reasons.push("Supabase Anon Key 未配置");
  if (!hasServiceRole) reasons.push("Supabase Service Role 未配置");
  if (!cfg.trc20Address) reasons.push("TRC20 收款地址未配置");

  let hasActivePricedPlan = false;
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data } = await admin.from("membership_plans").select("code, price_usdt, active");
    hasActivePricedPlan = (data ?? []).some(
      (p) => p.active && p.price_usdt != null && Number(p.price_usdt) > 0
    );
  } else {
    // Fallback: official prices defined locally
    hasActivePricedPlan = Object.values(OFFICIAL_PLAN_PRICES).every((p) => p > 0);
  }

  if (!hasActivePricedPlan) reasons.push("尚无已启用且已定价的套餐");

  const authReady = hasSupabaseUrl && hasAnonKey && hasServiceRole;
  const trc20Open = authReady && hasActivePricedPlan && Boolean(cfg.trc20Address);
  const bep20Open = trc20Open && cfg.bep20Enabled;

  return { trc20Open, bep20Open, reasons };
}
