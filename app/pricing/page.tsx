import Link from "next/link";
import { Heading, Section, Text } from "@/components/ui";
import { PricingPlansClient } from "@/components/payments/PricingPlansClient";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getPaymentConfig } from "@/lib/payments/config";
import { OFFICIAL_PLAN_PRICES } from "@/lib/payments/plan-display";
import type { MembershipPlan } from "@/types/membership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildPlans(): MembershipPlan[] {
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

export default async function PricingPage() {
  const cfg = getPaymentConfig();
  const user = await getCurrentUser();
  const plans = buildPlans();

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-6">
        <div className="max-w-2xl text-center">
          <Heading as="h1" size="display">
            MOOX会员
          </Heading>
          <Text variant="body" color="secondary" className="mt-3">
            提前查看下一交易日预测、本周行情和会员福利股分析。
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            首只会员福利股：长鑫科技 — 今日、明日、本周分析与历史验证。
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            账户注册立即完成；付款后提交交易哈希，由管理员人工核对开通。
          </Text>
        </div>
        <PricingPlansClient
          plans={plans}
          supportEmail={cfg.supportEmail}
          trc20Address={cfg.trc20Address}
          bep20Address={cfg.bep20Address}
          isLoggedIn={Boolean(user)}
        />
        {!user ? (
          <Link href="/login?next=/pricing" className="text-body-sm text-primary hover:underline">
            已有账户？登录
          </Link>
        ) : (
          <Link href="/account" className="text-body-sm text-primary hover:underline">
            我的账户
          </Link>
        )}
      </Section>
    </main>
  );
}
