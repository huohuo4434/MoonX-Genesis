// MOOX_V7206_ALTCOIN_RADAR_UI
import type { Metadata } from "next";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { getOrRefreshEarlyAltcoinRadar, type EarlyAltcoinCandidate, type EarlyAltcoinVerdict } from "@/lib/trading-signals/early-altcoin-radar";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { PUBLIC_ATTRIBUTION_DISCLOSURE_EN, PUBLIC_ATTRIBUTION_DISCLOSURE_ZH, projectPublicAttribution, type PublicProjection } from "@/lib/presentation/public-attribution";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/early-altcoin-radar";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({ locale, basePath: path, titleZh: "早期山寨币雷达", titleEn: "Early Altcoin Radar", descriptionZh: "早期山寨币扫描、价格跟踪、X热度与实验奇门筛选。", descriptionEn: "Early-token scans with price tracking, X heat and experimental Qimen screening." });
}

function variant(verdict: EarlyAltcoinVerdict): "success" | "warning" | "danger" | "outline" {
  if (verdict === "EARLY_CANDIDATE") return "success";
  if (verdict === "WAIT_PULLBACK" || verdict === "TOO_HOT") return "warning";
  if (verdict === "AVOID") return "danger";
  return "outline";
}
function price(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 10 })}`;
}
function money(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
function pct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
function contract(value: string | null): string {
  if (!value) return "—";
  return value.length <= 16 ? value : `${value.slice(0, 7)}…${value.slice(-6)}`;
}
function heatClass(value: string): string {
  if (value === "过热") return "text-rose-200";
  if (value === "热门") return "text-amber-200";
  if (value === "少量提及") return "text-emerald-200";
  return "text-white/65";
}

function Detail({ item }: { item: PublicProjection<EarlyAltcoinCandidate> }) {
  return <details className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
    <summary className="cursor-pointer text-sm font-medium text-white/75">查看 {item.symbol} 详细核验</summary>
    <div className="mt-4 grid gap-4 text-sm text-white/60 md:grid-cols-3">
      <div><p className="text-xs text-white/35">市场</p><p className="mt-1">{item.marketStageZh}</p><p className="mt-1">DEX：{item.dexName ?? "—"}</p><p className="mt-1">流动性：{money(item.liquidityUsd)} · 24h成交：{money(item.volume24hUsd)}</p></div>
      <div><p className="text-xs text-white/35">X热度</p><p className={`mt-1 font-semibold ${heatClass(item.xHeatZh)}`}>{item.xHeatZh}</p><p className="mt-1">24h {item.xMentions24h ?? "—"} 条 · 7天 {item.xMentions7d ?? "—"} 条</p><p className="mt-1">来源：{item.sourceHandle} · {formatDateTimeChina(item.postedAt)}</p></div>
      <div><p className="text-xs text-white/35">实验奇门</p><p className="mt-1 font-semibold text-violet-100">{item.qimenRelationZh}</p><p className="mt-1">先天锚点：{item.qimenAnchorZh}</p><p className="mt-1">先天 {item.qimenGenesis?.direction ?? "—"} · 当前 {item.qimenCurrent?.direction ?? "—"}</p></div>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-white/[0.06] p-3 text-sm text-white/55"><p className="font-medium text-white/75">判断依据</p>{item.reasonsZh.slice(0, 6).map((reason) => <p key={reason} className="mt-1">• {reason}</p>)}</div>
      <div className="rounded-lg border border-rose-300/10 p-3 text-sm text-white/55"><p className="font-medium text-rose-100">风险</p>{item.riskFlagsZh.length ? item.riskFlagsZh.map((flag) => <p key={flag} className="mt-1">• {flag}</p>) : <p className="mt-1">• 暂无新增风险标记</p>}</div>
    </div>
    <p className="mt-4 break-all text-xs text-white/35">合约：{item.contractAddress ?? "未识别"} · 链：{item.chainId ?? "—"} · 首池：{item.pairCreatedAt ? formatDateTimeChina(item.pairCreatedAt) : "—"}</p>
  </details>;
}

export default async function EarlyAltcoinRadarPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") return <main><Section spacing="lg"><PublicFeaturePreview eyebrow={en ? "Member early-token intelligence" : "会员早期山寨币雷达 · 公开预览"} title={en ? "Find early tokens before consensus" : "先找早期币，再看价格、热度与风险"} description={en ? PUBLIC_ATTRIBUTION_DISCLOSURE_EN : PUBLIC_ATTRIBUTION_DISCLOSURE_ZH} solves={en ? ["Track discovery time and price", "Measure X attention", "Reject overheated names"] : ["记录扫描时间与博主价格", "统计X热度", "过热币直接降级"]} memberBenefits={en ? ["Compact radar table", "On-chain market checks", "Experimental Qimen overlay"] : ["山寨币汇总表", "链上与交易市场核验", "实验奇门双盘"]} exampleTitle="ROBBIE" exampleLines={en ? ["Detected 08:05", "X heat: light", "Qimen: resonance"] : ["08:05扫描到", "X：少量提及", "奇门：先天/当前共振"]} nextPath={en ? `/en${path}` : path} /></Section></main>;
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  let report;
  try { report = projectPublicAttribution(await getOrRefreshEarlyAltcoinRadar(20), { locale: en ? "en" : "zh" }); } catch { report = null; }

  return <main className="min-h-screen bg-[#07080a] text-white"><Section spacing="lg"><MemberDeviceHeartbeat />
    <div className="flex flex-wrap items-center gap-2"><Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MOOX EARLY ALTCOIN RADAR · 15 MIN</Text><Badge variant="warning">实验性功能</Badge></div>
    <Heading as="h1" size="h2" className="mt-2">早期山寨币雷达</Heading>
    <Text variant="body" color="secondary" className="mt-3 max-w-4xl leading-relaxed">先看扫描时间、博主价与当前价，再看X热度和链上条件。少量提及且尚未大涨的候选优先研究；已经过热的不追。</Text>

    {!report ? <div className="mt-7 rounded-2xl border border-dashed border-white/10 p-6 text-white/55">等待下一轮15分钟扫描结果。</div> : <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"><div><p className="text-sm font-semibold">本轮：{report.earlyCandidateCount} 个早期候选 / {report.candidateCount} 个线索</p><p className="mt-1 text-xs text-white/40">生成 {formatDateTimeChina(report.generatedAt)}</p></div><p className="max-w-3xl text-sm text-white/65">{report.conclusionZh}</p></div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-2">
        <table className="min-w-[1320px] w-full text-left text-sm">
          <thead className="text-xs tracking-[0.1em] text-white/40"><tr><th className="px-3 py-3">扫描/提及</th><th className="px-3 py-3">币</th><th className="px-3 py-3">合约 / 链</th><th className="px-3 py-3">来源</th><th className="px-3 py-3">博主价</th><th className="px-3 py-3">当前价</th><th className="px-3 py-3">提及后</th><th className="px-3 py-3">X热度</th><th className="px-3 py-3">流动性</th><th className="px-3 py-3">实验奇门</th><th className="px-3 py-3">结论</th></tr></thead>
          <tbody>{report.candidates.map((item) => <tr key={item.id} className="border-t border-white/[0.07] align-top">
            <td className="px-3 py-4 text-xs text-white/55"><div>扫 {formatDateTimeChina(item.firstSeenAt)}</div><div className="mt-1 text-white/30">帖 {formatDateTimeChina(item.postedAt)}</div></td>
            <td className="px-3 py-4"><div className="font-semibold">{item.symbol}</div><div className="mt-1 text-xs text-white/35">{item.name ?? "—"}</div></td>
            <td className="px-3 py-4 font-mono text-xs text-white/55">{contract(item.contractAddress)}<div className="mt-1 font-sans">{item.chainId ?? "—"}</div></td>
            <td className="px-3 py-4 text-xs">{item.sourceHandle}</td>
            <td className="px-3 py-4">{price(item.sourceMentionPriceUsd)}</td>
            <td className="px-3 py-4">{price(item.currentPriceUsd)}</td>
            <td className={`px-3 py-4 font-semibold ${(item.returnSinceSourceMentionPct ?? 0) >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{pct(item.returnSinceSourceMentionPct)}</td>
            <td className={`px-3 py-4 ${heatClass(item.xHeatZh)}`}><div className="font-semibold">{item.xHeatZh}</div><div className="mt-1 text-xs text-white/35">24h {item.xMentions24h ?? "—"} / 7d {item.xMentions7d ?? "—"}</div></td>
            <td className="px-3 py-4">{money(item.liquidityUsd)}</td>
            <td className="px-3 py-4"><div className="max-w-[180px] font-medium text-violet-100">{item.qimenRelationZh}</div></td>
            <td className="px-3 py-4"><Badge variant={variant(item.verdict)}>{item.verdictZh}</Badge><div className="mt-2 max-w-[220px] text-xs leading-5 text-white/50">{item.actionZh}</div></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="mt-5 space-y-2">{report.candidates.slice(0, 12).map((item) => <Detail key={item.id} item={item} />)}</div>
      <p className="mt-4 text-xs leading-6 text-white/35">{report.noteZh}</p>
    </>}
  </Section></main>;
}
