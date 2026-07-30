import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPaymentApproveActions } from "@/components/admin/AdminPaymentApproveActions";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { isPaymentEmailConfigured } from "@/lib/email/notifications";
import { getPaymentConfig } from "@/lib/payments/config";
import { listPaymentOrders } from "@/lib/payments/payment-orders-store";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function emailLabel(status?: string | null): string {
  if (status === "email_sent" || status === "sent") return "已发送";
  if (status === "email_failed") return "发送失败";
  return "邮件通知未配置";
}

function statusBadge(status: string, isTest: boolean) {
  if (isTest) return <Badge variant="outline">系统测试</Badge>;
  if (status === "approved") return <Badge variant="success">已开通</Badge>;
  if (status === "rejected") return <Badge variant="danger">已拒绝</Badge>;
  return <Badge variant="warning">待审核</Badge>;
}

export default async function AdminPaymentsPage() {
  const orders = await listPaymentOrders();
  const pending = orders.filter((o) => o.status === "pending");
  const approved = orders.filter((o) => o.status === "approved");
  const rejected = orders.filter((o) => o.status === "rejected");
  const tests = orders.filter((o) => o.isTest);
  const cfg = getPaymentConfig();
  const emailConfigured = isPaymentEmailConfigured();

  function renderOrder(o: (typeof orders)[number], showActions: boolean) {
    return (
      <Card key={o.orderId} padding="md" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="body-sm" weight="semibold">
            {o.userEmail}
          </Text>
          {statusBadge(o.status, false)}
          {o.isTest ? <Badge variant="outline">系统测试</Badge> : null}
        </div>
        <Text variant="caption" color="tertiary" className="mt-2 block">
          订单号：{o.orderNumber}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">
          套餐：{o.planName} · 金额：{o.amount} USDT · 会员天数：{o.durationDays}天
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">
          支付网络：{o.network}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block break-all font-mono">
          交易哈希：{o.txHash}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">
          提交时间：{formatDateTimeChina(o.submittedAt)}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">
          邮件通知：{emailLabel(o.notificationStatus)}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">
          审核状态：
          {o.status === "pending"
            ? "待审核"
            : o.status === "approved"
              ? "已开通"
              : "已拒绝"}
        </Text>
        {showActions ? (
          <AdminPaymentApproveActions
            orderId={o.orderId}
            userId={o.userId}
            txHash={o.txHash}
            network={o.network}
          />
        ) : null}
      </Card>
    );
  }

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/payments" pendingCount={pending.length} />
        <Heading as="h1" size="h2">
          付款审核
        </Heading>
        {!emailConfigured ? (
          <Card padding="md" className="mt-4 border border-amber-500/40 bg-amber-500/10">
            <Text variant="body-sm">
              邮件通知尚未配置，但后台订单提醒正常工作。
            </Text>
          </Card>
        ) : null}
        <Card padding="md" className="mt-4 mb-6 space-y-1">
          <Text variant="caption" color="tertiary" className="block break-all">
            TRC20：{cfg.trc20Address}
          </Text>
          <Text variant="caption" color="tertiary" className="block break-all">
            BEP20：{cfg.bep20Address}
          </Text>
        </Card>

        <Heading as="h2" size="h3">
          待审核（{pending.length}）
        </Heading>
        <div className="mt-3 flex flex-col gap-3">
          {pending.length ? pending.map((o) => renderOrder(o, true)) : (
            <Text variant="body-sm" color="secondary">
              当前没有待审核付款。
            </Text>
          )}
        </div>

        <Heading as="h2" size="h3" className="mt-8">
          已开通（{approved.length}）
        </Heading>
        <div className="mt-3 flex flex-col gap-3">
          {approved.length ? approved.map((o) => renderOrder(o, false)) : (
            <Text variant="body-sm" color="secondary">
              暂无已开通付款。
            </Text>
          )}
        </div>

        <Heading as="h2" size="h3" className="mt-8">
          已拒绝（{rejected.length}）
        </Heading>
        <div className="mt-3 flex flex-col gap-3">
          {rejected.length ? rejected.map((o) => renderOrder(o, false)) : (
            <Text variant="body-sm" color="secondary">
              暂无已拒绝付款。
            </Text>
          )}
        </div>

        <Heading as="h2" size="h3" className="mt-8">
          系统测试（{tests.length}）
        </Heading>
        <div className="mt-3 flex flex-col gap-3">
          {tests.length ? tests.map((o) => renderOrder(o, o.status === "pending")) : (
            <Text variant="body-sm" color="secondary">
              暂无系统测试订单。
            </Text>
          )}
        </div>
      </Section>
    </main>
  );
}
