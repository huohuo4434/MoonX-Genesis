import type { Metadata } from "next";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { getOrRefreshXScanReport, type XScanAssetReport, type XScanMatch, type XScanVerdict } from "@/lib/trading-signals/x-scan-report";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const path = "/member/alpha-feed";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "山寨币资金雷达 · 15分钟情报报告",
    titleEn: "Altcoin Radar · 15-Minute Intelligence Report",
    descriptionZh: "会员专享：15分钟X情报聚合、热点币种说明、Bitget可交易性、走势验证与MOOX综合结论。",
    descriptionEn: "Member-only 15-minute X intelligence, altcoin profiles, Bitget availability, signal tracking and MOOX assessment.",
  });
}

function verdictVariant(verdict: XScanVerdict): "success" | "warning" | "danger" | "outline" | "neutral" {
  if (verdict === "BUY_CANDIDATE") return "success";
  if (verdict === "DO_NOT_CHASE") return "warning";
  if (verdict === "AVOID" || verdict === "BEARISH_WATCH") return "danger";
  return "outline";
}

function matchLabel(value: XScanMatch): string {
  if (value === "MATCHING") return "走势符合预判";
  if (value === "DIVERGING") return "走势偏离预判";
  if (value === "NO_PRICE") return "暂无价格验证";
  return "等待验证";
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: digits });
  return value.toLocaleString("en-US", { maximumFractionDigits: Math.max(digits, value < 1 ? 6 : digits) });
}

function percent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function AssetCard({ item }: { item: XScanAssetReport }) {
  return (
    <Card padding="md" className={`h-full border ${item.verdict === "BUY_CANDIDATE" ? "border-emerald-400/30 bg-emerald-400/[0.045]" : "border-white/[0.08] bg-white/[0.025]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{item.baseCoin}</Badge>
        <Badge variant={verdictVariant(item.verdict)}>{item.verdictZh}</Badge>
        <Badge variant="outline">{item.direction === "LONG" ? "偏多" : item.direction === "SHORT" ? "偏空" : "中性"}</Badge>
        <Badge variant="outline">{matchLabel(item.forecastMatch)}</Badge>
      </div>

      <Heading as="h3" size="h3" className="mt-4">{item.symbol}</Heading>
      <Text variant="body-sm" color="secondary" className="mt-2 block leading-relaxed">{item.whatIsItZh}</Text>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2">
          <Text variant="caption" color="tertiary" className="block">当前价格</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{formatNumber(item.currentPrice)}</Text>
        </div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2">
          <Text variant="caption" color="tertiary" className="block">24小时</Text>
          <Text variant="body-sm" weight="semibold" className={`mt-1 block ${(item.change24hPct ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{percent(item.change24hPct)}</Text>
        </div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2">
          <Text variant="caption" color="tertiary" className="block">信号后表现</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{percent(item.returnSinceSignalPct)}</Text>
        </div>
        <div className="rounded-md border border-white/[0.07] bg-black/20 p-2">
          <Text variant="caption" color="tertiary" className="block">一致度 / 置信度</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{Math.round(item.agreementRatio24h * 100)}% / {item.averageConfidence}%</Text>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.035] p-3">
        <Text variant="caption" color="tertiary" className="block">在哪里能交易</Text>
        {item.whereToBuyZh.map((row) => <Text key={row} variant="body-sm" className="mt-1 block">• {row}</Text>)}
      </div>

      <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/20 p-3">
        <Text variant="caption" color="tertiary" className="block">为什么这样判断</Text>
        {item.reasonsZh.map((reason) => <Text key={reason} variant="body-sm" color="secondary" className="mt-1 block leading-relaxed">• {reason}</Text>)}
      </div>

      {(item.keyLevels.length > 0 || item.timeWindows.length > 0) ? (
        <div className="mt-3 text-caption leading-relaxed text-white/50">
          {item.keyLevels.length ? <p>原始线索关键位：{item.keyLevels.join(" / ")}</p> : null}
          {item.timeWindows.length ? <p className="mt-1">时间窗口：{item.timeWindows.join(" / ")}</p> : null}
        </div>
      ) : null}

      {item.firstSeenAt ? <Text variant="caption" className="mt-4 block text-white/35">本轮信号基线：{formatDateTimeChina(item.firstSeenAt)} · 基准价 {formatNumber(item.firstSeenPrice)}</Text> : null}
    </Card>
  );
}

export default async function AlphaFeedPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Member altcoin intelligence · Public preview" : "会员山寨币雷达 · 公开预览"}
      title={en ? "See what is hot, why it matters, and whether it is still tradable" : "不只告诉你“热”，还要告诉你是什么、去哪买、现在还能不能追"}
      description={en ? "Every report converts monitored X clues into an actionable research layer without revealing the monitored accounts." : "每15分钟扫描后的有效线索会整理成会员报告：热点币种、项目画像、Bitget可交易性、走势验证、风险与MOOX结论。"}
      solves={en ? ["Stop wasting scans with no output", "Separate early opportunities from overheated moves", "Track whether earlier radar calls worked"] : ["扫描有结果，不再只显示后台计数", "区分早期机会与已经过热的行情", "跟踪之前预判到底对没对"]}
      memberBenefits={en ? ["15-minute report", "Hot coin profile", "Where it trades", "Signal performance", "MOOX candidate alerts"] : ["15分钟扫描报告", "热点币种是什么", "Bitget哪里能买", "信号后真实走势", "MOOX买入候选预警"]}
      exampleTitle={en ? "Example" : "示例"}
      exampleLines={en ? ["HYPE · Buy candidate", "Bitget spot/futures", "Signal +4.2%", "Do not chase if overheated"] : ["HYPE · 买入候选", "Bitget现货/合约", "信号后 +4.2%", "过热则自动降为不追高"]}
      nextPath={en ? `/en${path}` : path}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }

  let report;
  try {
    report = await getOrRefreshXScanReport(20);
  } catch {
    report = null;
  }

  return (
    <main>
      <Section spacing="lg">
        <MemberDeviceHeartbeat />
        <div className="max-w-5xl">
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MOOX X INTELLIGENCE · 15 MIN RADAR</Text>
          <Heading as="h1" size="h2" className="mt-2">{en ? "Altcoin Rotation Radar" : "山寨币资金雷达 · 15分钟扫描报告"}</Heading>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">
            {en ? "The collector keeps scanning; MOOX turns that stream into a report. A hot coin must still pass price, liquidity, risk and multi-source checks." : "采集器负责持续扫描，MOOX负责把扫描结果变成能看的研究报告。热度不是买入理由；必须继续经过价格、流动性、风险和多来源一致性过滤。"}
          </Text>
        </div>

        {!report ? (
          <Card padding="lg" className="border border-dashed border-white/10">
            <Heading as="h2" size="h3">等待第一份15分钟报告</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block">采集数据尚未形成可展示报告。下一轮X采集或服务器15分钟报告任务完成后会自动出现。</Text>
          </Card>
        ) : (
          <>
            <Card padding="md" className="border border-cyan-300/15 bg-cyan-300/[0.035]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Text variant="caption" color="tertiary" className="block">最新扫描报告</Text>
                  <Heading as="h2" size="h3" className="mt-1">{report.hotspotSummaryZh}</Heading>
                </div>
                <Badge variant={report.buyCandidateCount > 0 ? "success" : "outline"}>{report.buyCandidateCount > 0 ? `🚨 ${report.buyCandidateCount} 个买入候选` : "暂无买入候选"}</Badge>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div><Text variant="caption" color="tertiary" className="block">24h有效帖子</Text><Text variant="body" weight="semibold">{report.parsedPosts24h}</Text></div>
                <div><Text variant="caption" color="tertiary" className="block">24h热点币种</Text><Text variant="body" weight="semibold">{report.symbols24h}</Text></div>
                <div><Text variant="caption" color="tertiary" className="block">有价值线索</Text><Text variant="body" weight="semibold">{report.highValueCount}</Text></div>
                <div><Text variant="caption" color="tertiary" className="block">采集器</Text><Text variant="body" weight="semibold">{report.collectorStatus}</Text></div>
              </div>
              <Text variant="caption" color="tertiary" className="mt-3 block">生成：{formatDateTimeChina(report.generatedAt)} · {report.collectorMessage}</Text>
            </Card>

            {report.assets.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {report.assets.map((item) => <AssetCard key={item.symbol} item={item} />)}
              </div>
            ) : (
              <Card padding="lg"><Heading as="h2" size="h3">本轮没有达到展示门槛的热点</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">这不是故障。没有可靠线索时宁可空着，也不为了页面热闹硬推币。</Text></Card>
            )}

            <Card padding="md" className="border border-amber-500/20 bg-amber-500/[0.05]">
              <Text variant="body-sm" weight="semibold">安全边界</Text>
              <Text variant="caption" color="tertiary" className="mt-1 block leading-relaxed">{report.noteZh}</Text>
            </Card>
          </>
        )}
      </Section>
    </main>
  );
}
