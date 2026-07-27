import Link from "next/link";
import { Heading, Section, Text } from "@/components/ui";
import { PricingPlansClient } from "@/components/payments/PricingPlansClient";
import { getCurrentUser } from "@/lib/auth/membership";
import { getPaymentConfig } from "@/lib/payments/config";
import { getPaymentReadiness } from "@/lib/payments/readiness";
import { OFFICIAL_PLAN_PRICES } from "@/lib/payments/plan-display";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MembershipPlan } from "@/types/membership";

function buildFallbackPlans(): MembershipPlan[] {
  return [
    {
      id: "1",
      code: "MONTHLY",
      name: "月度会员",
      duration_days: 30,
      price_usdt: OFFICIAL_PLAN_PRICES.MONTHLY,
      access_level: "member",
      active: true,
      sort_order: 1,
    },
    {
      id: "2",
      code: "QUARTERLY",
      name: "季度会员",
      duration_days: 90,
      price_usdt: OFFICIAL_PLAN_PRICES.QUARTERLY,
      access_level: "member",
      active: true,
      sort_order: 2,
    },
    {
      id: "3",
      code: "YEARLY",
      name: "年度会员",
      duration_days: 365,
      price_usdt: OFFICIAL_PLAN_PRICES.YEARLY,
      access_level: "member",
      active: true,
      sort_order: 3,
    },
  ];
}

async function loadPlans(): Promise<MembershipPlan[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return buildFallbackPlans();
  const { data } = await admin.from("membership_plans").select("*").order("sort_order");
  if (!data?.length) return buildFallbackPlans();
  // Merge DB rows with fallback prices when DB still has null
  const fallback = buildFallbackPlans();
  return data.map((row) => {
    const fb = fallback.find((p) => p.code === row.code);
    return {
      ...(row as MembershipPlan),
      price_usdt:
        row.price_usdt != null ? Number(row.price_usdt) : (fb?.price_usdt ?? null),
      active: row.active ?? fb?.active ?? false,
    };
  });
}

export default async function PricingPage() {
  const cfg = getPaymentConfig();
  const user = await getCurrentUser();
  const [plans, readiness] = await Promise.all([loadPlans(), getPaymentReadiness()]);

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-6">
        <div className="max-w-2xl text-center">
          <Heading as="h1" size="display">
            MoonX研究会员
          </Heading>
          <Text variant="body" color="secondary" className="mt-3">
            提前查看下一交易日完整预测，并获得方向、概率、关键价位、运行路径和失效条件。
          </Text>
        </div>

        <div className="max-w-lg text-left">
          <Text variant="body" weight="semibold">
            会员权益
          </Text>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-body-sm text-foreground-secondary">
            <li>提前查看下一交易日完整预测</li>
            <li>方向、概率与预计运行路径</li>
            <li>关键支撑、压力与失效条件</li>
            <li>突发事件修正与版本记录</li>
            <li>历史预测验证明细</li>
            <li>完整重点观察名单</li>
          </ol>
        </div>

        <PricingPlansClient
          plans={plans}
          bep20Enabled={readiness.bep20Open}
          trc20Open={readiness.trc20Open}
          supportEmail={cfg.supportEmail}
          isLoggedIn={Boolean(user)}
        />

        <div className="max-w-lg space-y-4 text-left">
          <div>
            <Text variant="body-sm" weight="semibold">
              支付流程
            </Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">
              邮箱登录 → 创建订单 → 链上支付 → 确认到账后自动开通
            </Text>
          </div>
          <div>
            <Text variant="body-sm" weight="semibold">
              支付网络
            </Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">
              USDT-TRC20：{readiness.trc20Open ? "已开放" : "支付系统维护中"}
            </Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">
              BEP20：待管理员确认
            </Text>
          </div>
          <div>
            <Text variant="body-sm" weight="semibold">
              异常付款
            </Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">
              少付、错链、错币种或无法唯一匹配的付款将进入人工审核。
            </Text>
          </div>
          <div>
            <Text variant="body-sm" weight="semibold">
              风险提示
            </Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">
              链上转账不可撤销，请付款前仔细核对网络、币种、合约和收款地址。
            </Text>
          </div>
        </div>

        <Link href="/login" className="text-body-sm text-primary hover:underline">
          已有账户？登录
        </Link>
      </Section>
    </main>
  );
}
