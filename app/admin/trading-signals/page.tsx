import { AdminNav } from "@/components/admin/AdminNav";
import { TradingSignalCenterClient } from "@/components/admin/TradingSignalCenterClient";
import { Heading, Section, Text } from "@/components/ui";
import { getTradeSignalDashboardSnapshot } from "@/lib/trading-signals/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTradingSignalsPage() {
  const snapshot = await getTradeSignalDashboardSnapshot();
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/trading-signals" />
        <Heading as="h1" size="h2">AI交易信号中心</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6 max-w-4xl">
          把预测变成可执行计划：入场、触发、止损、分批止盈、仓位、多方法共识和真实收益统计。当前版本只允许模拟盘执行。
        </Text>
        <TradingSignalCenterClient initial={snapshot} />
      </Section>
    </main>
  );
}
