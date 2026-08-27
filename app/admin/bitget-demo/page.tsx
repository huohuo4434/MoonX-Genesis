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
            1000 USDT、30天、{allowedCount}个正式允许USDT合约品种、最高2倍逐仓。{allowedCount}个允许品种全部扫描，动态Top10进入候选排序；玄学与锁定预测决定多空方向，技术结构只负责寻找入场时点和风控位置。所有新开仓仍必须通过实盘安全闸门。
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
                首笔闭环验收风险预算0.05%，最长持有30分钟；系统从正式允许池选择玄学方向最明确的可交易品种，BTC/ETH只有在允许池中才优先；短线、波段和中长期单笔计划风险分别为0.25%、0.35%和0.25%。每日开单数量不设机械配额，超短、短线、中线和长线独立寻找机会；最多同时持有10个仓位，单仓名义价值不超过账户权益30%且默认不超过300 USDT。单日账户亏损达到100 USDT后停止当天新开仓，总权益较峰值回撤达到500 USDT后停止实验并尝试平掉全部仓位。系统只在条件满足时下单，不会为了凑单强行交易。
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
