import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentUser, isActiveMember, isAdmin, listAllAuthUsers } from "@/lib/auth/permissions";
import { listPublishedStocks } from "@/lib/data/stocks-store";
import {
  countPendingPaymentOrders,
  listPendingPaymentOrders,
} from "@/lib/payments/payment-orders-store";
import { isPaymentEmailConfigured, isPaymentEmailProductionReady } from "@/lib/email/notifications";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { isSandboxUser } from "@/lib/admin/sandbox-data";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { getKnowledgeGrowthStats } from "@/lib/teacher-learning-center/store";
import { loadTodayForecastRows, loadTomorrowForecastRows } from "@/lib/prediction-access-server";
import { getConvictionWeeklyFreshnessOverview } from "@/lib/data/conviction/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHomePage() {
  const now = new Date();
  const [user, users, stocks, publicAccuracy, pending, recentPending, tlcStats, todayRows, tomorrowRows] = await Promise.all([
    getCurrentUser(),
    listAllAuthUsers(),
    listPublishedStocks(),
    getPublicAccuracyHistory(now),
    countPendingPaymentOrders(),
    listPendingPaymentOrders(5),
    getKnowledgeGrowthStats(),
    loadTodayForecastRows(now),
    loadTomorrowForecastRows(now),
  ]);
  const stats = publicAccuracy.stats;
  const convictionFreshness = getConvictionWeeklyFreshnessOverview(now);
  const productionUsers = users.filter((u) => !isSandboxUser(u));
  const memberCount = productionUsers.filter((u) => isActiveMember(u) && !isAdmin(u)).length;
  const emailConfigured = isPaymentEmailConfigured();
  const emailProductionReady = isPaymentEmailProductionReady();

  const tiles = [
    { label: "有效会员", value: String(memberCount) },
    { label: "待审核付款", value: String(pending) },
    { label: "今日观点数", value: String(todayRows.length) },
    { label: "下一交易日观点数", value: String(tomorrowRows.length) },
    { label: "已发布个股", value: String(stocks.length) },
    { label: "重点资产周度新鲜度", value: `${convictionFreshness.current}/${convictionFreshness.total}` },
    { label: "公开验证样本", value: String(stats.verifiedCount) },
    { label: "公开加权命中率", value: stats.weightedHitRate == null ? "暂无样本" : `${(stats.weightedHitRate * 100).toFixed(1)}%` },
    { label: "老师课程", value: `${tlcStats.lessonCount}节` },
    { label: "老师规则", value: `${tlcStats.ruleCount}条` },
    { label: "老师案例", value: `${tlcStats.caseCount}个` },
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
        {emailConfigured && !emailProductionReady ? (
          <Card padding="md" className="mt-4 border border-amber-500/40 bg-amber-500/10">
            <Text variant="body-sm">网站统一联系邮箱为 jackzwin999@gmail.com，作为联系地址不需要在Vercel验证。系统自动发信仍由Resend负责；向会员发送正式邮件时，需要在Resend验证发件域名，Vercel只负责保存API密钥和环境变量。</Text>
          </Card>
        ) : null}

        {convictionFreshness.expired || convictionFreshness.missing ? (
          <Card padding="md" className="mt-4 border border-red-500/40 bg-red-500/10">
            <Text variant="body-sm" weight="semibold">重点资产周度内容需要更新</Text>
            <Text variant="caption" color="secondary" className="mt-1 block">
              {convictionFreshness.affectedAssets.join("、")}：已结束或尚未发布。过期内容只显示为历史，不再冒充当前报告。
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
              ["/admin/forecast-control", "管理员走势总控"],
              ["/admin/support-resistance", "支撑压力录入"],
              ["/admin/stocks", "个股分析"],
              ["/admin/users", "用户与会员"],
              ["/admin/security", "会员设备安全"],
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
