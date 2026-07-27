import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckoutClient } from "@/components/payments/CheckoutClient";
import { Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/membership";
import { getPaymentConfig } from "@/lib/payments/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${orderNumber}`);

  const admin = createSupabaseAdminClient();
  if (!admin) notFound();

  const { data: order } = await admin
    .from("payment_orders")
    .select("*")
    .eq("order_number", orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  const cfg = getPaymentConfig();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    order.recipient_address
  )}`;

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2" className="mb-2">
          支付订单 {order.order_number}
        </Heading>
        <Text variant="body-sm" color="secondary" className="mb-6">
          请在 {new Date(order.expires_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} 前完成付款
        </Text>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg" className="flex flex-col gap-3">
            <Text variant="label" color="secondary">
              {order.chain === "TRON" ? "USDT-TRC20" : "Binance-Peg BSC-USD"}
            </Text>
            <Text variant="body" weight="semibold">
              精确金额：{Number(order.expected_amount)} {order.token_symbol}
            </Text>
            <Text variant="body-sm" color="secondary" className="font-mono break-all">
              收款地址：{order.recipient_address}
            </Text>
            <Text variant="caption" color="tertiary">
              代币合约：{order.token_contract}
            </Text>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="收款地址二维码" width={200} height={200} className="rounded-md border" />
            <Text variant="caption" color="tertiary">
              只发送订单指定代币与网络。不要发送 TRX、BNB 或其他代币。错链错币无法自动找回。
            </Text>
          </Card>
          <CheckoutClient orderNumber={orderNumber} supportEmail={cfg.supportEmail} />
        </div>

        <Link href="/account/orders" className="mt-6 inline-block text-body-sm text-primary hover:underline">
          返回我的订单
        </Link>
      </Section>
    </main>
  );
}
