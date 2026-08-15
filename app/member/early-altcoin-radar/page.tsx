import type { Metadata } from "next";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { getOrRefreshEarlyAltcoinRadar, type EarlyAltcoinCandidate, type EarlyAltcoinVerdict } from "@/lib/trading-signals/early-altcoin-radar";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { PUBLIC_ATTRIBUTION_DISCLOSURE_EN,PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,PUBLIC_MARKET_VIEW_LABEL_ZH,projectPublicAttribution,type PublicProjection } from "@/lib/presentation/public-attribution";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const path = "/member/early-altcoin-radar";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "早期山寨币雷达",
    titleEn: "Early Altcoin Radar",
    descriptionZh: "会员专享：聚焦新上市、刚起量、仅链上可交易的早期山寨币，并给出明确结论与动作。",
    descriptionEn: "Member-only early altcoin radar for newly listed and on-chain-only tokens with explicit conclusions.",
  });
}

function variant(verdict: EarlyAltcoinVerdict): "success" | "warning" | "danger" | "outline" | "neutral" {
  if (verdict === "EARLY_CANDIDATE") return "success";
  if (verdict === "WAIT_PULLBACK" || verdict === "TOO_HOT") return "warning";
  if (verdict === "AVOID") return "danger";
  return "outline";
}

function num(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (Math.abs(value) >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: digits });
  return value.toLocaleString("en-US", { maximumFractionDigits: 8 });
}
function pct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
function age(value: number | null): string {
  if (value === null) return "—";
  return value < 48 ? `${value.toFixed(1)}小时` : `${(value / 24).toFixed(1)}天`;
}

function CandidateCard({ item }: { item: PublicProjection<EarlyAltcoinCandidate> }) {
  return (
    <Card padding="md" className={`border ${item.verdict === "EARLY_CANDIDATE" ? "border-emerald-300/35 bg-emerald-300/[0.045]" : item.verdict === "AVOID" ? "border-rose-300/25 bg-rose-300/[0.035]" : "border-white/[0.08] bg-white/[0.025]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{item.symbol}</Badge>
        <Badge variant={variant(item.verdict)}>{item.verdictZh}</Badge>
        <Badge variant="outline">{PUBLIC_MARKET_VIEW_LABEL_ZH}</Badge>
        <Badge variant="outline">{item.marketStageZh}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading as="h3" size="h3">{item.symbol}{item.name ? ` · ${item.name}` : ""}</Heading>
          <Text variant="caption" color="tertiary" className="mt-1 block">MOOX早期评分 {item.score}/100 · 发现时间 {formatDateTimeChina(item.postedAt)}</Text>
        </div>
        <div className="text-right"><Text variant="caption" color="tertiary" className="block">当前价格</Text><Text variant="body" weight="semibold">{item.currentPriceUsd === null ? "—" : `$${num(item.currentPriceUsd)}`}</Text></div>
      </div>

      <div className="mt-4 rounded-xl border border-violet-300/20 bg-violet-300/[0.055] p-4">
        <Text variant="caption" color="tertiary" className="block">最终结论</Text>
        <Text variant="body" weight="semibold" className="mt-1 block leading-relaxed">{item.finalConclusionZh}</Text>
        <div className="mt-3 rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <Text variant="caption" color="tertiary" className="block">现在怎么做</Text>
          <Text variant="body" weight="semibold" className="mt-1 block text-amber-100">{item.actionZh}</Text>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2"><Text variant="caption" color="tertiary" className="block">24h涨跌</Text><Text variant="body-sm" weight="semibold" className={(item.change24hPct ?? 0) >= 0 ? "mt-1 block text-emerald-300" : "mt-1 block text-rose-300"}>{pct(item.change24hPct)}</Text></div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2"><Text variant="caption" color="tertiary" className="block">DEX流动性</Text><Text variant="body-sm" weight="semibold" className="mt-1 block">{num(item.liquidityUsd)}</Text></div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2"><Text variant="caption" color="tertiary" className="block">24h成交</Text><Text variant="body-sm" weight="semibold" className="mt-1 block">{num(item.volume24hUsd)}</Text></div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2"><Text variant="caption" color="tertiary" className="block">池子年龄</Text><Text variant="body-sm" weight="semibold" className="mt-1 block">{age(item.pairAgeHours)}</Text></div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.035] p-3">
          <Text variant="caption" color="tertiary" className="block">在哪里能买</Text>
          {item.dexUrl ? <Text variant="body-sm" className="mt-1 block">• 链上：{item.dexName ?? "DEX"}（已识别交易池）</Text> : <Text variant="body-sm" color="secondary" className="mt-1 block">• 暂未识别可靠DEX池</Text>}
          {item.bitgetSpot ? <Text variant="body-sm" className="mt-1 block">• Bitget现货：{item.symbol}USDT</Text> : null}
          {item.bitgetFutures ? <Text variant="body-sm" className="mt-1 block">• Bitget U本位：{item.symbol}USDT</Text> : null}
          {!item.bitgetSpot && !item.bitgetFutures ? <Text variant="body-sm" color="secondary" className="mt-1 block">• Bitget暂未检测到在线交易市场</Text> : null}
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3">
          <Text variant="caption" color="tertiary" className="block">信号后表现</Text>
          <Text variant="body-sm" className="mt-1 block">首次记录：{item.firstSeenPriceUsd === null ? "—" : `$${num(item.firstSeenPriceUsd)}`}</Text>
          <Text variant="body-sm" className="mt-1 block">当前相对首次：{pct(item.returnSinceFirstSeenPct)}</Text>
          <Text variant="body-sm" className="mt-1 block">已观测最大涨幅：{pct(item.maxObservedReturnPct)}</Text>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/20 p-3">
        <Text variant="caption" color="tertiary" className="block">为什么这样判断</Text>
        {item.reasonsZh.map((reason) => <Text key={reason} variant="body-sm" color="secondary" className="mt-1 block">• {reason}</Text>)}
      </div>

      {item.riskFlagsZh.length > 0 ? <div className="mt-3 rounded-lg border border-rose-300/15 bg-rose-300/[0.035] p-3"><Text variant="caption" className="block text-rose-200">风险提醒</Text>{item.riskFlagsZh.map((flag) => <Text key={flag} variant="body-sm" color="secondary" className="mt-1 block">• {flag}</Text>)}</div> : null}

      <details className="mt-3 rounded-lg border border-white/[0.07] bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-white/80">查看市场与合约核验</summary>
        {item.contractAddress ? <Text variant="caption" color="tertiary" className="mt-2 block break-all">合约地址：{item.contractAddress}</Text> : null}
        {item.chainId ? <Text variant="caption" color="tertiary" className="mt-1 block">链：{item.chainId}</Text> : null}
      </details>
    </Card>
  );
}

export default async function EarlyAltcoinRadarPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Member early-token intelligence" : "会员早期山寨币雷达 · 公开预览"}
      title={en ? "Find new tokens before they become mainstream" : "只抓新、早、小：新上市币和只能链上买的早期币"}
      description={en ? PUBLIC_ATTRIBUTION_DISCLOSURE_EN : PUBLIC_ATTRIBUTION_DISCLOSURE_ZH}
      solves={en ? ["Separate early tokens from mainstream assets", "Show where the token actually trades", "Make the final action explicit"] : ["主流币和股票不再混进山寨币雷达", "直接告诉你链上还是交易所能买", "最终结论和动作放第一屏"]}
      memberBenefits={en ? ["Independent market screening", "On-chain metrics", "Signal performance tracking"] : ["易老师市场研判", "链上流动性/成交/池龄", "首次发现后的真实涨跌跟踪"]}
      exampleTitle={en ? "Example" : "示例"}
      exampleLines={en ? ["NEWCOIN · Early candidate", "On-chain only", "Wait for pullback"] : ["NEWCOIN：🚨早期候选", "仅链上可买", "结论：等回踩，小仓位，不追"]}
      nextPath={en ? `/en${path}` : path}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  let report;
  try { report = projectPublicAttribution(await getOrRefreshEarlyAltcoinRadar(20),{locale:en?"en":"zh"}); } catch { report = null; }

  return (
    <main>
      <Section spacing="lg">
        <MemberDeviceHeartbeat />
        <div className="max-w-5xl">
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MOOX EARLY ALTCOIN RADAR · 15 MIN</Text>
          <Heading as="h1" size="h2" className="mt-2">{en ? "Early Altcoin Radar" : "早期山寨币雷达"}</Heading>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">{en ? PUBLIC_ATTRIBUTION_DISCLOSURE_EN : PUBLIC_ATTRIBUTION_DISCLOSURE_ZH}</Text>
        </div>

        {!report ? <Card padding="lg" className="border border-dashed border-white/10"><Heading as="h2" size="h3">等待第一份早期山寨币报告</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">重点源下一轮采集完成后会自动生成。</Text></Card> : <>
          <Card padding="lg" className={`border ${report.earlyCandidateCount > 0 ? "border-emerald-300/25 bg-emerald-300/[0.045]" : "border-violet-300/20 bg-violet-300/[0.04]"}`}>
            <Text variant="caption" color="tertiary" className="block">本轮最终结论</Text>
            <Heading as="h2" size="h2" className="mt-2">{report.conclusionZh}</Heading>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{report.actionSummaryZh.slice(0, 6).map((row) => <div key={row} className="rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm text-white/85">{row}</div>)}</div>
            <div className="mt-4 flex flex-wrap gap-2"><Badge variant={report.earlyCandidateCount > 0 ? "success" : "outline"}>{report.earlyCandidateCount} 个早期候选</Badge><Badge variant="outline">共跟踪 {report.candidateCount} 个新币线索</Badge></div>
            <Text variant="caption" color="tertiary" className="mt-2 block">生成：{formatDateTimeChina(report.generatedAt)}</Text>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">{report.candidates.map((item) => <CandidateCard key={item.id} item={item} />)}</div>

          <Card padding="md" className="border border-amber-300/15 bg-amber-300/[0.035]"><Text variant="body-sm" color="secondary" className="leading-relaxed">{report.noteZh}</Text></Card>
        </>}
      </Section>
    </main>
  );
}
