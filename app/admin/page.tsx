import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentUser, isActiveMember, isAdmin, listAllAuthUsers } from "@/lib/auth/permissions";
import { getAutomationDashboard } from "@/lib/automation/cycle";
import { listPublishedStocks } from "@/lib/data/stocks-store";
import { listDailyVerificationResults } from "@/lib/data/moonx-data-store";
import {
  countPendingPaymentOrders,
  listPendingPaymentOrders,
} from "@/lib/payments/payment-orders-store";
import { isPaymentEmailConfigured } from "@/lib/email/notifications";
import { computeDailyAccuracyStats } from "@/lib/verification/daily-rules";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHomePage() {
  const [user, users, dash, stocks, results, pending, recentPending] = await Promise.all([
    getCurrentUser(),
    listAllAuthUsers(),
    getAutomationDashboard(),
    listPublishedStocks(),
    listDailyVerificationResults(),
    countPendingPaymentOrders(),
    listPendingPaymentOrders(5),
  ]);
  const stats = computeDailyAccuracyStats(results);
  const memberCount = users.filter((u) => isActiveMember(u) && !isAdmin(u)).length;
  const emailConfigured = isPaymentEmailConfigured();

  const tiles = [
    { label: "有效会员", value: String(memberCount) },
    { label: "待审核付款", value: String(pending) },
    { label: "今日观点数", value: String(dash.counts.todayForecasts) },
    { label: "明日观点数", value: String(dash.counts.tomorrowForecasts) },
    { label: "已发布个股", value: String(stocks.length) },
    { label: "日度命中率", value: stats.hitRate == null ? "暂无样本" : `${(stats.hitRate * 100).toFixed(1)}%` },
  ];

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin" pendingCount={pending} />
        <Heading as="h1" size="h2">
          管理后台
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2">
          {user?.email}
        </Text>

        {!emailConfigured ? (
          <Card padding="md" className="mt-4 border border-amber-500/40 bg-amber-500/10">
            <Text variant="body-sm">
              邮件通知尚未配置，但后台订单提醒正常工作。
            </Text>
          </Card>
        ) : null}

        <Card padding="md" className="mt-4">
          <Text variant="body-sm" weight="semibold">
            待审核付款：{pending}笔
          </Text>
          {recentPending.length ? (
            <div className="mt-3 flex flex-col gap-2">
              {recentPending.map((o) => (
                <div key={o.orderId} className="rounded-md border border-border/[0.08] p-3">
                  <Text variant="body-sm" weight="semibold">
                    {o.userEmail}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {o.planName} · {o.amount} USDT · {o.network} · {formatDateTimeChina(o.submittedAt)}
                  </Text>
                </div>
              ))}
              <Button asChild size="sm" className="mt-2 w-fit">
                <Link href="/admin/payments">立即审核</Link>
              </Button>
            </div>
          ) : (
            <Text variant="caption" color="tertiary" className="mt-2 block">
              暂无待审核付款
            </Text>
          )}
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <Card key={t.label} padding="md">
              <Text variant="caption" color="tertiary">
                {t.label}
              </Text>
              <Text variant="body" weight="semibold" className="mt-1">
                {t.value}
              </Text>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {(
            [
              ["/admin/forecasts", "今日／明日观点"],
              ["/admin/stocks", "个股分析"],
              ["/admin/users", "用户与会员"],
              ["/admin/payments", "支付审核"],
              ["/admin/automation", "自动化状态"],
              ["/admin/settings", "设置"],
            ] as const
          ).map(([href, label]) => (
            <Link key={href} href={href}>
              <Badge variant="outline">{label}</Badge>
            </Link>
          ))}
        </div>
      </Section>
    </main>
  );
}
