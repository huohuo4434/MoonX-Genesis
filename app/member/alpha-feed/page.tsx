import type { Metadata } from "next";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { getOrRefreshXScanReport, type XScanAssetReport, type XScanVerdict } from "@/lib/trading-signals/x-scan-report";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { PUBLIC_ATTRIBUTION_DISCLOSURE_EN,PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,projectPublicAttribution } from "@/lib/presentation/public-attribution";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const path = "/member/alpha-feed";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "市场热点追踪 · 15分钟情报报告",
    titleEn: "Market Hotspot Tracker · 15-Minute Intelligence",
    descriptionZh: "会员专享：把X扫描转成明确的市场结论、操作建议、关键理由与风险提示。",
    descriptionEn: "Member-only market hotspot tracking with explicit conclusions, actions and evidence.",
  });
}

function verdictVariant(verdict: XScanVerdict): "success" | "warning" | "danger" | "outline" | "neutral" {
  if (verdict === "BUY_CANDIDATE") return "success";
  if (verdict === "DO_NOT_CHASE") return "warning";
  if (verdict === "AVOID" || verdict === "BEARISH_WATCH") return "danger";
  return "outline";
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: digits });
  return value.toLocaleString("en-US", { maximumFractionDigits: Math.max(digits, Math.abs(value) < 1 ? 6 : digits) });
}

function percent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function directionZh(item: XScanAssetReport): string {
  if (item.direction === "LONG") return "偏多";
  if (item.direction === "SHORT") return "偏空";
  return "中性";
}

function AssetCard({ item }: { item: XScanAssetReport }) {
  return (
    <Card padding="md" className={`h-full border ${item.verdict === "BUY_CANDIDATE" ? "border-emerald-400/35 bg-emerald-400/[0.045]" : item.verdict === "AVOID" ? "border-rose-400/25 bg-rose-400/[0.035]" : "border-white/[0.08] bg-white/[0.025]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{item.displaySymbol}</Badge>
        <Badge variant={verdictVariant(item.verdict)}>{item.verdictZh}</Badge>
        <Badge variant="outline">{directionZh(item)}</Badge>
        <Badge variant="outline">{item.assetClassZh}</Badge>
      </div>

      <Heading as="h3" size="h3" className="mt-4">{item.displaySymbol}</Heading>

      <div className="mt-4 rounded-xl border border-violet-300/20 bg-violet-300/[0.055] p-4">
        <Text variant="caption" color="tertiary" className="block">最终结论</Text>
        <Text variant="body" weight="semibold" className="mt-1 block leading-relaxed">{item.finalConclusionZh}</Text>
        <div className="mt-3 rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <Text variant="caption" color="tertiary" className="block">现在怎么做</Text>
          <Text variant="body" weight="semibold" className="mt-1 block text-amber-100">{item.actionZh}</Text>
          {item.planZh.map((row) => <Text key={row} variant="body-sm" color="secondary" className="mt-1 block">• {row}</Text>)}
        </div>
      </div>

      <Text variant="body-sm" color="secondary" className="mt-4 block leading-relaxed">{item.whatIsItZh}</Text>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2"><Text variant="caption" color="tertiary" className="block">当前价格</Text><Text variant="body-sm" weight="semibold" className="mt-1 block">{formatNumber(item.currentPrice)}</Text></div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2"><Text variant="caption" color="tertiary" className="block">24小时</Text><Text variant="body-sm" weight="semibold" className={`mt-1 block ${(item.change24hPct ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{percent(item.change24hPct)}</Text></div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2"><Text variant="caption" color="tertiary" className="block">信号后表现</Text><Text variant="body-sm" weight="semibold" className="mt-1 block">{percent(item.returnSinceSignalPct)}</Text></div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2"><Text variant="caption" color="tertiary" className="block">证据强度</Text><Text variant="body-sm" weight="semibold" className="mt-1 block">一致{Math.round(item.agreementRatio24h * 100)}% · 置信{item.averageConfidence}%</Text></div>
      </div>

      <div className="mt-4 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.035] p-3">
        <Text variant="caption" color="tertiary" className="block">在哪里能交易</Text>
        {item.whereToBuyZh.map((row) => <Text key={row} variant="body-sm" className="mt-1 block">• {row}</Text>)}
      </div>

      <details className="mt-3 rounded-lg border border-white/[0.07] bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-white/80">查看判断依据与原始证据</summary>
        <div className="mt-2">
          {item.reasonsZh.map((reason) => <Text key={reason} variant="body-sm" color="secondary" className="mt-1 block leading-relaxed">• {reason}</Text>)}
          {item.keyLevels.length ? <Text variant="caption" color="tertiary" className="mt-2 block">关键位线索：{item.keyLevels.join(" / ")}</Text> : null}
          {item.timeWindows.length ? <Text variant="caption" color="tertiary" className="mt-1 block">时间窗口：{item.timeWindows.join(" / ")}</Text> : null}
        </div>
      </details>

      {item.firstSeenAt ? <Text variant="caption" className="mt-4 block text-white/35">信号基线：{formatDateTimeChina(item.firstSeenAt)} · 基准价 {formatNumber(item.firstSeenPrice)}</Text> : null}
    </Card>
  );
}

export default async function AlphaFeedPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Member market intelligence · Public preview" : "会员市场热点追踪 · 公开预览"}
      title={en ? "Know what matters and what to do next" : "不是告诉你“谁最热”，而是直接告诉你“现在该不该做”"}
      description={en ? PUBLIC_ATTRIBUTION_DISCLOSURE_EN : PUBLIC_ATTRIBUTION_DISCLOSURE_ZH}
      solves={en ? ["Clear conclusion first", "Action before raw data", "Evidence remains auditable"] : ["先给最终结论，不让会员猜", "明确写现在怎么做", "原始数据折叠保留用于复核"]}
      memberBenefits={en ? ["15-minute conclusions", "Action plan", "Market-wide hotspot context"] : ["15分钟市场结论", "明确操作建议", "全市场热点证据"]}
      exampleTitle={en ? "Example" : "示例"}
      exampleLines={en ? ["HYPE · Wait for pullback", "ETH · No trade", "SPY · Do not chase"] : ["HYPE：偏多，等回踩买点", "ETH：没有交易机会，暂不操作", "SPY：偏多但过热，不追"]}
      nextPath={en ? `/en${path}` : path}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  let report;
  try { report = projectPublicAttribution(await getOrRefreshXScanReport(20),{locale:en?"en":"zh"}); } catch { report = null; }

  return (
    <main>
      <Section spacing="lg">
        <MemberDeviceHeartbeat />
        <div className="max-w-5xl">
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MOOX X INTELLIGENCE · 15 MIN MARKET TRACKER</Text>
          <Heading as="h1" size="h2" className="mt-2">{en ? "Market Hotspot Tracker" : "市场热点追踪 · 15分钟扫描报告"}</Heading>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">{en ? "The conclusion comes first. Raw counts and source evidence are secondary." : "先说结论，再给证据。页面必须直接告诉你：现在有没有机会、该买还是等、是否不该追；帖子数量和一致度只作为判断依据。"}</Text>
        </div>

        {!report ? (
          <Card padding="lg" className="border border-dashed border-white/10"><Heading as="h2" size="h3">等待第一份15分钟报告</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">下一轮X采集或服务器报告任务完成后自动出现。</Text></Card>
        ) : (
          <>
            <Card padding="lg" className={`border ${report.buyCandidateCount > 0 ? "border-emerald-300/25 bg-emerald-300/[0.045]" : "border-violet-300/20 bg-violet-300/[0.04]"}`}>
              <Text variant="caption" color="tertiary" className="block">本轮市场最终结论</Text>
              <Heading as="h2" size="h2" className="mt-2">{report.marketConclusionZh}</Heading>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {report.topActionsZh.slice(0, 6).map((row) => <div key={row} className="rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm text-white/85">{row}</div>)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant={report.buyCandidateCount > 0 ? "success" : "outline"}>{report.buyCandidateCount > 0 ? `${report.buyCandidateCount} 个可操作候选` : "暂无立即出手机会"}</Badge>
                <Badge variant="outline">采集器 {report.collectorStatus}</Badge>
                <Badge variant="outline">24h有效帖子 {report.parsedPosts24h}</Badge>
              </div>
              <Text variant="caption" color="tertiary" className="mt-3 block">生成：{formatDateTimeChina(report.generatedAt)} · {report.collectorMessage}</Text>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">{report.assets.map((item) => <AssetCard key={`${item.symbol}-${item.baseCoin}`} item={item} />)}</div>

            <Card padding="md" className="border border-amber-300/15 bg-amber-300/[0.035]"><Text variant="body-sm" color="secondary" className="leading-relaxed">{report.noteZh}</Text></Card>
          </>
        )}
      </Section>
    </main>
  );
}
