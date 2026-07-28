import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPaymentEmailTest } from "@/components/admin/AdminPaymentEmailTest";
import { Card, Heading, Section, Text } from "@/components/ui";
import { countPendingPaymentOrders } from "@/lib/payments/payment-orders-store";
import { isPaymentEmailConfigured, paymentEmailFrom, paymentNotifyTo } from "@/lib/email/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSettingsPage() {
  const pending = await countPendingPaymentOrders();
  const emailOn = isPaymentEmailConfigured();

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/settings" pendingCount={pending} />
        <Heading as="h1" size="h2">
          设置
        </Heading>
        <Card padding="lg" className="mt-6 max-w-lg space-y-3">
          <Text variant="body-sm" weight="semibold">
            付款邮件通知
          </Text>
          <Text variant="body-sm" color="secondary" className="block">
            状态：{emailOn ? "已配置" : "未配置"}
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            通知收件人：{paymentNotifyTo()}
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            发件人：{paymentEmailFrom()}
          </Text>
          {!emailOn ? (
            <Text variant="body-sm" className="block">
              邮件通知尚未配置，但后台订单提醒正常工作。
            </Text>
          ) : null}
          <AdminPaymentEmailTest configured={emailOn} />
        </Card>
      </Section>
    </main>
  );
}
