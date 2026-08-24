// MOOX_V720107_ASSET_FIRST_MULTI_VIEW: asset -> anonymous researcher -> 10-day dated opinion matrix.
import type { Metadata } from "next";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import {
  type MemberAssetOpinionDirection,
  type MemberAssetOpinionEntry,
  type MemberAssetOpinionGroup,
  type MemberAssetResearcherOpinion,
} from "@/lib/trading-signals/member-multi-view.server";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { projectPublicAttribution, PUBLIC_ATTRIBUTION_DISCLOSURE_EN, PUBLIC_ATTRIBUTION_DISCLOSURE_ZH } from "@/lib/presentation/public-attribution";
import { buildMultiViewResearcherAlias, summarizeMultiViewConsensus } from "@/lib/research/member-multi-view-core";
import { resolveMultiViewTargetDates } from "@/lib/research/member-multi-view-core";
import { DATED_EXTERNAL_INDICATORS_20260823 } from "@/lib/data/external-indicators-20260823";
import { getCachedMemberAlphaFeed } from "@/lib/trading-signals/member-alpha-feed-cache";
import { displayMarketCode, normalizeOfficialDirection, type OfficialDirection } from "@/lib/forecasts/formal-direction";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const path = "/member/alpha-feed";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "多方观点 · 近10天涨跌热力图",
    titleEn: "Multi-View · 10-Day Opinion Heatmap",
    descriptionZh: "会员专享：用资产×日期热力图聚合近10天匿名研究观点，一眼查看方向、多空票数以及与MOOX同向或相反。",
    descriptionEn: "Member-only 10-day opinion heatmap by asset and date, with direction, vote balance and MOOX alignment.",
  });
}

function directionLabel(value: MemberAssetOpinionDirection, en: boolean): string {
  if (en) return value === "BULLISH" ? "Bullish" : value === "BEARISH" ? "Bearish" : value === "MIXED" ? "Changed / Mixed" : "Neutral / Wait";
  return value === "BULLISH" ? "看多" : value === "BEARISH" ? "看跌" : value === "MIXED" ? "观点变化 / 混合" : "中性 / 等待";
}

function entryDirectionLabel(value: MemberAssetOpinionEntry["direction"], en: boolean): string {
  if (en) return value === "BULLISH" ? "Bullish" : value === "BEARISH" ? "Bearish" : "Neutral";
  return value === "BULLISH" ? "偏多" : value === "BEARISH" ? "偏空" : "中性";
}

function horizonLabel(value: MemberAssetOpinionEntry["horizon"], en: boolean): string {
  if (en) return value === "SHORT" ? "Short" : value === "MEDIUM" ? "Medium" : value === "LONG" ? "Long" : "Unspecified";
  return value === "SHORT" ? "短线" : value === "MEDIUM" ? "中线" : value === "LONG" ? "长线" : "未明确";
}

function directionVariant(value: MemberAssetOpinionDirection): "success" | "danger" | "warning" | "outline" {
  if (value === "BULLISH") return "success";
  if (value === "BEARISH") return "danger";
  if (value === "MIXED") return "warning";
  return "outline";
}

function researcherAlias(opinion: MemberAssetResearcherOpinion): string {
  return opinion.memberAlias ?? buildMultiViewResearcherAlias(opinion.researcherCode, opinion.theories);
}

function canonicalForecastSymbol(value: string): string {
  const normalized = displayMarketCode(value).toUpperCase();
  if (normalized === "000001.SS" || normalized === "SSEC" || normalized === "SSE") return "SHCOMP";
  return normalized;
}

function officialDirectionSide(value: OfficialDirection | null): MemberAssetOpinionEntry["direction"] {
  if (value === "上涨" || value === "震荡上涨") return "BULLISH";
  if (value === "下跌" || value === "震荡下跌") return "BEARISH";
  // 路径型方向必须结合当前所处阶段才能比较；缺少阶段证据时保持不可比。
  return "NEUTRAL";
}

function sourceLabel(value: string, en: boolean): string {
  if (en) {
    if (value === "SERVER_X_API") return "Server X API";
    if (value === "SERVER_JSON_FEED") return "Server JSON feed";
    if (value === "LOCAL_COLLECTOR") return "Local collector";
    return "No active collector";
  }
  if (value === "SERVER_X_API") return "服务器 X API";
  if (value === "SERVER_JSON_FEED") return "服务器 JSON Feed";
  if (value === "LOCAL_COLLECTOR") return "本地采集器";
  return "没有可用采集源";
}

function dateShort(value: string): string {
  const formatted = formatDateTimeChina(value);
  const match = formatted.match(/(\d{1,2})月(\d{1,2})日\s*(\d{1,2}:\d{2})?/);
  if (!match) return formatted;
  return `${String(match[1]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}${match[3] ? ` ${match[3]}` : ""}`;
}

function combinedLevels(entry: MemberAssetOpinionEntry): string {
  const rows: string[] = [];
  for (const level of entry.levels) rows.push(`${level.label} ${level.value}`);
  return [...new Set(rows)].slice(0, 8).join(" · ");
}

function distinctDates(opinion: MemberAssetResearcherOpinion): string[] {
  const rows = new Set<string>();
  for (const entry of opinion.entries) rows.add(dateShort(entry.postedAt).slice(0, 5));
  return [...rows].slice(0, 10);
}

function topMethods(group: MemberAssetOpinionGroup): string[] {
  const scores = new Map<string, number>();
  for (const opinion of group.opinions) {
    for (const item of opinion.theories) scores.set(item.theory, (scores.get(item.theory) ?? 0) + item.score);
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN")).slice(0, 3).map(([method]) => method);
}

function changedResearchers(group: MemberAssetOpinionGroup): number {
  return group.opinions.filter((opinion) => opinion.overallDirection === "MIXED").length;
}

function OpinionRows({ opinions, direction, en }: { opinions: MemberAssetResearcherOpinion[]; direction: MemberAssetOpinionDirection; en: boolean }) {
  const rows = opinions.filter((item) => item.overallDirection === direction);
  if (!rows.length) return null;
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant={directionVariant(direction)}>{directionLabel(direction, en)}</Badge>
        <Text variant="caption" color="tertiary">{en ? `${rows.length} researchers` : `${rows.length}位研究者`}</Text>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="min-w-[1180px] w-full border-collapse text-left">
          <thead className="bg-white/[0.045]">
            <tr className="text-xs text-white/55">
              <th className="w-[150px] px-4 py-3 font-medium">{en ? "Researcher" : "研究者"}</th>
              <th className="w-[160px] px-4 py-3 font-medium">{en ? "Post dates" : "发帖日期"}</th>
              <th className="w-[150px] px-4 py-3 font-medium">{en ? "Method" : "理论 / 方法"}</th>
              <th className="px-4 py-3 font-medium">{en ? "10-day view summary (newest first)" : "近10天观点归纳（新→旧）"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((opinion) => (
              <tr key={`${direction}:${opinion.researcherCode}`} className="border-t border-white/[0.07] align-top">
                <td className="px-4 py-4">
                  <Text variant="body-sm" weight="semibold" className="block">{researcherAlias(opinion)}</Text>
                  {opinion.priorityTier ? <Badge variant={opinion.priorityTier === 1 ? "success" : "outline"} className="mt-2">{en ? `Tier ${opinion.priorityTier}` : `第${opinion.priorityTier === 1 ? "一" : "二"}梯队`}</Badge> : null}
                  {opinion.specialty ? <Text variant="caption" color="secondary" className="mt-2 block leading-relaxed">{opinion.specialty}</Text> : null}
                  <Text variant="caption" color="tertiary" className="mt-1 block">{opinion.family}</Text>
                  <Badge variant={directionVariant(opinion.overallDirection)} className="mt-2">{directionLabel(opinion.overallDirection, en)}</Badge>
                  <Text variant="caption" color="tertiary" className="mt-2 block">{en ? `${opinion.postCount} posts` : `${opinion.postCount}帖`}</Text>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {distinctDates(opinion).map((date) => <Badge key={date} variant="outline">{date}</Badge>)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {opinion.theories.map((item) => <Badge key={item.theory} variant="outline">{item.theory}</Badge>)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-3">
                    {opinion.entries.map((entry, index) => {
                      const levels = combinedLevels(entry);
                      return (
                        <div key={`${entry.postedAt}:${index}`} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={entry.direction === "BULLISH" ? "success" : entry.direction === "BEARISH" ? "danger" : "outline"}>{entryDirectionLabel(entry.direction, en)}</Badge>
                            <Badge variant="outline">{horizonLabel(entry.horizon, en)}</Badge>
                            <Text variant="caption" color="tertiary">{dateShort(entry.postedAt)}</Text>
                          </div>
                          <Text variant="body-sm" className="mt-2 block leading-relaxed">{entry.summary}</Text>
                          {entry.timeWindows.length ? <Text variant="caption" className="mt-2 block text-cyan-200">{en ? "Window" : "时间窗口"}：{entry.timeWindows.join(" / ")}</Text> : null}
                          {entry.targets.length ? <Text variant="caption" className="mt-1 block text-emerald-200">{en ? "Explicit targets" : "明确目标"}：{entry.targets.join(" / ")}</Text> : null}
                          {levels ? <Text variant="caption" color="tertiary" className="mt-1 block">{en ? "Levels" : "关键点位"}：{levels}</Text> : null}
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DatedOpinion = {
  alias: string;
  direction: MemberAssetOpinionEntry["direction"];
  summary: string;
  method: string;
};

type DatedAssetRow = {
  asset: string;
  displayAsset: string;
  date: string;
  opinions: DatedOpinion[];
};

const ASSET_DISPLAY_NAMES: Record<string, string> = {
  BTC: "比特币",
  ETH: "以太坊",
  SPX: "标普500",
  NDX: "纳指100",
  GOLD: "黄金",
  SILVER: "白银",
  WTI: "原油",
  NVDA: "英伟达",
  MRVL: "Marvell",
  MU: "美光",
  TSLA: "特斯拉",
};

function datedAssetRows(groups: MemberAssetOpinionGroup[]): DatedAssetRow[] {
  const rows = new Map<string, DatedAssetRow>();
  const add = (asset: string, displayAsset: string, date: string, opinion: DatedOpinion) => {
    const key = `${asset}:${date}`;
    const row = rows.get(key) ?? { asset, displayAsset, date, opinions: [] };
    if (!row.opinions.some((item) => item.alias === opinion.alias && item.direction === opinion.direction && item.summary === opinion.summary)) row.opinions.push(opinion);
    rows.set(key, row);
  };
  for (const group of groups) {
    for (const opinion of group.opinions) {
      const alias = researcherAlias(opinion);
      const method = opinion.theories[0]?.theory ?? opinion.family;
      for (const entry of opinion.entries) {
        for (const date of resolveMultiViewTargetDates({ postedAt: entry.postedAt, horizon: entry.horizon, timeWindows: entry.timeWindows, summary: entry.summary })) {
          add(group.asset, group.displayAsset, date, { alias, direction: entry.direction, summary: entry.summary, method });
        }
      }
    }
  }
  for (const signal of DATED_EXTERNAL_INDICATORS_20260823) {
    add(signal.asset, ASSET_DISPLAY_NAMES[signal.asset] ?? signal.asset, signal.date, {
      alias: signal.analystAlias,
      direction: signal.direction,
      summary: signal.reason,
      method: signal.layer === "TECHNICAL" ? "技术面" : signal.layer === "NEWS" ? "新闻/事件" : "宏观面",
    });
  }
  const preferred = ["BTC", "ETH", "SPX", "NDX", "GOLD", "SILVER", "WTI", "NVDA", "MRVL", "MU", "TSLA"];
  const assetRank = (asset: string) => {
    const index = preferred.indexOf(asset);
    return index < 0 ? preferred.length : index;
  };
  return [...rows.values()].sort((a, b) => b.date.localeCompare(a.date) || assetRank(a.asset) - assetRank(b.asset) || a.asset.localeCompare(b.asset, "en-US")).slice(0, 80);
}

function opinionNames(opinions: DatedOpinion[], direction: DatedOpinion["direction"]): string {
  return [...new Set(opinions.filter((item) => item.direction === direction).map((item) => `${item.alias}（${item.method}）`))].slice(0, 5).join("、");
}

function heatDirection(opinions: DatedOpinion[]): MemberAssetOpinionDirection {
  const bullish = new Set(opinions.filter((item) => item.direction === "BULLISH").map((item) => item.alias)).size;
  const bearish = new Set(opinions.filter((item) => item.direction === "BEARISH").map((item) => item.alias)).size;
  if (bullish > bearish) return "BULLISH";
  if (bearish > bullish) return "BEARISH";
  if (bullish || bearish) return "MIXED";
  return "NEUTRAL";
}

function heatCellClass(direction: MemberAssetOpinionDirection): string {
  if (direction === "BULLISH") return "border-emerald-300/30 bg-emerald-400/[0.14] text-emerald-100";
  if (direction === "BEARISH") return "border-rose-300/30 bg-rose-400/[0.14] text-rose-100";
  if (direction === "MIXED") return "border-amber-300/30 bg-amber-300/[0.12] text-amber-100";
  return "border-white/[0.08] bg-white/[0.025] text-white/45";
}

function HeatSignal({ direction }: { direction: MemberAssetOpinionDirection }) {
  const arrow = direction === "BULLISH" ? "↑" : direction === "BEARISH" ? "↓" : direction === "MIXED" ? "↕" : "—";
  return (
    <span className="relative flex h-9 w-6 shrink-0 items-center justify-center" aria-hidden="true">
      {direction !== "NEUTRAL" ? <span className="absolute h-9 w-px bg-current opacity-45" /> : null}
      <span className={`relative z-10 flex h-6 w-5 items-center justify-center rounded-sm border border-current/50 text-sm font-black ${direction === "NEUTRAL" ? "bg-transparent" : "bg-current/15"}`}>{arrow}</span>
    </span>
  );
}

function AssetDateOpinionHeatmap({
  groups,
  officialByAsset,
  en,
}: {
  groups: MemberAssetOpinionGroup[];
  officialByAsset: Map<string, OfficialDirection>;
  en: boolean;
}) {
  const rows = datedAssetRows(groups);
  if (!rows.length) return null;
  const dates = [...new Set(rows.map((row) => row.date))].sort().slice(-10);
  const assetRows = new Map<string, { asset: string; displayAsset: string; cells: Map<string, DatedAssetRow> }>();
  for (const row of rows) {
    if (!dates.includes(row.date)) continue;
    const assetRow = assetRows.get(row.asset) ?? { asset: row.asset, displayAsset: row.displayAsset, cells: new Map<string, DatedAssetRow>() };
    assetRow.cells.set(row.date, row);
    assetRows.set(row.asset, assetRow);
  }
  return (
    <Card padding="none" className="overflow-hidden border border-cyan-300/20 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.08),transparent_34%),rgba(8,11,16,.96)]">
      <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text variant="caption" className="font-mono uppercase tracking-[0.16em] text-cyan-200/60">OPINION HEATMAP</Text>
            <Heading as="h2" size="h3" className="mt-1">{en ? "10-Day Opinion Heatmap" : "资产 × 日期｜观点涨跌热力图"}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 block">{en ? "Read it like a market board: direction first, people and reasons on demand. This is an opinion signal map, not a price candlestick chart." : "像看行情板一样先看颜色和箭头；研究者与理由放到下方按需展开。这是观点信号图，不是假装成真实价格K线。"}</Text>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-300/25 bg-emerald-400/[0.10] px-3 py-1.5 text-emerald-100">↑ {en ? "Bullish lead" : "看涨占优"}</span>
            <span className="rounded-full border border-rose-300/25 bg-rose-400/[0.10] px-3 py-1.5 text-rose-100">↓ {en ? "Bearish lead" : "看跌占优"}</span>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.09] px-3 py-1.5 text-amber-100">↕ {en ? "Split" : "多空打平"}</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-white/50">— {en ? "Wait" : "中性/无观点"}</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-left">
          <thead className="bg-black/20 text-xs text-white/50">
            <tr>
              <th className="sticky left-0 z-20 min-w-[132px] border-b border-r border-white/[0.08] bg-[#0b0e13] px-4 py-3 font-medium">{en ? "Asset" : "资产"}</th>
              {dates.map((date, index) => <th key={date} className="min-w-[86px] border-b border-white/[0.08] px-2 py-3 text-center font-mono font-medium"><span className="block">{date.slice(5)}</span>{index === dates.length - 1 ? <span className="mt-0.5 block text-[10px] text-cyan-200/60">{en ? "LATEST" : "最新"}</span> : null}</th>)}
              <th className="min-w-[128px] border-b border-l border-white/[0.08] px-3 py-3 text-center font-medium">{en ? "10-day balance" : "10日合计"}</th>
            </tr>
          </thead>
          <tbody>
            {[...assetRows.values()].map((assetRow) => {
              const allOpinions = [...assetRow.cells.values()].flatMap((row) => row.opinions);
              const totalBull = new Set(allOpinions.filter((item) => item.direction === "BULLISH").map((item) => item.alias)).size;
              const totalBear = new Set(allOpinions.filter((item) => item.direction === "BEARISH").map((item) => item.alias)).size;
              const overall = heatDirection(allOpinions);
              return (
                <tr key={`heat:${assetRow.asset}`} className="group/row">
                  <td className="sticky left-0 z-10 border-b border-r border-white/[0.07] bg-[#0b0e13] px-4 py-3"><a className="font-semibold text-cyan-100 hover:text-cyan-50" href={`#asset-${assetRow.asset.toLowerCase()}`}>{assetRow.displayAsset}</a><span className="mt-0.5 block font-mono text-[10px] text-white/35">{assetRow.asset}</span></td>
                  {dates.map((date) => {
                    const row = assetRow.cells.get(date);
                    if (!row) return <td key={date} className="border-b border-white/[0.06] p-1.5"><div className="flex h-[68px] items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.012] text-white/18">—</div></td>;
                    const direction = heatDirection(row.opinions);
                    const bullish = new Set(row.opinions.filter((item) => item.direction === "BULLISH").map((item) => item.alias));
                    const bearish = new Set(row.opinions.filter((item) => item.direction === "BEARISH").map((item) => item.alias));
                    const official = officialByAsset.get(`${row.asset}:${row.date}`) ?? null;
                    const mooxSide = officialDirectionSide(official);
                    const aligned = mooxSide === "NEUTRAL" ? [] : row.opinions.filter((item) => item.direction === mooxSide);
                    const opposite = mooxSide === "NEUTRAL" ? [] : row.opinions.filter((item) => item.direction !== "NEUTRAL" && item.direction !== mooxSide);
                    const alignedCount = new Set(aligned.map((item) => item.alias)).size;
                    const oppositeCount = new Set(opposite.map((item) => item.alias)).size;
                    const relation = !official ? (en ? "MOOX —" : "待MOOX") : mooxSide === "NEUTRAL" ? (en ? "PATH" : "路径") : `${en ? "A" : "同"}${alignedCount} ${en ? "O" : "反"}${oppositeCount}`;
                    const title = `${row.displayAsset} ${row.date}\n${en ? "Bullish" : "看涨"}：${opinionNames(row.opinions, "BULLISH") || "—"}\n${en ? "Bearish" : "看跌"}：${opinionNames(row.opinions, "BEARISH") || "—"}\n${en ? "Neutral" : "中性"}：${opinionNames(row.opinions, "NEUTRAL") || "—"}\nMOOX：${official ?? "—"}`;
                    return <td key={date} className="border-b border-white/[0.06] p-1.5"><a href={`#asset-${assetRow.asset.toLowerCase()}`} title={title} aria-label={`${row.displayAsset} ${row.date} ${directionLabel(direction, en)}`} className={`flex h-[68px] flex-col items-center justify-center rounded-lg border transition hover:-translate-y-0.5 hover:brightness-125 ${heatCellClass(direction)}`}><div className="flex items-center gap-1"><HeatSignal direction={direction} /><span className="text-[11px] font-semibold">{bullish.size}{en ? "B" : "多"}/{bearish.size}{en ? "S" : "空"}</span></div><span className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] ${oppositeCount ? "bg-rose-300/15 text-rose-100" : "bg-black/20 text-current opacity-75"}`}>{relation}</span></a></td>;
                  })}
                  <td className="border-b border-l border-white/[0.07] px-3 py-2 text-center"><Badge variant={directionVariant(overall)}>{directionLabel(overall, en)}</Badge><span className="mt-1 block text-[10px] text-white/40">{totalBull}{en ? " bull" : "多"} / {totalBear}{en ? " bear" : "空"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/[0.08] px-5 py-3 text-xs leading-5 text-white/45">{en ? "Cell format: bullish votes / bearish votes; A/O means aligned/opposite to MOOX. Hover or tap an asset to read the anonymous evidence. Only exact-date views enter the heatmap." : "格内数字=看多票数/看跌票数；“同/反”表示与MOOX正式方向的关系。悬停看名单，点击资产进入匿名观点详情。只有明确生效日期的观点进入热力图；少于10个有效验证样本仍为0%权重。"}</div>
    </Card>
  );
}

function ConsensusTable({ groups, en }: { groups: MemberAssetOpinionGroup[]; en: boolean }) {
  if (!groups.length) return null;
  return (
    <Card padding="none" className="overflow-hidden border border-white/[0.09]">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <Heading as="h2" size="h3">{en ? "Core Asset Consensus" : "核心资产共识总表"}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-1 block">{en ? "One row per asset: current balance, consensus, dominant methods and opinion changes." : "每个资产一行：当前多空分布、共识强度、主要方法和观点变化。"}</Text>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left">
          <thead className="bg-white/[0.04] text-xs text-white/55">
            <tr>
              <th className="px-4 py-3 font-medium">{en ? "Asset" : "资产"}</th>
              <th className="px-4 py-3 font-medium">{en ? "Leading view" : "当前占优"}</th>
              <th className="px-4 py-3 font-medium">{en ? "Consensus" : "共识强度"}</th>
              <th className="px-4 py-3 font-medium">{en ? "View distribution" : "观点分布"}</th>
              <th className="px-4 py-3 font-medium">{en ? "Main methods" : "主要方法"}</th>
              <th className="px-4 py-3 font-medium">{en ? "Changes" : "观点变化"}</th>
              <th className="px-4 py-3 font-medium">{en ? "Latest" : "最近更新"}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const consensus = summarizeMultiViewConsensus({ bullish: group.bullishResearchers, bearish: group.bearishResearchers, mixed: group.mixedResearchers, neutral: group.neutralResearchers });
              const methods = topMethods(group);
              const changed = changedResearchers(group);
              return (
                <tr key={`consensus:${group.asset}`} className="border-t border-white/[0.07] text-sm">
                  <td className="px-4 py-3"><a className="font-semibold text-cyan-100 hover:text-cyan-50" href={`#asset-${group.asset.toLowerCase()}`}>{group.displayAsset}</a><Text variant="caption" color="tertiary" className="mt-1 block">{group.totalResearchers}{en ? " analysts" : "位分析师"} · {group.totalPosts}{en ? " posts" : "帖"}</Text></td>
                  <td className="px-4 py-3"><Badge variant={directionVariant(consensus.direction)}>{directionLabel(consensus.direction, en)}</Badge></td>
                  <td className="px-4 py-3"><Text variant="body-sm" weight="semibold">{consensus.percent}%</Text><Text variant="caption" color="tertiary" className="ml-1">n={consensus.sampleSize}</Text></td>
                  <td className="px-4 py-3"><span className="text-emerald-200">{en ? "Bull" : "多"} {group.bullishResearchers}</span><span className="mx-2 text-white/30">/</span><span className="text-rose-200">{en ? "Bear" : "空"} {group.bearishResearchers}</span><span className="mx-2 text-white/30">/</span><span className="text-amber-100">{en ? "Mixed" : "变"} {group.mixedResearchers}</span><span className="mx-2 text-white/30">/</span><span className="text-white/55">{en ? "Wait" : "等"} {group.neutralResearchers}</span></td>
                  <td className="px-4 py-3">{methods.length ? methods.join(" · ") : (en ? "Unclassified" : "待归类")}</td>
                  <td className="px-4 py-3"><Badge variant={changed ? "warning" : "outline"}>{changed ? (en ? `${changed} changed` : `${changed}位变化`) : (en ? "Stable" : "暂无变化")}</Badge></td>
                  <td className="px-4 py-3 text-white/60">{dateShort(group.latestAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AssetSection({ group, en }: { group: MemberAssetOpinionGroup; en: boolean }) {
  const summary = en
    ? `${group.totalResearchers} researchers · ${group.totalPosts} posts · ${group.bullishResearchers} bullish · ${group.bearishResearchers} bearish`
    : `${group.totalResearchers}位研究者 · ${group.totalPosts}帖 · 看多${group.bullishResearchers} · 看跌${group.bearishResearchers} · 变化/混合${group.mixedResearchers}`;
  return (
    <details id={`asset-${group.asset.toLowerCase()}`} className="group rounded-2xl border border-white/[0.09] bg-white/[0.02] p-5">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Heading as="h2" size="h3">{group.displayAsset}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 block">{summary}</Text>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.bullishResearchers ? <Badge variant="success">{en ? `Bull ${group.bullishResearchers}` : `看多 ${group.bullishResearchers}`}</Badge> : null}
            {group.bearishResearchers ? <Badge variant="danger">{en ? `Bear ${group.bearishResearchers}` : `看跌 ${group.bearishResearchers}`}</Badge> : null}
            {group.mixedResearchers ? <Badge variant="warning">{en ? `Changed ${group.mixedResearchers}` : `变化 ${group.mixedResearchers}`}</Badge> : null}
            <Badge variant="outline">{en ? "Expand" : "展开详情"}</Badge>
          </div>
        </div>
      </summary>
      <OpinionRows opinions={group.opinions} direction="BULLISH" en={en} />
      <OpinionRows opinions={group.opinions} direction="BEARISH" en={en} />
      <OpinionRows opinions={group.opinions} direction="MIXED" en={en} />
      <OpinionRows opinions={group.opinions} direction="NEUTRAL" en={en} />
    </details>
  );
}

export default async function AlphaFeedPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return <main data-moox-alpha-feed-native="1"><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Member multi-view · Public preview" : "会员多方观点 · 公开预览"}
      title={en ? "Read ten days of opinions like a market heatmap" : "像看行情一样，一眼看懂十天多空"}
      description={en ? PUBLIC_ATTRIBUTION_DISCLOSURE_EN : PUBLIC_ATTRIBUTION_DISCLOSURE_ZH}
      solves={en ? ["Asset × date heatmap", "Anonymous researchers", "MOOX same/opposite alerts"] : ["资产×日期方向热力图", "研究者匿名", "自动标注与MOOX同向或相反"]}
      memberBenefits={en ? ["10-day signal history", "Bull/bear balance", "15-minute collector"] : ["滚动10天方向轨迹", "多空人数与分歧", "15分钟采集链"]}
      exampleTitle={en ? "Example" : "示例"}
      exampleLines={en ? ["One date · BTC · viewpoints classified", "MOOX aligned/opposite relationship stays member-only"] : ["某日 · BTC · 多空观点已归类", "与MOOX同向或相反的关系仅会员可见"]}
      nextPath={en ? `/en${path}` : path}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const { snapshot, todayForecasts } = await getCachedMemberAlphaFeed();
  const report = projectPublicAttribution(snapshot, { locale: en ? "en" : "zh" });
  const groups = report?.assets ?? [];
  const officialByAsset = new Map<string, OfficialDirection>();
  for (const forecast of todayForecasts) {
    officialByAsset.set(`${canonicalForecastSymbol(forecast.symbol)}:${forecast.forecastForDate}`, normalizeOfficialDirection(forecast.directionLabel ?? forecast.direction));
  }
  const health = report?.health;
  const bullishAssets = groups.filter((group) => group.bullishResearchers > group.bearishResearchers).map((group) => group.displayAsset);
  const bearishAssets = groups.filter((group) => group.bearishResearchers > group.bullishResearchers).map((group) => group.displayAsset);

  return (
    <main data-moox-alpha-feed-native="1" data-moox-server-multi-view="1" data-moox-asset-opinion-matrix="v720109">
      <Section spacing="lg">
        <MemberDeviceHeartbeat />
        <div className="max-w-6xl">
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MEMBER MULTI-VIEW · 10-DAY ASSET MATRIX</Text>
          <Heading as="h1" size="h2" className="mt-2">{en ? "Multi-View · 10-Day Opinion Heatmap" : "多方观点｜近10天涨跌热力图"}</Heading>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">{en
            ? "One asset per row and one date per column. Read direction, disagreement and MOOX alignment first; open the asset only when you need the underlying views."
            : "一行一个资产，一列一个日期。先看涨跌颜色、多空人数和与MOOX同反；需要理由时再展开资产详情。"}</Text>
          <Text variant="body-sm" color="tertiary" className="mt-2 block">{en
            ? "Names, usernames and source links never reach the member page. External views remain supplementary intelligence."
            : "博主名称、用户名和原帖链接继续全部隐藏。外部观点只做辅助情报，不覆盖MOOX正式方向，也不单独触发实盘。"}</Text>
        </div>

        <Card padding="md" className="border border-cyan-300/15 bg-cyan-300/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Text variant="caption" color="tertiary" className="block">{en ? "Data freshness" : "数据状态"}</Text>
              <Text variant="body" weight="semibold" className="mt-1 block">{sourceLabel(health?.effectiveSource ?? "NO_ACTIVE_SOURCE", en)}</Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{en ? `Watch ${health?.registryCount ?? 0}` : `观察账号 ${health?.registryCount ?? 0}`}</Badge>
              <Badge variant={(health?.activeResearchers10d ?? 0) > 0 ? "success" : "warning"}>{en ? `Active 10d ${health?.activeResearchers10d ?? 0}` : `10天活跃 ${health?.activeResearchers10d ?? 0}`}</Badge>
              <Badge variant="outline">{en ? `Posts 10d ${health?.posts10d ?? 0}` : `10天帖子 ${health?.posts10d ?? 0}`}</Badge>
              <Badge variant="outline">{en ? "Scan */15 min" : "扫描/汇总 每15分钟"}</Badge>
            </div>
          </div>
          <details className="mt-3 border-t border-white/[0.08] pt-3">
            <summary className="cursor-pointer text-xs text-white/45">{en ? "Collector details" : "查看采集明细"}</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4"><Text variant="body-sm" weight="semibold" className="block">{en ? "Server collector" : "服务器采集"}</Text><Text variant="body-sm" color="secondary" className="mt-2 block leading-relaxed">{health?.serverCollectorConfigured ? `${health.serverCollectorMode} · ${health.serverRefreshMessage ?? (en ? "configured" : "已配置")}` : (en ? "Server X API / JSON feed not configured." : "服务器未配置X API / JSON Feed；此时依赖本地采集器。")}</Text>{health?.serverRefreshAt ? <Text variant="caption" color="tertiary" className="mt-2 block">{en ? "Last refresh" : "最近刷新"}：{formatDateTimeChina(health.serverRefreshAt)}</Text> : null}</div>
              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4"><Text variant="body-sm" weight="semibold" className="block">{en ? "Local collector" : "本地采集器"}</Text><Text variant="body-sm" color="secondary" className="mt-2 block leading-relaxed">{health?.localCollectorMessage ?? (en ? "No collector heartbeat." : "暂无本地采集器心跳。")}</Text><Text variant="caption" color="tertiary" className="mt-2 block">{en ? "Accounts" : "账号成功"}：{health?.localCollectorAccountsSucceeded ?? 0}/{health?.localCollectorAccountsAttempted ?? 0}</Text></div>
            </div>
            {health?.lastPostAt ? <Text variant="caption" color="tertiary" className="mt-3 block">{en ? "Newest stored post" : "数据库最新帖子"}：{formatDateTimeChina(health.lastPostAt)}</Text> : null}
          </details>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <Card padding="md"><Text variant="caption" color="tertiary" className="block">{en ? "Bullish-leading assets" : "当前看多占优"}</Text><Text variant="body" weight="semibold" className="mt-2 block">{bullishAssets.length ? bullishAssets.slice(0, 12).join(" · ") : (en ? "None" : "暂无")}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary" className="block">{en ? "Bearish-leading assets" : "当前看跌占优"}</Text><Text variant="body" weight="semibold" className="mt-2 block">{bearishAssets.length ? bearishAssets.slice(0, 12).join(" · ") : (en ? "None" : "暂无")}</Text></Card>
        </div>

        <AssetDateOpinionHeatmap groups={groups} officialByAsset={officialByAsset} en={en} />

        {groups.length ? <details className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-4"><summary className="cursor-pointer text-sm font-medium text-white/65">{en ? "View overall consensus ranking" : "展开核心资产共识排行"}</summary><div className="mt-4"><ConsensusTable groups={groups} en={en} /></div></details> : null}

        {!groups.length ? (
          <Card padding="lg" className="border border-dashed border-white/15">
            <Heading as="h2" size="h3">{en ? "No asset opinions in the last 10 days" : "最近10天暂无可展示的资产观点"}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block leading-relaxed">{en
              ? "If the collector is healthy but this is empty, the 10-day history backfill has not completed yet."
              : "如果上面的采集状态正常但这里为空，说明10天历史回补尚未完成；升级后的采集器会继续补齐，而不是只等未来新帖。"}</Text>
          </Card>
        ) : (
          <div className="space-y-4">
            <div><Heading as="h2" size="h3">{en ? "Asset evidence" : "各资产观点详情"}</Heading><Text variant="body-sm" color="tertiary" className="mt-1 block">{en ? "Collapsed by default. Open only the asset you need." : "默认全部收起，只展开你要看的资产。"}</Text></div>
            {groups.map((group) => <AssetSection key={group.asset} group={group} en={en} />)}
          </div>
        )}
      </Section>
    </main>
  );
}
