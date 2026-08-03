import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Card, Heading, Section, Text, Button } from "@/components/ui";
import { PricingPlansClient } from "@/components/payments/PricingPlansClient";
import { getCurrentUser, isAdmin, isActiveMember } from "@/lib/auth/permissions";
import { getPaymentConfig } from "@/lib/payments/config";
import { OFFICIAL_PLAN_PRICES } from "@/lib/payments/plan-display";
import {
  FREE_USER_LABEL,
  MEMBERSHIP_BENEFIT_ROWS,
  PAID_MEMBER_LABEL,
} from "@/lib/presentation/membership-benefits";
import type { MembershipPlan } from "@/types/membership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "会员价格",
  description: "查看MOOX会员方案、权益与USDT付款说明。",
  alternates: { canonical: "/pricing" },
};

function buildPlans(): MembershipPlan[] {
  return [
    { id: "1", code: "MONTHLY", name: "月度会员", duration_days: 30, price_usdt: OFFICIAL_PLAN_PRICES.MONTHLY, access_level: "member", active: true, sort_order: 1 },
    { id: "2", code: "QUARTERLY", name: "季度会员", duration_days: 90, price_usdt: OFFICIAL_PLAN_PRICES.QUARTERLY, access_level: "member", active: true, sort_order: 2 },
    { id: "3", code: "YEARLY", name: "年度会员", duration_days: 365, price_usdt: OFFICIAL_PLAN_PRICES.YEARLY, access_level: "member", active: true, sort_order: 3 },
  ];
}

export default async function PricingPage() {
  noStore();
  const cfg = getPaymentConfig();
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const activeMember = isActiveMember(user);
  const plans = buildPlans();
  const inviteHref = user ? "/account/invite" : `/login?next=${encodeURIComponent("/account/invite")}`;

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-6">
        <div className="max-w-3xl text-center">
          <Heading as="h1" size="h2" className="break-keep text-[clamp(2rem,8vw,3.75rem)] leading-tight">
            MOOX会员方案
          </Heading>
          <Text variant="body" color="secondary" className="mt-3 block">
            先免费注册查看今日观点，再按需要解锁下一交易日、周度、月度和完整研究。
          </Text>
        </div>

        <div className="grid w-full max-w-4xl gap-3 md:grid-cols-2">
          <Card padding="md">
            <Text variant="body" weight="semibold">{FREE_USER_LABEL}</Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">北京时间08:00后查看今日基础观点、重点资产公开摘要与公开验证。</Text>
          </Card>
          <Card padding="md" className="border-primary/25 bg-primary/[0.03]">
            <Text variant="body" weight="semibold">{PAID_MEMBER_LABEL}</Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">全天提前查看今日完整预测，并解锁下一交易日、周度、月度、关键价位和会员信号。</Text>
          </Card>
        </div>

        {admin ? (
          <Card padding="lg" className="w-full max-w-4xl">
            <Text variant="body-sm" color="secondary">管理员不需要购买会员。</Text>
            <div className="mt-4"><Button asChild size="sm"><Link href="/admin">进入后台</Link></Button></div>
          </Card>
        ) : (
          <PricingPlansClient
            plans={plans}
            supportEmail={cfg.supportEmail}
            trc20Address={cfg.trc20Address}
            bep20Address={cfg.bep20Address}
            isLoggedIn={Boolean(user)}
          />
        )}

        <Card padding="none" className="w-full max-w-4xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-body-sm">
              <thead className="bg-muted/40"><tr><th className="px-4 py-3">功能</th><th className="px-4 py-3">{FREE_USER_LABEL}</th><th className="px-4 py-3">{PAID_MEMBER_LABEL}</th></tr></thead>
              <tbody>{MEMBERSHIP_BENEFIT_ROWS.map((row) => <tr key={row.feature} className="border-t border-border/[0.07]"><td className="px-4 py-3 text-foreground">{row.feature}</td><td className="px-4 py-3 text-foreground-secondary">{row.free}</td><td className="px-4 py-3 text-foreground-secondary">{row.paid}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>

        <Card padding="lg" className="w-full max-w-4xl">
          <Text variant="body" weight="semibold">订单状态说明</Text>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-body-sm text-foreground-secondary">
            <span>已提交</span><span aria-hidden>→</span><span>待核验</span><span aria-hidden>→</span><span>人工审核</span><span aria-hidden>→</span><span>已开通</span><span aria-hidden>→</span><span>通知已送达</span>
          </div>
          <Text variant="caption" color="tertiary" className="mt-3 block">提交交易哈希只表示订单已进入核验队列，不等于付款已确认或会员已开通。通知状态以系统真实记录为准。</Text>
        </Card>

        <Card padding="lg" className="w-full max-w-4xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div><Text variant="body" weight="semibold">Founder Member</Text><Text variant="body-sm" color="secondary" className="mt-2 block">首批会员赠送额外15天；邀请成功后按现有规则获得奖励天数。</Text></div>
            <Button asChild size="sm"><Link href={inviteHref}>进入邀请页面</Link></Button>
          </div>
        </Card>

        <div className="flex flex-wrap justify-center gap-4">
          {activeMember ? <Link href="/account" className="text-body-sm text-primary hover:underline">我的账户</Link> : null}
          {!user ? <Link href="/login?next=/pricing" className="text-body-sm text-primary hover:underline">已有账户？登录</Link> : null}
        </div>
      </Section>
    </main>
  );
}
