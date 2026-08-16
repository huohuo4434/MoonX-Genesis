import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentUser, PLAN_LABELS } from "@/lib/auth/permissions";
import { isAutoPaymentMembershipActivated, isCompletedManualGoodwill, listAutoPaymentOrdersForUser, type AutoPaymentOrder } from "@/lib/payments/auto-payment-orders";
import { listPaymentOrdersForEmail } from "@/lib/payments/payment-orders-store";
import { guardAccountRoute } from "@/lib/route-feature-guards";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function autoStatusLabel(order: AutoPaymentOrder): string {
  if (isCompletedManualGoodwill(order)) return "少付特批已开通 · Goodwill approved";
  if (order.metadata.membershipGranted) return "会员已开通，特批审计待完成 · Active, audit pending";
  const status = order.status;
  if (isAutoPaymentMembershipActivated(order)) return "已全额开通 · Activated";
  if (status === "verifying") return "链上核验中 · Verifying";
  if (status === "pending") return "等待付款或确认 · Pending";
  if (status === "underpaid") return "金额不足 · Underpaid";
  if (status === "manual_review") return "异常复核 · Exception review";
  if (status === "expired") return "订单已过期 · Expired";
  if (status === "rejected") return "核验未通过 · Rejected";
  return status;
}

function legacyStatusLabel(status: string, isTest: boolean, notificationStatus?: string): string {
  if (isTest && status === "pending") return "系统测试";
  if (status === "approved") {
    return notificationStatus === "email_sent" || notificationStatus === "sent"
      ? "已开通 · 通知已送达"
      : "会员已开通";
  }
  if (status === "rejected") return "核验未通过";
  if (isTest) return "系统测试";
  return "旧订单 · 等待异常复核";
}

export default async function AccountOrdersPage() {
  guardAccountRoute();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const userId = user.id;
  const userEmail = user.email;

  const [autoOrders, legacyOrders] = await Promise.all([
    listAutoPaymentOrdersForUser(userId).catch(() => []),
    listPaymentOrdersForEmail(userEmail).catch(() => []),
  ]);
  const autoTx = new Set(autoOrders.map((item) => item.txHash?.toLowerCase()).filter(Boolean));
  const legacyOnly = legacyOrders.filter((item) => !autoTx.has(item.txHash.toLowerCase()));

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">我的订单</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2">
          新订单由系统自动核验并开通；只有错链、错币、少付等异常情况需要人工处理。
        </Text>
        <div className="mt-6 flex flex-col gap-3">
          {autoOrders.map((item) => (
            <Card key={item.id} padding="md" className="overflow-hidden">
              <Text variant="body" weight="semibold">
                {item.planName || PLAN_LABELS[item.plan]} · {autoStatusLabel(item)}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">订单号：{item.orderNumber}</Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                应付：{item.expectedAmount.toFixed(5)} USDT · 网络：{item.network}
              </Text>
              {item.paidAmount != null ? (
                <Text variant="caption" color="tertiary" className="mt-1 block">实付：{item.paidAmount} USDT</Text>
              ) : null}
              {item.txHash ? (
                <Text variant="caption" color="tertiary" className="mt-1 block break-all font-mono">交易哈希：{item.txHash}</Text>
              ) : null}
              <Text variant="caption" color="tertiary" className="mt-1 block">创建时间：{formatDateTimeChina(item.createdAt)}</Text>
              {item.membershipExpiresAt ? (
                <Text variant="caption" className="mt-1 block text-emerald-400">会员到期：{formatDateTimeChina(item.membershipExpiresAt)}</Text>
              ) : null}
              {item.verificationError && ["underpaid", "manual_review", "rejected"].includes(item.status) ? (
                <Text variant="caption" className="mt-2 block text-amber-400">说明：{item.verificationError}</Text>
              ) : null}
            </Card>
          ))}

          {legacyOnly.map((item) => (
            <Card key={`legacy-${item.orderId}`} padding="md" className="overflow-hidden">
              <Text variant="body" weight="semibold">
                {item.planName || PLAN_LABELS[item.plan]} · {legacyStatusLabel(item.status, item.isTest, item.notificationStatus)}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">订单号：{item.orderNumber}</Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">金额：{item.amount} USDT · 网络：{item.network}</Text>
              <Text variant="caption" color="tertiary" className="mt-1 block break-all font-mono">交易哈希：{item.txHash}</Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">提交时间：{formatDateTimeChina(item.submittedAt)}</Text>
            </Card>
          ))}

          {!autoOrders.length && !legacyOnly.length ? (
            <Card padding="md">
              <Text variant="body-sm" color="secondary">暂无付款订单 · No payment orders</Text>
            </Card>
          ) : null}

          <Button asChild size="sm" variant="outline" className="w-fit"><Link href="/pricing">购买会员 · Buy membership</Link></Button>
        </div>
      </Section>
    </main>
  );
}
