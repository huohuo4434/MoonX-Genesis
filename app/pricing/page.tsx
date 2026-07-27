import Link from "next/link";
import { Heading, Section, Text } from "@/components/ui";
import { PricingPlansClient } from "@/components/payments/PricingPlansClient";
import { getPaymentConfig } from "@/lib/payments/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MembershipPlan } from "@/types/membership";

const FALLBACK_PLANS: MembershipPlan[] = [
  {
    id: "1",
    code: "MONTHLY",
    name: "月度会员",
    duration_days: 30,
    price_usdt: null,
    access_level: "member",
    active: false,
    sort_order: 1,
  },
  {
    id: "2",
    code: "QUARTERLY",
    name: "季度会员",
    duration_days: 90,
    price_usdt: null,
    access_level: "member",
    active: false,
    sort_order: 2,
  },
  {
    id: "3",
    code: "YEARLY",
    name: "年度会员",
    duration_days: 365,
    price_usdt: null,
    access_level: "member",
    active: false,
    sort_order: 3,
  },
];

async function loadPlans(): Promise<MembershipPlan[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return FALLBACK_PLANS;
  const { data } = await admin.from("membership_plans").select("*").order("sort_order");
  return (data as MembershipPlan[])?.length ? (data as MembershipPlan[]) : FALLBACK_PLANS;
}

export default async function PricingPage() {
  const cfg = getPaymentConfig();
  const plans = await loadPlans();

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-6">
        <div className="max-w-2xl text-center">
          <Heading as="h1" size="display">
            MoonX 研究会员
          </Heading>
          <Text variant="body" color="secondary" className="mt-3">
            邮箱登录 → 链上 USDT 支付 → 自动核验 → 开通会员
          </Text>
        </div>

        <div className="max-w-lg text-left">
          <Text variant="body" weight="semibold">
            会员权益
          </Text>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-body-sm text-foreground-secondary">
            <li>提前查看下一交易日完整预测</li>
            <li>方向、概率与预计运行路径</li>
            <li>精确支撑、压力与失效条件</li>
            <li>盘中突发事件修正与版本记录</li>
            <li>历史预测验证明细</li>
            <li>完整重点观察池</li>
          </ol>
        </div>

        <PricingPlansClient plans={plans} bep20Enabled={cfg.bep20Enabled} supportEmail={cfg.supportEmail} />

        <Text variant="caption" color="tertiary" className="max-w-lg text-center">
          支付网络：USDT-TRC20（已开放）
          {cfg.bep20Enabled ? " · Binance-Peg BSC-USD（已开放）" : " · BEP20 待管理员确认后开放"}
          。价格由后台配置，未启用套餐显示「即将开放」，不会显示 0 USDT。
        </Text>

        <Link href="/login" className="text-body-sm text-primary hover:underline">
          已有账户？登录
        </Link>
      </Section>
    </main>
  );
}
