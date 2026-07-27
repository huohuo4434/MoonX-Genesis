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

async function canReachTronGrid(apiKey?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey;
    const res = await fetch("https://api.trongrid.io/wallet/getnowblock", {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Conservative gate: TRC20 is "已开放" only when auth, DB, plans, address,
 * TronGrid, and service role are all configured and reachable.
 */
export async function getPaymentReadiness(): Promise<PaymentReadiness> {
  const cfg = getPaymentConfig();
  const reasons: string[] = [];

  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRole = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  );
  const hasTronGridKey = Boolean(cfg.tronGridApiKey);

  if (!hasSupabaseUrl) reasons.push("Supabase URL 未配置");
  if (!hasAnonKey) reasons.push("Supabase Anon Key 未配置");
  if (!hasServiceRole) reasons.push("Supabase Service Role 未配置");
  if (!cfg.trc20Address) reasons.push("TRC20 收款地址未配置");
  if (!hasTronGridKey) reasons.push("TronGrid API Key 未配置");

  let hasActivePricedPlan = false;
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data } = await admin.from("membership_plans").select("code, price_usdt, active");
    hasActivePricedPlan = (data ?? []).some(
      (p) => p.active && p.price_usdt != null && Number(p.price_usdt) > 0
    );
  } else {
    hasActivePricedPlan = Object.values(OFFICIAL_PLAN_PRICES).every((p) => p > 0);
  }

  if (!hasActivePricedPlan) reasons.push("尚无已启用且已定价的套餐");

  const authReady = hasSupabaseUrl && hasAnonKey && hasServiceRole;
  let tronGridReachable = false;
  if (hasTronGridKey) {
    tronGridReachable = await canReachTronGrid(cfg.tronGridApiKey);
    if (!tronGridReachable) reasons.push("TronGrid 接口不可达");
  }

  const trc20Open =
    authReady &&
    hasActivePricedPlan &&
    Boolean(cfg.trc20Address) &&
    hasTronGridKey &&
    tronGridReachable;

  const bep20Open = trc20Open && cfg.bep20Enabled;

  if (!trc20Open && reasons.length) {
    console.warn("[payment-readiness]", reasons.join("; "));
  }

  return { trc20Open, bep20Open, reasons };
}
