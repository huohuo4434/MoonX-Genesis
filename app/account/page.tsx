import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentUser, getMembershipStatus, getProfile } from "@/lib/auth/membership";
import { getPaymentConfig } from "@/lib/payments/config";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, membership] = await Promise.all([
    getProfile(user.id),
    getMembershipStatus(user.id),
  ]);
  const cfg = getPaymentConfig();

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          我的账户
        </Heading>
        <Card padding="lg" className="mt-6 max-w-lg">
          <Text variant="body-sm" color="secondary">
            邮箱：{user.email}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            会员状态：{membership.isActive ? "有效" : profile?.membership_status ?? "未开通"}
          </Text>
          {membership.expiresAt && (
            <Text variant="body-sm" color="secondary" className="mt-1">
              到期时间：{new Date(membership.expiresAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
            </Text>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/account/membership">会员详情</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/account/orders">我的订单</Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link href="/pricing">购买/续费</Link>
            </Button>
          </div>
          <Text variant="caption" color="tertiary" className="mt-4 block">
            客服：{cfg.supportEmail}
          </Text>
        </Card>
      </Section>
    </main>
  );
}
