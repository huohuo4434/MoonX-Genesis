import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { AccountReferralPanel } from "@/components/account/AccountReferralPanel";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { PLAN_LABELS } from "@/lib/auth/permissions";
import { getPaymentConfig } from "@/lib/payments/config";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  noStore();
  const access = await getAccessUser();
  if (!access.authenticated) redirect("/login");

  const cfg = getPaymentConfig();
  const memberType = access.isAdmin
    ? "管理员"
    : access.membershipPlan
      ? PLAN_LABELS[access.membershipPlan]
      : access.isActiveMember
        ? "会员"
        : "普通用户";
  const memberStatus = access.isAdmin
    ? "有效（永久）"
    : access.isActiveMember
      ? "有效"
      : access.membershipExpiresAt
        ? "已过期"
        : "未开通";

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          我的账户
        </Heading>
        <Card padding="lg" className="mt-6 max-w-lg">
          <Text variant="body-sm" color="secondary">
            登录邮箱：{access.email}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            用户 ID：{access.userId}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            会员类型：{memberType}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            会员到期时间：
            {access.isAdmin
              ? "永久有效"
              : access.membershipExpiresAt
                ? formatDateTimeChina(access.membershipExpiresAt.toISOString())
                : "—"}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            当前状态：{memberStatus}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            当前服务器时间：{formatDateTimeChina(access.serverNowIso)}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            今日权限：{access.canAccessToday ? "已开通" : "未开通"}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            明日权限：{access.canAccessTomorrow ? "已开通" : "未开通"}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            本周权限：{access.canAccessWeekly ? "已开通" : "未开通"}
          </Text>

          <div className="mt-4 flex flex-wrap gap-3">
            {access.isAdmin ? (
              <Button asChild size="sm">
                <Link href="/admin">进入管理后台</Link>
              </Button>
            ) : access.isActiveMember ? (
              <>
                <Button asChild size="sm">
                  <Link href="/member/tomorrow">查看明日预测</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/member/weekly">本周行情</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/pricing">购买会员</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/account/orders">我的订单</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/account/invite">我的邀请</Link>
            </Button>
            <SignOutButton />
          </div>

          <Text variant="caption" color="tertiary" className="mt-4 block">
            客服：{cfg.supportEmail}
          </Text>
        </Card>

        <AccountReferralPanel />
      </Section>
    </main>
  );
}
