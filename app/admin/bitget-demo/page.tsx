import { AdminNav } from "@/components/admin/AdminNav";
import { BitgetDemoClient } from "@/components/admin/BitgetDemoClient";
import { PredictionAutoTraderClient } from "@/components/admin/PredictionAutoTraderClient";
import { AiTradingDeskSettingsClient } from "@/components/admin/AiTradingDeskSettingsClient";
import { Heading, Section, Text } from "@/components/ui";
import { getBitgetDemoDashboard } from "@/lib/bitget/demo-connector";
import { getPredictionAutoTraderDashboard } from "@/lib/trading-signals/prediction-auto-trader";
import { getMemberAiTradingDeskSettings } from "@/lib/trading-signals/member-ai-trading-desk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBitgetDemoPage() {
  const [dashboard, autoTrader, publicDeskSettings] = await Promise.all([
    getBitgetDemoDashboard(),
    getPredictionAutoTraderDashboard(),
    getMemberAiTradingDeskSettings(),
  ]);
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/bitget-demo" />
        <Heading as="h1" size="h2">Bitget Demo执行连接器</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6 max-w-4xl">
          把MOOX预测产生的模拟成交镜像到Bitget模拟盘。自动交易最多监控10个USDT合约币种，默认逐仓、单向、1倍杠杆；具体币种仍需Bitget Demo支持。
        </Text>
        <div className="space-y-10">
          <BitgetDemoClient initial={dashboard} />
          <PredictionAutoTraderClient initial={autoTrader} />
          <AiTradingDeskSettingsClient initial={publicDeskSettings} />
        </div>
      </Section>
    </main>
  );
}
