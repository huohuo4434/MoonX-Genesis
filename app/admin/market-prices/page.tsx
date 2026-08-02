import { AdminNav } from "@/components/admin/AdminNav";
import { ManualMarketPricesClient } from "@/components/admin/ManualMarketPricesClient";
import { Heading, Section, Text } from "@/components/ui";
import {
  listManualMarketPrices,
  MANUAL_PRICE_ASSETS,
} from "@/lib/market-data/manual-market-prices";
import { countPendingPaymentOrders } from "@/lib/payments/payment-orders-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMarketPricesPage() {
  const [manual, pending] = await Promise.all([
    listManualMarketPrices(),
    countPendingPaymentOrders(),
  ]);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/market-prices" pendingCount={pending} />
        <Heading as="h1" size="h2">行情录入与自动源检查</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6 block max-w-4xl">
          自动行情无法取得时，在这里录入当天价格。手动价格只作为兜底，不会覆盖已经成功取得的实时行情；超过96小时自动失效。
        </Text>
        <ManualMarketPricesClient assets={MANUAL_PRICE_ASSETS} initialManual={manual} />
      </Section>
    </main>
  );
}
