import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentUser, PLAN_LABELS } from "@/lib/auth/permissions";
import { listPaymentOrdersForEmail } from "@/lib/payments/payment-orders-store";
import { guardAccountRoute } from "@/lib/route-feature-guards";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusLabel(status: string, isTest: boolean): string {
  if (isTest && status === "pending") return "系统测试";
  if (status === "approved") return "会员已开通";
  if (status === "rejected") return "付款被拒绝";
  if (isTest) return "系统测试";
  return "等待审核";
}

export default async function AccountOrdersPage() {
  guardAccountRoute();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orders = await listPaymentOrdersForEmail(user.email);

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          我的订单
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2">
          仅显示您本人的付款记录。
        </Text>
        <div className="mt-6 flex flex-col gap-3">
          {orders.length ? (
            orders.map((item) => (
              <Card key={item.orderId} padding="md" className="overflow-hidden">
                <Text variant="body" weight="semibold">
                  {item.planName || PLAN_LABELS[item.plan]} · {statusLabel(item.status, item.isTest)}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  订单号：{item.orderNumber}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  金额：{item.amount} USDT · 网络：{item.network}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block break-all font-mono">
                  交易哈希：{item.txHash}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  提交时间：{formatDateTimeChina(item.submittedAt)}
                </Text>
              </Card>
            ))
          ) : (
            <Card padding="md">
              <Text variant="body-sm" color="secondary">
                暂无付款订单
              </Text>
              <Text variant="caption" color="tertiary" className="mt-2 block">
                账户注册立即完成；购买会员需提交交易哈希并等待管理员审核。
              </Text>
            </Card>
          )}
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href="/pricing">购买会员</Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
