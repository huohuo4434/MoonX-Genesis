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
        <Card padding="lg" className="mt-6 max-w-lg">
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
              <>
                <Button asChild size="sm"><Link href="/member/tomorrow">{en ? "Next-session forecast" : "查看明日预测"}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/member/weekly">{en ? "Weekly Alpha 5" : "本周精选5"}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/member/btc-eth-cycle">BTC / ETH {en ? "cycle" : "周期"}</Link></Button>
              </>
            ) : (
              <Button asChild size="sm"><Link href="/pricing">{en ? "Buy membership" : "购买会员"}</Link></Button>
            )}
            <Button asChild size="sm" variant="outline"><Link href="/account/orders">{en ? "My orders" : "我的订单"}</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/account/invite">{en ? "My referrals" : "我的邀请"}</Link></Button>
            <SignOutButton />
          </div>
          <Text variant="caption" color="tertiary" className="mt-4 block">{en ? "Support" : "客服"}：{supportEmail}</Text>
        </Card>

        <AccountSecurityPanel memberEligible={isActiveMember || isAdmin} />
        <AccountReferralPanel />
      </Section>
    </main>
  );
}
