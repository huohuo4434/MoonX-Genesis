import "server-only";

import { getPaymentConfig } from "@/lib/payments/config";
import { OFFICIAL_PLAN_PRICES } from "@/lib/payments/plan-display";

export interface PaymentReadiness {
  trc20Open: boolean;
  bep20Open: boolean;
  reasons: string[];
}

/** Manual USDT review flow readiness (no DB tables / no chain auto-verify). */
export async function getPaymentReadiness(): Promise<PaymentReadiness> {
  const cfg = getPaymentConfig();
  const reasons: string[] = [];

  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRole = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  );

  if (!hasSupabaseUrl) reasons.push("Supabase URL 未配置");
  if (!hasAnonKey) reasons.push("Supabase Anon Key 未配置");
  if (!hasServiceRole) reasons.push("Supabase Service Role 未配置");
  if (!cfg.trc20Address) reasons.push("TRC20 收款地址未配置");
  if (!cfg.bep20Address) reasons.push("BEP20 收款地址未配置");
  if (!Object.values(OFFICIAL_PLAN_PRICES).every((p) => p > 0)) reasons.push("套餐价格未配置");

  const manualOpen =
    hasSupabaseUrl &&
    hasAnonKey &&
    hasServiceRole &&
    Boolean(cfg.trc20Address) &&
    Boolean(cfg.bep20Address);

  return {
    trc20Open: manualOpen,
    bep20Open: manualOpen,
    reasons: manualOpen ? [] : reasons,
  };
}
