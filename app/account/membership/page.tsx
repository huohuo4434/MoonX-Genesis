import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentUser, getMembershipStatus } from "@/lib/auth/membership";

import { guardAccountRoute } from "@/lib/route-feature-guards";

export default async function AccountMembershipPage() {
  guardAccountRoute();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getMembershipStatus(user.id);

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          会员权益
        </Heading>
        <Card padding="lg" className="mt-6 max-w-lg">
          <Text variant="body-sm" color="secondary">
            状态：{membership.isActive ? "有效会员" : membership.status}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            访问级别：{membership.accessLevel}
          </Text>
          {membership.expiresAt && (
            <Text variant="body-sm" color="secondary" className="mt-2">
              到期：{new Date(membership.expiresAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
            </Text>
          )}
          <ul className="mt-4 list-disc space-y-1 pl-5 text-body-sm text-foreground-secondary">
            <li>提前查看下一交易日完整预测</li>
            <li>方向、概率与运行路径</li>
            <li>支撑、压力与技术风控参考</li>
            <li>盘中修正与历史验证</li>
            <li>邀请好友加入 MOOX，双方各赠送 7 天会员时间</li>
          </ul>
          <Link href="/account/invite" className="mt-4 mr-4 inline-block text-body-sm text-primary hover:underline">
            我的邀请
          </Link>
          <Link href="/member/tomorrow" className="mt-4 inline-block text-body-sm text-primary hover:underline">
            进入明日预测
          </Link>
        </Card>
      </Section>
    </main>
  );
}
