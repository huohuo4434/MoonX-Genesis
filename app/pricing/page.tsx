import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Card, Heading, Section, Text, Button } from "@/components/ui";
import { PricingPlansClient } from "@/components/payments/PricingPlansClient";
import { getCurrentUser, isAdmin, isActiveMember } from "@/lib/auth/permissions";
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
  noStore();
  const cfg = getPaymentConfig();
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const activeMember = isActiveMember(user);
  const plans = buildPlans();

  const inviteHref = user
    ? "/account/invite"
    : `/login?next=${encodeURIComponent("/account/invite")}`;

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-6">
        <div className="max-w-3xl text-center">
          <Heading as="h1" size="display">
            Unlock MOOX Intelligence
          </Heading>
          <Text variant="body" color="secondary" className="mt-3">
            解锁MOOX完整市场研究
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            不降价。
          </Text>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          <Card padding="lg">
            <Text variant="body" weight="semibold" className="block">
              免费用户
            </Text>
            <ul className="mt-3 space-y-2 text-body-sm text-foreground-secondary">
              {["基础市场信息", "历史验证统计", "资产公开研究"].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span aria-hidden className="text-emerald-400">
                    ✓
                  </span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <Text variant="body-sm" color="secondary" className="mt-4">
              仅展示公开内容与可验证统计。
            </Text>
          </Card>

          <Card padding="lg">
            <Text variant="body" weight="semibold" className="block">
              会员
            </Text>
            <ul className="mt-3 space-y-2 text-body-sm text-foreground-secondary">
              {[
                "今日完整预测",
                "下一交易日预测",
                "本周行情路径",
                "重点资产研究",
                "长鑫科技会员分析",
                "Asteroid会员分析",
                "Master I Ching分析",
                "Wave Intelligence",
                "AI综合判断",
                "风险和失效条件",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span aria-hidden className="text-emerald-400">
                    ✓
                  </span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <Text variant="body-sm" color="secondary" className="mt-4">
              {activeMember ? "你已开通会员。" : "开通会员后可解锁完整研究。"}
            </Text>
          </Card>
        </div>

        <Card padding="lg" className="w-full max-w-4xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Text variant="body" weight="semibold" className="block">
                Founder Member
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-2">
                首批会员：赠送额外15天。
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-2">
                邀请好友：双方各获得额外天数。
              </Text>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <Button asChild size="sm">
                <Link href={inviteHref}>邀请码：进入邀请页面</Link>
              </Button>
            </div>
          </div>
        </Card>

        {admin ? (
          <Card padding="lg" className="w-full max-w-4xl">
            <Text variant="body-sm" color="secondary">
              管理员不需要购买会员。请进入后台管理查看研究与配置。
            </Text>
            <div className="mt-4">
              <Button asChild size="sm">
                <Link href="/admin">进入后台</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <>
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
          </>
        )}
      </Section>
    </main>
  );
}
