import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/feature-flags";
import { getPaymentConfig } from "@/lib/payments/config";
import { getPaymentReadiness } from "@/lib/payments/readiness";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type DiagnosticStatus = "ok" | "missing" | "error";

export interface SystemDiagnostic {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail?: string;
}

export async function getSystemDiagnostics(): Promise<SystemDiagnostic[]> {
  const cfg = getPaymentConfig();
  const flags = getFeatureFlags();
  const readiness = await getPaymentReadiness();
  const admin = createSupabaseAdminClient();

  const items: SystemDiagnostic[] = [
    {
      id: "supabase_url",
      label: "Supabase URL",
      status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing",
    },
    {
      id: "supabase_anon",
      label: "Supabase Anon Key",
      status: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "missing",
    },
    {
      id: "supabase_service",
      label: "Supabase Service Role",
      status: isSupabaseAdminConfigured() ? "ok" : "missing",
    },
    {
      id: "trongrid",
      label: "TronGrid API Key",
      status: cfg.tronGridApiKey ? "ok" : "missing",
    },
    {
      id: "trc20_address",
      label: "TRC20 收款地址",
      status: cfg.trc20Address ? "ok" : "missing",
    },
    {
      id: "usdt_contract",
      label: "USDT 合约地址",
      status: cfg.tronUsdtContract ? "ok" : "missing",
    },
    {
      id: "cron_secret",
      label: "Cron Secret",
      status: process.env.CRON_SECRET ? "ok" : "missing",
    },
    {
      id: "public_signup",
      label: "PUBLIC_SIGNUP_ENABLED",
      status: flags.publicSignupEnabled ? "ok" : "missing",
    },
    {
      id: "payments_enabled",
      label: "PAYMENTS_ENABLED",
      status: flags.paymentsEnabled ? "ok" : "missing",
    },
  ];

  if (admin) {
    const { error } = await admin.from("membership_plans").select("id").limit(1);
    items.push({
      id: "db_connect",
      label: "数据库连通",
      status: error ? "error" : "ok",
      detail: error?.message,
    });

    const { data: plans } = await admin.from("membership_plans").select("code, active, price_usdt");
    const hasPlans = (plans ?? []).some(
      (p) => p.active && p.price_usdt != null && Number(p.price_usdt) > 0
    );
    items.push({
      id: "plans",
      label: "会员套餐",
      status: hasPlans ? "ok" : "missing",
    });
  } else {
    items.push({ id: "db_connect", label: "数据库连通", status: "missing" });
    items.push({ id: "plans", label: "会员套餐", status: "missing" });
  }

  items.push({
    id: "create_order",
    label: "创建订单 API",
    status: readiness.trc20Open && flags.paymentsEnabled ? "ok" : "missing",
  });
  items.push({
    id: "verify_payment",
    label: "链上自动核验",
    status: readiness.autoVerificationReady && flags.paymentsEnabled ? "ok" : "missing",
    detail: readiness.autoVerificationReady ? "Vercel 每5分钟自动对账" : readiness.reasons.join("；") || undefined,
  });
  items.push({
    id: "trc20_open",
    label: "TRC20 支付开放",
    status: readiness.trc20Open ? "ok" : readiness.reasons.length ? "error" : "missing",
    detail: readiness.reasons.join("；") || undefined,
  });

  return items;
}

export function diagnosticLabel(status: DiagnosticStatus): string {
  if (status === "ok") return "正常";
  if (status === "error") return "异常";
  return "缺失";
}
