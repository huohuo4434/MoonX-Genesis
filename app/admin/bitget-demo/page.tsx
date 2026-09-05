import { AdminNav } from "@/components/admin/AdminNav";
import { BitgetDemoClient } from "@/components/admin/BitgetDemoClient";
import { BitgetLiveConsoleLoader } from "@/components/admin/BitgetLiveConsoleLoader";
import { BitgetLiveReadinessClient } from "@/components/admin/BitgetLiveReadinessClient";
import { PredictionAutoTraderClient } from "@/components/admin/PredictionAutoTraderClient";
import { AiTradingDeskSettingsClient } from "@/components/admin/AiTradingDeskSettingsClient";
import { ThreeHorizonStrategyClient } from "@/components/admin/ThreeHorizonStrategyClient";
import { StrategyValidationClient } from "@/components/admin/StrategyValidationClient";
import { TradingReliabilityClient } from "@/components/admin/TradingReliabilityClient";
import { AiTradePlanAdminClient } from "@/components/admin/AiTradePlanAdminClient";
import { Card, Heading, Section, Text } from "@/components/ui";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import { getBitgetDemoAdminDashboard } from "@/lib/bitget/demo-runtime";
import { getPredictionAutoTraderDashboard } from "@/lib/trading-signals/prediction-auto-trader";
import { getMemberAiTradingDeskSettings } from "@/lib/trading-signals/member-ai-trading-desk";
import { getTradingReliabilityDashboard } from "@/lib/trading-signals/trading-reliability";
import { getAiTradePlanDashboard } from "@/lib/trading-signals/ai-trade-plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBitgetDemoPage() {
  const environment = getBitgetDemoEnvironment();
  const live = environment.mode === "LIVE_EXPERIMENT";
  const cronAuthorized = Boolean(process.env.CRON_SECRET);
  const commissioningEnabled = process.env.BITGET_LIVE_COMMISSIONING_ENABLED?.toLowerCase() !== "false";
  const allowedCount = environment.liveAllowedSymbols.length;

  if (live) {
    return (
      <main>
        <Section spacing="lg">
          <AdminNav current="/admin/bitget-demo" />
          <Heading as="h1" size="h2">Bitget 实盘实验控制台</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 mb-6 max-w-4xl">
            当前引擎配置：预算{environment.liveInitialCapitalUsdt} USDT、期限{environment.liveDurationDays}天、{allowedCount}个允许USDT合约品种、最高{environment.leverage}倍杠杆。配置不代表实验已续期或可以开仓；实际期限和阻断原因见下方状态。各周期分批轮转扫描，锁定预测决定方向，技术结构确定入场与风控位置。
          </Text>
          <div className="space-y-8">
            <Card padding="lg" className={cronAuthorized && commissioningEnabled ? "border-emerald-400/25 bg-emerald-400/[0.035]" : "border-amber-400/25 bg-amber-400/[0.035]"}>
              <Heading size="h3">自动交易启动诊断</Heading>
              <Text variant="body-sm" color="secondary" className="mt-2 block leading-relaxed">
                {cronAuthorized
                  ? "Vercel 自动任务鉴权已配置；服务器每分钟可进入实盘运行链路。"
                  : "CRON_SECRET 未配置：生产环境的自动交易任务会被服务器拒绝。系统不会绕过鉴权，请先在 Vercel 环境变量中完成配置。"}
                {commissioningEnabled
                  ? " 首笔小额闭环默认开启；BTC/ETH只有在正式允许池中才优先。方向只读取MOOX已锁定的玄学方向，技术只负责入场时机。"
                  : " BITGET_LIVE_COMMISSIONING_ENABLED 当前被显式关闭，因此首笔闭环不会自动下单。"}
              </Text>
            </Card>
            <BitgetLiveReadinessClient />
            <AiTradePlanAdminClient lazy />
            <Card padding="lg" className="border-red-400/25 bg-red-400/[0.035]">
              <Heading size="h3">真实资金安全边界</Heading>
              <Text variant="body-sm" color="secondary" className="mt-2 block leading-relaxed">
                当前账户上限：同时持仓{environment.liveMaxConcurrentPositions}个、每日开仓{environment.liveMaxTradesPerDay}笔；单仓名义价值不超过账户权益30%与{environment.liveMaxPositionNotionalUsdt} USDT中的较小值。
                日亏损限额{environment.liveDailyLossUsdt} USDT，峰值回撤限额{environment.liveMaxDrawdownUsdt} USDT；达到限额将阻断新增敞口，具体处置以运行状态为准。
                策略和托管检查还可进一步收紧。短线30～90分钟，中线2～3天（新仓最多72小时），长线1～4周且须符合年度窗口；不保证每天成交，也不因达到日期就机械下单。
              </Text>
            </Card>
            <BitgetLiveConsoleLoader />
          </div>
        </Section>
      </main>
    );
  }

  const [dashboard, autoTrader, publicDeskSettings, reliability, plans] = await Promise.all([
    getBitgetDemoAdminDashboard(),
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
