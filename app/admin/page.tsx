import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Section, Text } from "@/components/ui";
import { getAdminDashboardStats } from "@/lib/admin/stats";
import { requireAdmin } from "@/lib/auth/membership";

export default async function AdminHomePage() {
  if (!(await requireAdmin())) redirect("/login?next=/admin");

  const stats = await getAdminDashboardStats();

  const tiles = [
    { label: "明日预测待审核", value: stats.pendingForecasts },
    { label: "待核验付款", value: stats.pendingPayments },
    { label: "人工审核订单", value: stats.manualReviewOrders },
    { label: "当前有效会员", value: stats.activeMembers },
    { label: "7日内到期会员", value: stats.expiringSoon },
  ];

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin" />
        <Heading as="h1" size="h2">
          管理员控制台
        </Heading>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <Card key={t.label} padding="md">
              <Text variant="caption" color="tertiary">
                {t.label}
              </Text>
              <Text variant="body" weight="semibold" className="mt-1 text-2xl">
                {t.value}
              </Text>
            </Card>
          ))}
        </div>

        <Heading as="h2" size="h3" className="mt-10 mb-4">
          最近链上到账
        </Heading>
        <div className="flex flex-col gap-2">
          {stats.recentPaid.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              暂无已确认到账记录。
            </Text>
          ) : (
            stats.recentPaid.map((o) => (
              <Card key={o.orderNumber} padding="sm">
                <Text variant="body-sm">
                  {o.orderNumber} · {o.chain} · {o.paidAmount ?? "—"} USDT
                </Text>
                {o.paidAt && (
                  <Text variant="caption" color="tertiary">
                    {new Date(o.paidAt).toLocaleString("zh-CN")} · {o.txHash}
                  </Text>
                )}
              </Card>
            ))
          )}
        </div>
      </Section>
    </main>
  );
}
