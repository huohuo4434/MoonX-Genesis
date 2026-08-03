import "server-only";

import { getPaymentConfig } from "@/lib/payments/config";
import { OFFICIAL_PLAN_PRICES } from "@/lib/payments/plan-display";
import { getAdminClient } from "@/lib/supabase/admin";

export interface PaymentReadiness {
  trc20Open: boolean;
  bep20Open: boolean;
  autoVerificationReady: boolean;
  reasons: string[];
}

/** Automatic on-chain USDT payment readiness. */
export async function getPaymentReadiness(): Promise<PaymentReadiness> {
  const cfg = getPaymentConfig();
  const reasons: string[] = [];
  const hasSupabase = Boolean(getAdminClient());
  const hasCronSecret = Boolean(process.env.CRON_SECRET);

  if (!hasSupabase) reasons.push("Supabase Service Role 未配置");
  if (!cfg.trc20Address) reasons.push("TRC20 收款地址未配置");
  if (!cfg.tronUsdtContract) reasons.push("TRON USDT 合约未配置");
  if (!cfg.tronGridApiKey) reasons.push("TRONGRID_API_KEY 未配置");
  if (!hasCronSecret) reasons.push("CRON_SECRET 未配置");
  if (!Object.values(OFFICIAL_PLAN_PRICES).every((price) => price > 0)) reasons.push("套餐价格未配置");

  let tablesReady = false;
  const admin = getAdminClient();
  if (admin) {
    const { error } = await admin.from("payment_orders").select("id").limit(1);
    tablesReady = !error;
    if (error) reasons.push("payment_orders 自动支付表不可用");
  }

  const trc20Open = hasSupabase && tablesReady && Boolean(cfg.trc20Address) && Boolean(cfg.tronUsdtContract);
  const autoVerificationReady = trc20Open && Boolean(cfg.tronGridApiKey) && hasCronSecret;
  const bep20Open = hasSupabase && tablesReady && cfg.bep20Enabled && Boolean(cfg.bep20Address) && Boolean(cfg.bscRpcUrl) && hasCronSecret;

  return {
    trc20Open,
    bep20Open,
    autoVerificationReady,
    reasons: autoVerificationReady ? [] : reasons,
  };
}
