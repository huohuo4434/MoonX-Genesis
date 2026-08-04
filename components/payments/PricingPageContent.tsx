"use client";

import Link from "next/link";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { FounderDiscountQuote } from "@/lib/payments/founder-discount-shared";
import type { MembershipPlan } from "@/types/membership";
import { PricingPlansClient } from "@/components/payments/PricingPlansClient";

const BENEFITS = [
  ["当日核心市场预测", "北京时间08:00后查看", "全天提前查看", "Daily core-market forecasts", "Available after 08:00 Beijing time", "Early access all day"],
  ["下一交易日方向", "—", "完整展示", "Next-session direction", "—", "Full access"],
  ["上涨／震荡／下跌概率", "基础版", "完整展示", "Bullish / range-bound / bearish probabilities", "Basic", "Full access"],
  ["运行路径", "基础版", "完整展示", "Expected path", "Basic", "Full access"],
  ["支撑、压力与确认位", "—", "完整展示", "Support, resistance and confirmation", "—", "Full access"],
  ["失效条件与风险提示", "—", "完整展示", "Invalidation and risk notes", "—", "Full access"],
  ["周度与月度趋势", "—", "完整展示", "Weekly and monthly outlooks", "—", "Full access"],
  ["六爻、奇门与技术依据", "—", "完整展示", "Liu Yao, Qimen Dunjia and technical structure", "—", "Full access"],
  ["重点资产完整研究", "摘要", "完整展示", "Focused-asset research", "Summary", "Full access"],
  ["AI交易台与会员信号", "公开摘要", "完整内容", "AI Strategy Desk and member signals", "Public summary", "Full access"],
] as const;

export function PricingPageContent({
  plans,
  supportEmail,
  trc20Address,
  bep20Address,
  isLoggedIn,
  isAdmin,
  isActiveMember,
  inviteHref,
  founderQuote,
}: {
  plans: MembershipPlan[];
  supportEmail: string;
  trc20Address: string;
  bep20Address: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isActiveMember: boolean;
  inviteHref: string;
  founderQuote: FounderDiscountQuote;
}) {
  const { locale, href } = useLocale();
  const en = locale === "en";

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-6">
        <div className="max-w-3xl text-center">
          <Heading as="h1" size="h2" className="break-keep text-[clamp(2rem,8vw,3.75rem)] leading-tight">
            {en ? "MOOX Membership" : "MOOX会员方案"}
          </Heading>
          <Text variant="body" color="secondary" className="mt-3 block">
            {en
              ? "Start free with today's market view, then unlock next-session, weekly, monthly and full research when needed."
              : "先免费注册查看今日观点，再按需要解锁下一交易日、周度、月度和完整研究。"}
          </Text>
        </div>

        <div className="grid w-full max-w-4xl gap-3 md:grid-cols-2">
          <Card padding="md">
            <Text variant="body" weight="semibold">{en ? "Free registered user" : "免费注册用户"}</Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              {en
                ? "View today's basic market direction after 08:00 Beijing time, public focused-asset summaries and verification records."
                : "北京时间08:00后查看今日基础观点、重点资产公开摘要与公开验证。"}
            </Text>
          </Card>
          <Card padding="md" className="border-primary/25 bg-primary/[0.03]">
            <Text variant="body" weight="semibold">{en ? "Paid member" : "付费会员"}</Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              {en
                ? "Get early access to full daily forecasts plus next-session, weekly, monthly, technical levels and member signals."
                : "全天提前查看今日完整预测，并解锁下一交易日、周度、月度、关键价位和会员信号。"}
            </Text>
          </Card>
        </div>

        <Card padding="lg" className="w-full max-w-4xl border-amber-400/25 bg-amber-400/[0.04]">
          <Text variant="body" weight="semibold">
            {en ? "Founding member offer" : "创始会员连续续订优惠"}
          </Text>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/[0.08] p-3">
              <Text variant="body-sm" weight="semibold">
                {en ? "First 10 paid members" : "前10名付费会员"}
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-1 block">
                {en ? "20% off uninterrupted renewals: 64 / 160 / 560 USDT at the current list price." : "连续续订期间永久8折：按当前标价分别为64／160／560 USDT。"}
              </Text>
            </div>
            <div className="rounded-lg border border-border/[0.08] p-3">
              <Text variant="body-sm" weight="semibold">
                {en ? "Members 11–50" : "第11至50名付费会员"}
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-1 block">
                {en ? "10% off uninterrupted renewals: 72 / 180 / 630 USDT at the current list price." : "连续续订期间永久9折：按当前标价分别为72／180／630 USDT。"}
              </Text>
            </div>
          </div>
          <Text variant="caption" color="tertiary" className="mt-3 block">
            {en
              ? "Eligibility is attached to one account and is not transferable or stackable. A renewal order must be submitted before the current membership expires; once interrupted, the founding discount is permanently forfeited. Test or rejected orders do not qualify."
              : "资格仅限本人账户，不可转让、不可与其他折扣叠加。必须在当前会员到期前提交续费订单；一旦中断，创始会员折扣永久失效。测试订单和审核拒绝订单不计入名额。"}
          </Text>
        </Card>

        {isAdmin ? (
          <Card padding="lg" className="w-full max-w-4xl">
            <Text variant="body-sm" color="secondary">
              {en ? "Administrators do not need to purchase membership." : "管理员不需要购买会员。"}
            </Text>
            <div className="mt-4">
              <Button asChild size="sm"><Link href={href("/admin")}>{en ? "Open admin" : "进入后台"}</Link></Button>
            </div>
          </Card>
        ) : (
          <PricingPlansClient
            plans={plans}
            supportEmail={supportEmail}
            trc20Address={trc20Address}
            bep20Address={bep20Address}
            isLoggedIn={isLoggedIn}
            founderQuote={founderQuote}
          />
        )}

        <div className="grid w-full max-w-4xl gap-4 md:hidden">
          {(["free", "member"] as const).map((tier) => (
            <Card key={tier} padding="lg" className={tier === "member" ? "border-primary/25 bg-primary/[0.03]" : undefined}>
              <Text variant="body" weight="semibold">
                {tier === "free" ? (en ? "Free Account" : "免费账户") : (en ? "Member" : "付费会员")}
              </Text>
              <ul className="mt-4 space-y-3">
                {BENEFITS.map((row) => (
                  <li key={`${tier}-${row[0]}`} className="border-t border-border/[0.07] pt-3 first:border-t-0 first:pt-0">
                    <Text variant="body-sm" weight="medium">{en ? row[3] : row[0]}</Text>
                    <Text variant="caption" color="secondary" className="mt-1 block">
                      {tier === "free" ? (en ? row[4] : row[1]) : (en ? row[5] : row[2])}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <Card padding="none" className="hidden w-full max-w-4xl overflow-hidden md:block">
          <table className="w-full border-collapse text-left text-body-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3">{en ? "Feature" : "功能"}</th>
                <th className="px-4 py-3">{en ? "Free user" : "免费注册用户"}</th>
                <th className="px-4 py-3">{en ? "Paid member" : "付费会员"}</th>
              </tr>
            </thead>
            <tbody>
              {BENEFITS.map((row) => (
                <tr key={row[0]} className="border-t border-border/[0.07]">
                  <td className="px-4 py-3 text-foreground">{en ? row[3] : row[0]}</td>
                  <td className="px-4 py-3 text-foreground-secondary">{en ? row[4] : row[1]}</td>
                  <td className="px-4 py-3 text-foreground-secondary">{en ? row[5] : row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card padding="lg" className="w-full max-w-4xl">
          <Text variant="body" weight="semibold">{en ? "Order status" : "订单状态说明"}</Text>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-body-sm text-foreground-secondary">
            {(en
              ? ["Order created", "Transfer submitted", "On-chain verification", "Activated", "Notification sent"]
              : ["生成订单", "提交转账", "链上自动核验", "自动开通", "通知已送达"]
            ).map((item, index, array) => (
              <span key={item} className="contents">
                <span>{item}</span>{index < array.length - 1 ? <span aria-hidden>→</span> : null}
              </span>
            ))}
          </div>
          <Text variant="caption" color="tertiary" className="mt-3 block">
            {en
              ? "Submitting a transaction hash starts automatic verification. Membership activates only after the configured token, network, recipient, amount and confirmations all match."
              : "提交交易哈希后系统自动核验；只有代币合约、网络、收款地址、精确金额及链上确认数全部匹配，会员才会自动开通。"}
          </Text>
        </Card>

        <Card padding="lg" className="w-full max-w-4xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Text variant="body" weight="semibold">{en ? "Referral rewards" : "邀请奖励"}</Text>
              <Text variant="body-sm" color="secondary" className="mt-2 block">
                {en
                  ? "Successful referrals continue to receive the existing reward days. Referral rewards do not change the founding discount tier."
                  : "邀请成功后继续按现有规则获得奖励天数；邀请奖励不会改变创始会员折扣档位。"}
              </Text>
            </div>
            <Button asChild size="sm"><Link href={inviteHref}>{en ? "Open referral page" : "进入邀请页面"}</Link></Button>
          </div>
        </Card>

        <div className="flex flex-wrap justify-center gap-4">
          {isActiveMember ? <Link href={href("/account")} className="text-body-sm text-primary hover:underline">{en ? "My account" : "我的账户"}</Link> : null}
          {!isLoggedIn ? <Link href={href("/login?next=/pricing")} className="text-body-sm text-primary hover:underline">{en ? "Already have an account? Sign in" : "已有账户？登录"}</Link> : null}
        </div>
      </Section>
    </main>
  );
}
