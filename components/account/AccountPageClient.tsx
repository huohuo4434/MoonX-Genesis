"use client";

import Link from "next/link";
import { AccountReferralPanel } from "@/components/account/AccountReferralPanel";
import { AccountSecurityPanel } from "@/components/account/AccountSecurityPanel";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MembershipPlan } from "@/lib/auth/permissions-client";
import type { FounderDiscountQuote } from "@/lib/payments/founder-discount-shared";

function formatDateTime(value: string | null, en: boolean): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: en ? "short" : "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

const PLAN_ZH: Record<MembershipPlan, string> = {
  MONTHLY: "月度会员",
  QUARTERLY: "季度会员",
  YEARLY: "年度会员",
};
const PLAN_EN: Record<MembershipPlan, string> = {
  MONTHLY: "Monthly membership",
  QUARTERLY: "Quarterly membership",
  YEARLY: "Annual membership",
};

export function AccountPageClient({
  email,
  userId,
  isAdmin,
  isActiveMember,
  membershipPlan,
  membershipExpiresAt,
  remainingDays,
  latestEvent,
  referralRewardDays,
  serverNowIso,
  canAccessToday,
  canAccessTomorrow,
  canAccessWeekly,
  supportEmail,
  founderQuote,
}: {
  email: string;
  userId: string;
  isAdmin: boolean;
  isActiveMember: boolean;
  membershipPlan: MembershipPlan | null;
  membershipExpiresAt: string | null;
  remainingDays: number | null;
  latestEvent: {
    eventType: string;
    createdAt: string;
    previousExpiresAt: string | null;
    newExpiresAt: string | null;
  } | null;
  referralRewardDays: number;
  serverNowIso: string;
  canAccessToday: boolean;
  canAccessTomorrow: boolean;
  canAccessWeekly: boolean;
  supportEmail: string;
  founderQuote: FounderDiscountQuote;
}) {
  const { locale } = useLocale();
  const en = locale === "en";
  const plans = en ? PLAN_EN : PLAN_ZH;
  const memberType = isAdmin
    ? en ? "Administrator" : "管理员"
    : membershipPlan
      ? plans[membershipPlan]
      : isActiveMember
        ? en ? "Member" : "会员"
        : en ? "Free registered user" : "免费注册用户";
  const memberStatus = isAdmin
    ? en ? "Active forever" : "会员有效（永久）"
    : isActiveMember
      ? en ? "Active" : "会员有效"
      : membershipExpiresAt
        ? en ? "Expired" : "已过期"
        : en ? "Not activated" : "未开通";
  const yesNo = (value: boolean) => value ? (en ? "Enabled" : "已开通") : (en ? "Not enabled" : "未开通");

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">{en ? "My account" : "我的账户"}</Heading>
        {isActiveMember || isAdmin ? (
          <section className="mt-6">
            <Text variant="caption" className="uppercase tracking-[0.18em] text-primary">
              {en ? "Member essentials" : "会员最重要的四个入口"}
            </Text>
            <Heading as="h2" size="h3" className="mt-2">
              {en ? "Direction first, execution second" : "先看方向，再看能不能执行"}
            </Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block max-w-3xl">
              {en
                ? "Weekly sets the stage, Next Session shows the upcoming path, the AI Desk verifies real execution state, and the Chan Console explains structure and levels."
                : "周度判断所处阶段，下一交易日给出即将运行的路径，AI交易台核对真实执行状态，缠论执行台解释结构和关键位置。"}
            </Text>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { href: "/member/weekly", zh: "本周精选5", en: "Weekly Alpha 5", zhBody: "本周先看什么、处在哪个阶段。", enBody: "What matters this week and the current stage." },
                { href: "/member/tomorrow", zh: "下一交易日", en: "Next Session", zhBody: "提前看方向、运行路径与风险窗口。", enBody: "Direction, path and risk window before the session." },
                { href: "/member/ai-trading", zh: "AI执行确认", en: "AI Execution", zhBody: "只认真实持仓、保护单与有效点位；无数据就是等待。", enBody: "Reconciled positions, protection and valid levels only." },
                { href: "/member/technical-methods", zh: "缠论执行台", en: "Chan Console", zhBody: "看结构是否完成，以及二买、三买和失效位。", enBody: "Structure completion, entries and invalidation." },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="group">
                  <Card padding="lg" className="h-full transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.02]">
                    <Text variant="body" weight="semibold">{en ? item.en : item.zh}</Text>
                    <Text variant="body-sm" color="secondary" className="mt-2 block">{en ? item.enBody : item.zhBody}</Text>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <details className="mt-6 max-w-2xl rounded-xl border border-border/[0.1] p-4" open={!isActiveMember && !isAdmin}>
          <summary className="cursor-pointer text-body font-semibold text-foreground">
            {en ? "Account and membership details" : "账户与会员信息"}
          </summary>
        <Card padding="lg" className="mt-4">
          <Text variant="body-sm" color="secondary">{en ? "Email" : "登录邮箱"}：{email}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">{en ? "User ID" : "用户 ID"}：{userId}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">{en ? "Membership status" : "会员状态"}：{memberStatus}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">{en ? "Membership type" : "会员类型"}：{memberType}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            {en ? "Membership expiry" : "会员到期时间"}：{isAdmin ? (en ? "No expiry" : "永久有效") : formatDateTime(membershipExpiresAt, en)}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            {en ? "Days remaining" : "剩余天数"}：{isAdmin || remainingDays == null ? "—" : `${remainingDays} ${en ? "days" : "天"}`}
          </Text>
          {founderQuote.discountPercent > 0 || founderQuote.status === "forfeited" ? (
            <Text variant="body-sm" className={`mt-2 ${founderQuote.status === "forfeited" ? "text-amber-400" : "text-emerald-400"}`}>
              {en ? "Founding-member status" : "创始会员状态"}：{founderQuote.status === "forfeited"
                ? en ? "Discount forfeited after an interrupted renewal" : "续订中断，优惠已永久失效"
                : `${en ? founderQuote.tierLabelEn : founderQuote.tierLabelZh}${founderQuote.founderRank ? ` · #${founderQuote.founderRank}` : ""}`}
            </Text>
          ) : null}
          <Text variant="body-sm" color="secondary" className="mt-2">
            {en ? "Latest membership change" : "最近一次会员变更"}：{latestEvent
              ? `${latestEvent.eventType} · ${formatDateTime(latestEvent.createdAt, en)} · ${formatDateTime(latestEvent.previousExpiresAt, en)} → ${formatDateTime(latestEvent.newExpiresAt, en)}`
              : "—"}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">{en ? "Referral reward" : "邀请奖励天数"}：{referralRewardDays} {en ? "days" : "天"}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">{en ? "Server time" : "当前服务器时间"}：{formatDateTime(serverNowIso, en)}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">{en ? "Today access" : "今日权限"}：{yesNo(canAccessToday)}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">{en ? "Next-session access" : "明日权限"}：{yesNo(canAccessTomorrow)}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">{en ? "Weekly access" : "本周权限"}：{yesNo(canAccessWeekly)}</Text>

          <div className="mt-4 flex flex-wrap gap-3">
            {isAdmin ? (
              <Button asChild size="sm"><Link href="/admin">{en ? "Open admin" : "进入管理后台"}</Link></Button>
            ) : isActiveMember ? (
              <Button asChild size="sm"><Link href="/member/weekly">{en ? "Open member home" : "进入会员核心周报"}</Link></Button>
            ) : (
              <Button asChild size="sm"><Link href="/pricing">{en ? "Buy membership" : "购买会员"}</Link></Button>
            )}
            <Button asChild size="sm" variant="outline"><Link href="/account/orders">{en ? "My orders" : "我的订单"}</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/account/invite">{en ? "My referrals" : "我的邀请"}</Link></Button>
            <SignOutButton />
          </div>
          <Text variant="caption" color="tertiary" className="mt-4 block">{en ? "Support" : "客服"}：{supportEmail}</Text>
        </Card>
        </details>

        {isActiveMember || isAdmin ? (
          <details className="mt-5 max-w-3xl rounded-xl border border-border/[0.1] p-4">
            <summary className="cursor-pointer text-body font-semibold text-foreground">
              {en ? "More specialist research" : "更多专项研究（需要时再看）"}
            </summary>
            <Text variant="body-sm" color="secondary" className="mt-3 block">
              {en ? "These tools support specific questions. They are not required for the daily reading flow." : "这些工具用于回答专项问题，不是每天必须逐页查看的主流程。"}
            </Text>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild size="sm" variant="outline"><Link href="/member/monthly">{en ? "Monthly outlook" : "月度走势"}</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/featured-stocks">{en ? "Focused assets" : "重点关注"}</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/member/early-altcoin-radar">{en ? "Early altcoin radar" : "早期山寨币雷达"}</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/member/signals">{en ? "AI trade signals" : "AI交易信号"}</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/member/btc-eth-cycle">BTC / ETH {en ? "cycle" : "周期"}</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/member/founder-cycle">{en ? "Founder cycles" : "创始人周期"}</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/member/consultations">{en ? "Liuyao / Bazi consultation" : "六爻 / 八字咨询"}</Link></Button>
            </div>
          </details>
        ) : null}

        <AccountSecurityPanel memberEligible={isActiveMember || isAdmin} />
        <AccountReferralPanel />
      </Section>
    </main>
  );
}
