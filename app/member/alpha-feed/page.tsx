import type { Metadata } from "next";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import type {
  XIntelligenceDirection,
  XIntelligenceMomentum,
  XIntelligenceStage,
} from "@/lib/trading-signals/x-intelligence-core";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { buildXIntelligenceAutoWeight } from "@/lib/trading-signals/x-intelligence-overlay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const path = "/member/alpha-feed";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "山寨币资金雷达",
    titleEn: "Altcoin Rotation Radar",
    descriptionZh: "会员专享：聚合公开市场资金线索，识别热度、方向、阶段、关键位置与追高风险。",
    descriptionEn: "Member-only aggregation of public market signals, including heat, direction, stage, key levels and chase risk.",
  });
}

function directionLabel(direction: XIntelligenceDirection, en: boolean): string {
  if (direction === "LONG") return en ? "Bullish watch" : "偏多观察";
  if (direction === "SHORT") return en ? "Bearish watch" : "偏空观察";
  return en ? "Neutral / mixed" : "中性 / 分歧";
}

function stageLabel(stage: XIntelligenceStage, en: boolean): string {
  if (stage === "EARLY_WATCH") return en ? "Early watch" : "早期观察";
  if (stage === "CONFIRMATION") return en ? "Confirmation" : "确认阶段";
  if (stage === "OVERHEATED") return en ? "Possibly overheated" : "可能过热";
  return en ? "Observe" : "信息观察";
}

function momentumLabel(momentum: XIntelligenceMomentum, en: boolean): string {
  if (momentum === "NEW") return en ? "New narrative" : "新叙事出现";
  if (momentum === "ACCELERATING") return en ? "Heat accelerating" : "热度加速";
  if (momentum === "COOLING") return en ? "Heat cooling" : "热度降温";
  return en ? "Heat stable" : "热度平稳";
}

function actionText(stage: XIntelligenceStage, en: boolean): string {
  if (stage === "EARLY_WATCH") {
    return en
      ? "Add to watch first. Confirm liquidity, volume and invalidation before considering a small position."
      : "先加入观察；确认流动性、成交量和失效条件后，才考虑小仓。";
  }
  if (stage === "CONFIRMATION") {
    return en
      ? "Check whether price remains near the trigger area. Skip the trade if it has already moved too far."
      : "核对价格是否仍在触发区附近；偏离过大就放弃追单。";
  }
  if (stage === "OVERHEATED") {
    return en
      ? "Do not chase. Wait for a retest, turnover and a fresh structure."
      : "不要追高；等待回踩、换手和新的结构确认。";
  }
  return en
    ? "Keep it in observation and wait for price, volume and liquidity confirmation."
    : "继续观察，等待价格、成交量与流动性共同确认。";
}

export default async function AlphaFeedPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return (
      <main><Section spacing="lg"><PublicFeaturePreview
        eyebrow={en ? "Member smart-money radar · Public preview" : "会员资金雷达 · 公开预览"}
        title={en ? "Track capital rotation, not a blind call" : "捕捉资金节奏，不盲目追单"}
        description={en ? "MOOX aggregates public market signals and converts them into anonymous symbol-level statistics: heat, direction, stage, levels and risk. It is an observation layer, not an automatic buy instruction." : "MOOX聚合公开市场资金线索，并转化为匿名的币种级统计：热度、方向、阶段、位置与风险。它是观察层，不是自动买入指令。"}
        solves={en ? ["Reduce repeated manual scanning", "Separate early ideas from overheated moves", "Keep timestamped statistics for verification"] : ["减少反复手动刷信息", "区分早期机会与已经过热的行情", "保留时间戳统计，便于事后验证"]}
        memberBenefits={en ? ["24-hour narrative heat", "Direction and stage aggregation", "Early/confirmation/overheated classification", "Key levels and risk notes"] : ["24小时叙事热度", "方向与阶段聚合", "早期/确认/过热分类", "关键位置与风险提示"]}
        exampleTitle={en ? "Example assessment" : "示例判断"}
        exampleLines={en ? ["Heat: Accelerating", "Stage: Early watch", "Action: Add to watch, do not chase", "Risk: High volatility and low liquidity"] : ["热度：正在加速", "阶段：早期观察", "动作：加入观察，不直接追单", "风险：高波动与低流动性"]}
        nextPath={en ? `/en${path}` : path}
      /></Section></main>
    );
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }

  const snapshot = await getXIntelligenceSnapshot();
  const { aggregate, collector } = snapshot;
  const visible = aggregate.summaries.filter((item) => item.mentions24h > 0 || item.momentum === "NEW").slice(0, 16);

  return (
    <main>
      <Section spacing="lg">
        <MemberDeviceHeartbeat />
        <div className="max-w-4xl">
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MOOX SMART MONEY · NARRATIVE RADAR</Text>
          <Heading as="h1" size="h2" className="mt-2">{en ? "Altcoin Rotation Radar" : "山寨币资金雷达"}</Heading>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">
            {en ? "MOOX converts public market clues into anonymous symbol-level statistics. It shows heat, direction, stage and risk without displaying the identity of any monitored source. No clue becomes an automatic trade." : "MOOX把公开市场线索转化为匿名的币种级统计，只展示热度、方向、阶段与风险，不展示任何监测来源身份。任何线索都不会直接变成自动交易。"}
          </Text>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card padding="md">
            <Text variant="caption" color="tertiary">{en ? "Valid clues · 24h" : "24小时有效线索"}</Text>
            <Text variant="body" weight="semibold" className="mt-2 block text-2xl">{aggregate.parsedPosts24h}</Text>
          </Card>
          <Card padding="md">
            <Text variant="caption" color="tertiary">{en ? "Assets covered · 24h" : "24小时覆盖币种"}</Text>
            <Text variant="body" weight="semibold" className="mt-2 block text-2xl">{aggregate.symbols24h}</Text>
          </Card>
          <Card padding="md">
            <Text variant="caption" color="tertiary">{en ? "Bull / bear clues" : "多空线索"}</Text>
            <Text variant="body" weight="semibold" className="mt-2 block">
              {en ? `Bull ${aggregate.longSignals24h} · Bear ${aggregate.shortSignals24h}` : `多 ${aggregate.longSignals24h} · 空 ${aggregate.shortSignals24h}`}
            </Text>
          </Card>
          <Card padding="md">
            <Text variant="caption" color="tertiary">{en ? "Radar status" : "雷达状态"}</Text>
            <Text variant="body" weight="semibold" className="mt-2 block">
              {collector.status === "HEALTHY" ? (en ? "Online" : "在线") : (en ? "Data may be delayed" : "数据可能延迟")}
            </Text>
          </Card>
        </div>

        <Card padding="md" className="border border-amber-500/20 bg-amber-500/[0.05]">
          <Text variant="body-sm" weight="semibold">{en ? "Execution rule" : "执行规则"}</Text>
          <Text variant="caption" color="tertiary" className="mt-1 block leading-relaxed">
            {en ? "Observe → verify liquidity and price → define invalidation → consider a small position. A symbol with more mentions is not automatically a better trade." : "观察 → 核对流动性和价格 → 写明失效条件 → 才考虑小仓。提及次数多，不等于一定值得交易。"}
          </Text>
        </Card>

        {visible.length === 0 ? (
          <Card padding="lg" className="border border-dashed border-white/10">
            <Heading as="h2" size="h3">{en ? "Waiting for the first radar data" : "等待首批雷达数据"}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 leading-relaxed">
              {en ? "No valid symbol-level statistics are ready yet. Data will appear after the private collector and MOOX screening complete." : "目前尚无达到展示标准的币种级统计。私有采集器和MOOX筛选完成后会自动显示。"}
            </Text>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((item) => {
              const autoWeight = buildXIntelligenceAutoWeight(item);
              return (
              <Card key={item.symbol} padding="md" className="flex h-full flex-col border border-white/[0.08] bg-gradient-to-br from-white/[0.035] to-transparent">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{item.symbol.replace(/USDT$/, "")}</Badge>
                  <Badge variant={item.direction === "LONG" ? "success" : item.direction === "SHORT" ? "danger" : "outline"}>
                    {directionLabel(item.direction, en)}
                  </Badge>
                  <Badge variant={item.risk === "HIGH" ? "danger" : item.risk === "MEDIUM" ? "warning" : "outline"}>
                    {stageLabel(item.dominantStage, en)}
                  </Badge>
                  <Badge variant="outline">{momentumLabel(item.momentum, en)}</Badge>
                  {autoWeight ? <Badge variant="outline">{en ? `Auto weight ${autoWeight.weightPct}%` : `自动权重 ${autoWeight.weightPct}%`}</Badge> : null}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border border-white/[0.07] bg-black/20 p-2">
                    <Text variant="caption" color="tertiary" className="block">{en ? "6h" : "近6小时"}</Text>
                    <Text variant="body-sm" weight="semibold" className="mt-1 block">{item.mentions6h}</Text>
                  </div>
                  <div className="rounded-md border border-white/[0.07] bg-black/20 p-2">
                    <Text variant="caption" color="tertiary" className="block">{en ? "24h" : "近24小时"}</Text>
                    <Text variant="body-sm" weight="semibold" className="mt-1 block">{item.mentions24h}</Text>
                  </div>
                  <div className="rounded-md border border-white/[0.07] bg-black/20 p-2">
                    <Text variant="caption" color="tertiary" className="block">{en ? "7d" : "近7天"}</Text>
                    <Text variant="body-sm" weight="semibold" className="mt-1 block">{item.mentions7d}</Text>
                  </div>
                </div>

                <Text variant="body-sm" className="mt-3 block leading-relaxed text-white/80">
                  {en
                    ? `Direction score ${item.directionScore > 0 ? "+" : ""}${item.directionScore}; average parsing confidence ${item.averageConfidence}%. ${item.uniqueSources24h} anonymous signal groups, ${Math.round(item.agreementRatio24h * 100)}% directional agreement. ${autoWeight ? `Automatic forecast adjustment ${autoWeight.probabilityShiftPct > 0 ? "+" : ""}${autoWeight.probabilityShiftPct}pp.` : ""}`
                    : `方向分 ${item.directionScore > 0 ? "+" : ""}${item.directionScore}，平均解析置信度 ${item.averageConfidence}%。24小时独立信号源 ${item.uniqueSources24h} 组，方向一致度 ${Math.round(item.agreementRatio24h * 100)}%。${autoWeight ? `自动预测修订 ${autoWeight.probabilityShiftPct > 0 ? "+" : ""}${autoWeight.probabilityShiftPct} 个百分点。` : ""}`}
                </Text>

                {item.keyLevels.length > 0 || item.timeWindows.length > 0 ? (
                  <div className="mt-3 rounded-md border border-white/[0.07] bg-black/20 p-3">
                    {item.keyLevels.length > 0 ? (
                      <Text variant="caption" color="secondary" className="block leading-relaxed">
                        {en ? "Recognized levels" : "识别位置"}: {item.keyLevels.join(" / ")}
                      </Text>
                    ) : null}
                    {item.timeWindows.length > 0 ? (
                      <Text variant="caption" color="secondary" className="mt-1 block leading-relaxed">
                        {en ? "Time windows" : "时间窗口"}: {item.timeWindows.join(" / ")}
                      </Text>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-3 rounded-md border border-white/[0.07] bg-black/20 p-3">
                  <Text variant="caption" color="tertiary" className="block">{en ? "MOOX action" : "MOOX处理建议"}</Text>
                  <Text variant="body-sm" className="mt-1 block leading-relaxed">{actionText(item.dominantStage, en)}</Text>
                </div>

                <Text variant="caption" className="mt-auto pt-4 text-white/40">
                  {en ? "Latest radar record" : "最近雷达记录"}: {formatDateTimeChina(item.newestPostedAt)}
                </Text>
              </Card>
              );
            })}
          </div>
        )}
      </Section>
    </main>
  );
}
