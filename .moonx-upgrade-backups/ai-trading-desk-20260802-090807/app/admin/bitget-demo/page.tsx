import { AdminNav } from "@/components/admin/AdminNav";
import { BitgetDemoClient } from "@/components/admin/BitgetDemoClient";
import { PredictionAutoTraderClient } from "@/components/admin/PredictionAutoTraderClient";
import { Heading, Section, Text } from "@/components/ui";
import { getBitgetDemoDashboard } from "@/lib/bitget/demo-connector";
import { getPredictionAutoTraderDashboard } from "@/lib/trading-signals/prediction-auto-trader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBitgetDemoPage() {
  const [dashboard, autoTrader] = await Promise.all([
    getBitgetDemoDashboard(),
    getPredictionAutoTraderDashboard(),
  ]);
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/bitget-demo" />
        <Heading as="h1" size="h2">Bitget Demo执行连接器</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6 max-w-4xl">
          把MoonX预测产生的模拟成交镜像到Bitget模拟盘。自动交易最多监控10个USDT合约币种，默认逐仓、单向、1倍杠杆；具体币种仍需Bitget Demo支持。
        </Text>
        <div className="space-y-10">
          <BitgetDemoClient initial={dashboard} />
          <PredictionAutoTraderClient initial={autoTrader} />
        </div>
      </Section>
    </main>
  );
}
