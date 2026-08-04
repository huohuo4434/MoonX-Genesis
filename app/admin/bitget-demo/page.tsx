import { AdminNav } from "@/components/admin/AdminNav";
import { BitgetDemoClient } from "@/components/admin/BitgetDemoClient";
import { PredictionAutoTraderClient } from "@/components/admin/PredictionAutoTraderClient";
import { AiTradingDeskSettingsClient } from "@/components/admin/AiTradingDeskSettingsClient";
import { ThreeHorizonStrategyClient } from "@/components/admin/ThreeHorizonStrategyClient";
import { StrategyValidationClient } from "@/components/admin/StrategyValidationClient";
import { TradingReliabilityClient } from "@/components/admin/TradingReliabilityClient";
import { AiTradePlanAdminClient } from "@/components/admin/AiTradePlanAdminClient";
import { Card, Heading, Section, Text } from "@/components/ui";
import { getBitgetDemoAdminDashboard } from "@/lib/bitget/demo-runtime";
import { getPredictionAutoTraderDashboard } from "@/lib/trading-signals/prediction-auto-trader";
import { getMemberAiTradingDeskSettings } from "@/lib/trading-signals/member-ai-trading-desk";
import { getTradingReliabilityDashboard } from "@/lib/trading-signals/trading-reliability";
import { getAiTradePlanDashboard } from "@/lib/trading-signals/ai-trade-plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBitgetDemoPage() {
  const dashboard = await getBitgetDemoAdminDashboard();
  const live = dashboard.environment.mode === "LIVE_EXPERIMENT";

  if (live) {
    return (
      <main>
        <Section spacing="lg">
          <AdminNav current="/admin/bitget-demo" />
          <Heading as="h1" size="h2">Bitget 实盘实验控制台</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 mb-6 max-w-4xl">
            1000 USDT、30天、10个USDT合约品种、最高2倍逐仓。这里只保留连接、安全状态、暂停和立即检查；旧Demo镜像、预测自动交易与测试开平仓在实盘模式下全部停用。
          </Text>
          <div className="space-y-8">
            <Card padding="lg" className="border-red-400/25 bg-red-400/[0.035]">
              <Heading size="h3">真实资金安全边界</Heading>
              <Text variant="body-sm" color="secondary" className="mt-2 block leading-relaxed">
                每天最多新开3笔，最多同时持有3个仓位，单仓名义价值不超过账户权益30%且默认不超过300 USDT；单日账户亏损达到20 USDT后停止当天新开仓，总权益较峰值回撤达到100 USDT后停止实验并尝试平掉全部仓位。API必须无提币权限；默认要求IP白名单。
              </Text>
            </Card>
            <BitgetDemoClient initial={dashboard} />
          </div>
        </Section>
      </main>
    );
  }

  const [autoTrader, publicDeskSettings, reliability, plans] = await Promise.all([
    getPredictionAutoTraderDashboard(),
    getMemberAiTradingDeskSettings(),
    getTradingReliabilityDashboard(),
    getAiTradePlanDashboard(),
  ]);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/bitget-demo" />
        <Heading as="h1" size="h2">Bitget Demo执行连接器</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6 max-w-4xl">
          服务器每分钟读取Bitget Demo行情、运行策略、对账账户并记录未下单原因；浏览器只展示状态，不再承担自动交易。MOOX站内模拟盘与Bitget Demo保持两套独立账本。
        </Text>
        <div className="space-y-10">
          <BitgetDemoClient initial={dashboard} />
          <ThreeHorizonStrategyClient initial={dashboard.threeHorizon} />
          <AiTradePlanAdminClient initial={plans} />
          <StrategyValidationClient initial={dashboard.validation} />
          <TradingReliabilityClient initial={reliability} />
          <PredictionAutoTraderClient initial={autoTrader} />
          <AiTradingDeskSettingsClient initial={publicDeskSettings} />
        </div>
      </Section>
    </main>
  );
}
