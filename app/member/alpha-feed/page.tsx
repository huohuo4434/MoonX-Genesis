import type { Metadata } from "next";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { buildMarketEnvironment, type MarketEnvironmentTone } from "@/lib/trading-signals/market-environment";
import type {
  XIntelligenceDirection,
  XIntelligenceMomentum,
  XIntelligenceStage,
} from "@/lib/trading-signals/x-intelligence-core";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const path = "/member/alpha-feed";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "市场环境",
    titleEn: "Market Environment",
    descriptionZh: "会员专享：把公开资金线索压缩为风险偏好、热度、扩散和拥挤风险，用于修正次日预测与AI候选排序。",
    descriptionEn: "Member-only market context: risk appetite, heat, breadth and crowding used to adjust next-session forecasts and AI candidate priority.",
  });
}

function badgeVariant(tone: MarketEnvironmentTone): "success" | "warning" | "danger" | "outline" {
  if (tone === "POSITIVE") return "success";
  if (tone === "CAUTION") return "warning";
  if (tone === "RISK") return "danger";
  return "outline";
}

function directionLabel(direction: XIntelligenceDirection, en: boolean): string {
  if (direction === "LONG") return en ? "Bullish" : "偏多";
  if (direction === "SHORT") return en ? "Bearish" : "偏空";
  return en ? "Mixed" : "分歧";
}

function stageLabel(stage: XIntelligenceStage, en: boolean): string {
  if (stage === "EARLY_WATCH") return en ? "Early" : "早期";
  if (stage === "CONFIRMATION") return en ? "Confirming" : "确认中";
  if (stage === "OVERHEATED") return en ? "Overheated" : "过热";
  return en ? "Observe" : "观察";
}

function momentumLabel(momentum: XIntelligenceMomentum, en: boolean): string {
  if (momentum === "NEW") return en ? "New" : "新出现";
  if (momentum === "ACCELERATING") return en ? "Accelerating" : "加速";
  if (momentum === "COOLING") return en ? "Cooling" : "降温";
  return en ? "Stable" : "平稳";
}

function strengthLabel(value: "LOW" | "MEDIUM" | "HIGH", en: boolean): string {
  if (value === "HIGH") return en ? "High" : "高";
  if (value === "MEDIUM") return en ? "Medium" : "中";
  return en ? "Low" : "低";
}

export default async function AlphaFeedPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return (
      <main><Section spacing="lg"><PublicFeaturePreview
        eyebrow={en ? "Market environment · Public preview" : "市场环境 · 公开预览"}
        title={en ? "Know whether the market context supports the forecast" : "先看市场环境是否支持主预测"}
        description={en
          ? "MOOX compresses public capital-flow clues into four readable context factors: risk appetite, heat, breadth and crowding. It is not a standalone forecast or an automatic trading signal."
          : "MOOX把公开资金线索压缩成四个可读环境因子：风险偏好、资金热度、扩散强度和拥挤风险。它不是独立预测，也不是自动下单信号。"}
        solves={en
          ? ["Adjust next-session forecast confidence", "Surface crowding and reversal risk", "Help AI prioritize candidates without bypassing risk gates"]
          : ["修正次日预测置信度", "提示拥挤与反转风险", "辅助AI候选排序，但不绕过风控"]}
        memberBenefits={en
          ? ["One market-context conclusion", "Forecast impact by major asset", "AI priority / overheat guard", "Optional statistical evidence"]
          : ["一眼看懂市场环境", "主要资产预测影响", "AI候选加分/过热降权", "可选查看统计依据"]}
        exampleTitle={en ? "Example" : "示例"}
        exampleLines={en
          ? ["Risk appetite: Mild risk-on", "Heat: Hot", "Crowding risk: Elevated", "Action: Keep bullish view, but wait for a pullback"]
          : ["风险偏好：温和偏强", "资金热度：偏热", "拥挤风险：中高", "处理：保留偏多判断，但等待回踩，不追涨"]}
        nextPath={en ? `/en${path}` : path}
      /></Section></main>
    );
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }

  const snapshot = await getXIntelligenceSnapshot();
  const { aggregate, collector } = snapshot;
  const environment = buildMarketEnvironment(aggregate);
  const evidenceRows = aggregate.summaries
    .filter((item) => item.mentions24h > 0)
    .slice(0, 8);

  return (
    <main>
      <Section spacing="lg">
        <MemberDeviceHeartbeat />

        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MOOX MARKET ENVIRONMENT · RISK CONTEXT</Text>
            <Badge variant="outline">{en ? "Auxiliary layer · Never trades alone" : "辅助层 · 不单独下单"}</Badge>
          </div>
          <Heading as="h1" size="h2" className="mt-2">{en ? "Market Environment" : "市场环境"}</Heading>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">
            {en
              ? "This page answers one question: does the current capital-flow environment support or weaken the core MOOX forecast? Raw social clues stay in the background; users see only the decision-relevant context."
              : "这里只回答一个问题：当前资金环境是在支持，还是在削弱MOOX主预测？原始社交线索留在后台，用户只看真正影响判断的环境结论。"}
          </Text>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { titleZh: "风险偏好", titleEn: "Risk appetite", band: environment.riskAppetite, helpZh: "风险资产整体环境", helpEn: "Broad risk-asset context" },
            { titleZh: "资金热度", titleEn: "Market heat", band: environment.heat, helpZh: "是否进入追涨危险区", helpEn: "Whether chase risk is rising" },
            { titleZh: "资金扩散", titleEn: "Breadth", band: environment.breadth, helpZh: "线索是广泛还是集中", helpEn: "Broad or concentrated participation" },
            { titleZh: "拥挤/反转风险", titleEn: "Crowding / reversal", band: environment.reversalRisk, helpZh: "高热度后的反向风险", helpEn: "Reversal risk after crowding" },
          ].map((row) => (
            <Card key={row.titleEn} padding="md" className="border border-white/[0.08]">
              <Text variant="caption" color="tertiary">{en ? row.titleEn : row.titleZh}</Text>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Text variant="body" weight="semibold" className="text-xl">{en ? row.band.en : row.band.zh}</Text>
                <Badge variant={badgeVariant(row.band.tone)}>{en ? "Context" : "环境"}</Badge>
              </div>
              <Text variant="caption" color="tertiary" className="mt-2 block">{en ? row.helpEn : row.helpZh}</Text>
            </Card>
          ))}
        </div>

        <Card padding="lg" className="border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Text variant="caption" color="tertiary">{en ? "Current environment conclusion" : "当前环境结论"}</Text>
              <Heading as="h2" size="h3" className="mt-2">{en ? environment.headlineEn : environment.headlineZh}</Heading>
            </div>
            <Badge variant={environment.alertLevel === "HIGH" ? "danger" : environment.alertLevel === "WATCH" ? "warning" : "outline"}>
              {environment.alertLevel === "HIGH"
                ? (en ? "Risk alert" : "风险提醒")
                : environment.alertLevel === "WATCH"
                  ? (en ? "Watch" : "需要留意")
                  : (en ? "No material alert" : "无显著警报")}
            </Badge>
          </div>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">{en ? environment.summaryEn : environment.summaryZh}</Text>
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/20 p-3">
            <Text variant="body-sm" weight="semibold">{en ? "What this layer is allowed to do" : "这个环境层只允许做三件事"}</Text>
            <Text variant="caption" color="secondary" className="mt-2 block leading-relaxed">
              {en
                ? "Adjust next-session forecast confidence · raise/lower AI candidate priority · warn about crowding. It cannot reverse a forecast by itself, bypass risk controls, or force an order."
                : "修正次日预测置信度 · 提高/降低AI候选优先级 · 提醒拥挤风险。它不能单独反转主预测、不能绕过风控、也不能为了凑交易而强制下单。"}
            </Text>
          </div>
        </Card>

        {collector.status !== "HEALTHY" ? (
          <Card padding="md" className="border border-amber-500/25 bg-amber-500/[0.05]">
            <Text variant="body-sm" weight="semibold">{en ? "Data freshness warning" : "数据新鲜度提醒"}</Text>
            <Text variant="caption" color="secondary" className="mt-1 block leading-relaxed">
              {en ? "The private collector is not fully healthy. Environment factors remain visible for audit, but the system should not increase their influence until freshness recovers." : "私有采集器当前不是完全健康状态。环境数据仍可供审计查看，但在新鲜度恢复前，系统不应提高它的影响权重。"}
            </Text>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Card padding="lg" className="border border-white/[0.08]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Heading as="h2" size="h3">{en ? "Impact on next-session forecasts" : "对次日预测的影响"}</Heading>
                <Text variant="body-sm" color="secondary" className="mt-2 leading-relaxed">
                  {en ? "Only major markets with enough effective evidence are shown. No row means the core forecast is left unchanged." : "只显示已经形成足够有效依据的主要市场；没出现的品种，主预测不因本雷达改变。"}
                </Text>
              </div>
              <Badge variant="outline">{en ? "Bounded adjustment" : "有限幅度修正"}</Badge>
            </div>

            {environment.forecastImpacts.length ? (
              <div className="mt-4 divide-y divide-white/[0.07] rounded-lg border border-white/[0.08]">
                {environment.forecastImpacts.map((impact) => (
                  <div key={impact.marketCode} className="grid gap-2 p-4 sm:grid-cols-[130px_1fr_auto] sm:items-center">
                    <div>
                      <Text variant="body-sm" weight="semibold">{en ? impact.assetEn : impact.assetZh}</Text>
                      <Text variant="caption" color="tertiary" className="mt-1 block">{impact.sourceSymbol.replace(/USDT$/, "")}</Text>
                    </div>
                    <div>
                      <Text variant="body-sm" className="block">{en ? impact.effectEn : impact.effectZh}</Text>
                      <Text variant="caption" color="tertiary" className="mt-1 block leading-relaxed">{en ? impact.noteEn : impact.noteZh}</Text>
                    </div>
                    <Badge variant={badgeVariant(impact.tone)}>{en ? `${strengthLabel(impact.strength, true)} influence` : `影响${strengthLabel(impact.strength, false)}`}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-white/[0.1] p-5">
                <Text variant="body-sm" color="secondary">{en ? "No major market currently reaches the automatic context-adjustment threshold. Core forecasts remain unchanged." : "当前没有主要市场达到自动环境修订阈值，MOOX主预测保持不变。"}</Text>
              </div>
            )}
          </Card>

          <Card padding="lg" className="border border-white/[0.08]">
            <Heading as="h2" size="h3">{en ? "How AI trading uses it" : "AI交易怎么用"}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 leading-relaxed">
              {en ? "The radar is a shortlist filter, not an entry signal. Better multi-source context can lift a symbol in the dynamic Top 10; overheated or conflicted context can push it down." : "资金雷达只做候选筛选，不做入场信号。多源共振好的品种可以在动态Top 10里加分；过热、分歧或降温的品种会降权。"}
            </Text>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
                <Text variant="caption" color="tertiary">{en ? "Priority up" : "候选加分"}</Text>
                <Text variant="body-sm" className="mt-1 block leading-relaxed">
                  {environment.aiPriorityUp.length
                    ? environment.aiPriorityUp.map((row) => row.symbol.replace(/USDT$/, "")).join(" · ")
                    : (en ? "No clear priority boost now" : "当前没有明显加分品种")}
                </Text>
              </div>
              <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] p-3">
                <Text variant="caption" color="tertiary">{en ? "Overheat / risk guard" : "过热/风险降权"}</Text>
                <Text variant="body-sm" className="mt-1 block leading-relaxed">
                  {environment.aiRiskGuards.length
                    ? environment.aiRiskGuards.map((row) => row.symbol.replace(/USDT$/, "")).join(" · ")
                    : (en ? "No strong guard now" : "当前没有明显降权品种")}
                </Text>
              </div>
            </div>

            <Text variant="caption" color="tertiary" className="mt-4 block leading-relaxed">
              {en ? "Direction, entry, stop and targets still come from the core forecast + technical structure + hard risk controls." : "最终方向、入场、止损和目标仍由主预测 + 技术结构 + 硬风控决定。"}
            </Text>
          </Card>
        </div>

        <details className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-white/85">
            {en ? "View statistical evidence (advanced)" : "查看统计依据（高级）"}
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-white/[0.07] p-3"><Text variant="caption" color="tertiary">{en ? "Valid clues · 24h" : "24小时有效线索"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{aggregate.parsedPosts24h}</Text></div>
            <div className="rounded-lg border border-white/[0.07] p-3"><Text variant="caption" color="tertiary">{en ? "Assets covered" : "覆盖资产"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{aggregate.symbols24h}</Text></div>
            <div className="rounded-lg border border-white/[0.07] p-3"><Text variant="caption" color="tertiary">{en ? "Bull / bear clues" : "多空线索"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{aggregate.longSignals24h} / {aggregate.shortSignals24h}</Text></div>
            <div className="rounded-lg border border-white/[0.07] p-3"><Text variant="caption" color="tertiary">{en ? "Data status" : "数据状态"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{collector.status === "HEALTHY" ? (en ? "Fresh" : "新鲜") : (en ? "Check freshness" : "需检查新鲜度")}</Text></div>
          </div>

          {evidenceRows.length ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-white/[0.08]">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-white/[0.035] text-xs text-white/45">
                  <tr>
                    <th className="px-3 py-2">{en ? "Asset" : "资产"}</th>
                    <th className="px-3 py-2">{en ? "Direction" : "方向"}</th>
                    <th className="px-3 py-2">{en ? "Stage" : "阶段"}</th>
                    <th className="px-3 py-2">{en ? "Momentum" : "热度变化"}</th>
                    <th className="px-3 py-2">{en ? "Independent groups" : "独立信号组"}</th>
                    <th className="px-3 py-2">{en ? "Agreement" : "方向一致度"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {evidenceRows.map((item) => (
                    <tr key={item.symbol}>
                      <td className="px-3 py-3 font-medium">{item.symbol.replace(/USDT$/, "")}</td>
                      <td className="px-3 py-3">{directionLabel(item.direction, en)}</td>
                      <td className="px-3 py-3">{stageLabel(item.dominantStage, en)}</td>
                      <td className="px-3 py-3">{momentumLabel(item.momentum, en)}</td>
                      <td className="px-3 py-3">{item.uniqueSources24h}</td>
                      <td className="px-3 py-3">{Math.round(item.agreementRatio24h * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <Text variant="caption" color="tertiary" className="mt-4 block leading-relaxed">
            {en
              ? `As of ${formatDateTimeChina(aggregate.generatedAt)}. Raw source identities, links and recognized price snippets remain private/admin-only.`
              : `数据时间 ${formatDateTimeChina(aggregate.generatedAt)}。原始来源身份、链接和识别出的价格片段继续只留在后台，不向会员数据墙式展示。`}
          </Text>
        </details>
      </Section>
    </main>
  );
}
