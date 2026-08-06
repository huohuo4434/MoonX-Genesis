"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Heading, Text } from "@/components/ui";
import { formatMarketCapDisplay } from "@/lib/data/conviction/format-market-cap";
import { formatDateChina } from "@/lib/utils/datetime";
import { assetVenue } from "@/lib/presentation/asset-catalog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { safeEnglish } from "@/lib/i18n/english-content";
import type { ConvictionListPagePayload } from "@/lib/data/conviction/access";
import type { ConvictionPublicCard } from "@/types/conviction-asset";
import type { VibeEvidencePublicView } from "@/types/vibe-evidence";
import SpcxWatchlistFeature from "@/components/conviction/SpcxWatchlistFeature";

const RISK_EN: Record<string, string> = {
  低: "Low",
  中: "Medium",
  中高: "Medium-high",
  高: "High",
  极高: "Very high",
};

const TAG_EN: Record<string, string> = {
  国产替代: "Domestic substitution",
  科创板新股: "STAR Market listing",
  国产软件: "Domestic software",
  科创板: "STAR Market",
};

function formatDate(value: string, en: boolean): string {
  if (!en) return formatDateChina(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

function localizedVenue(symbol: string, en: boolean): string {
  const venue = assetVenue(symbol);
  return en ? safeEnglish(venue, venue.replace(/市场|交易所/g, "").trim() || "Global market") : venue;
}

function AssetTypeBadge({ type, en }: { type: ConvictionPublicCard["assetType"]; en: boolean }) {
  const zhLabel = type === "STOCK" ? "股票" : type === "CRYPTO" ? "加密资产" : type === "ETF" ? "ETF" : type === "INDEX" ? "指数" : "商品";
  const enLabel = type === "STOCK" ? "Stock" : type === "CRYPTO" ? "Crypto" : type === "ETF" ? "ETF" : type === "INDEX" ? "Index" : "Commodity";
  return (
    <Badge variant="outline" className="border-white/15 bg-white/[0.03] font-mono text-caption text-white/70">
      {en ? enLabel : zhLabel}
    </Badge>
  );
}

function PublicAssetCard({
  card,
  mode,
  evidence,
}: {
  card: ConvictionPublicCard;
  mode: ConvictionListPagePayload["mode"];
  evidence?: VibeEvidencePublicView;
}) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const grade = card.rating.includes("+") ? "A+" : card.rating.startsWith("A") ? "A" : "B";
  const mcap = formatMarketCapDisplay(card);
  const locked = mode === "publicOnly";
  const name = en ? card.nameEn || safeEnglish(card.nameZh) : card.slug === "asteroid" ? "太空狗" : card.nameZh;
  const summary = en ? safeEnglish(card.summaryEn) : card.summaryZh;
  const thesis = en ? card.thesisEn : card.thesisZh;
  const catalysts = en ? card.catalystsEn : card.catalystsZh;
  const risks = en ? card.risksEn : card.risksZh;
  const status = en ? safeEnglish(card.researchStatusEn) : card.researchStatusZh;
  const benefits = en
    ? ["Weekly analysis", "Monthly analysis", "Liu Yao basis", "Cross-method view when available", "Long-term research archive", "Public verification"]
    : ["本周分析", "月度分析", "六爻依据", "多方法观点（有来源时）", "总趋势资料库", "历史验证（新基准后）"];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e12]">
      {/* MOOX_SPCX_WATCHLIST_V1 */}
      <SpcxWatchlistFeature />
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <AssetTypeBadge type={card.assetType} en={en} />
              <Badge variant="outline" className="border-amber-500/30 text-amber-300/90">
                {en ? "MOOX rating" : "MOOX评级"} {grade}
              </Badge>
              <Badge variant="outline" className="border-red-500/25 text-red-300/80">
                {en ? "Risk" : "风险"} {en ? RISK_EN[card.riskLevel] || "High" : card.riskLevel}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-300/80">{status}</Badge>
            </div>
            <Heading as="h2" size="h3" className="text-white">
              {name}
              {!en && card.nameEn && card.nameEn !== card.nameZh ? (
                <span className="ml-2 text-body font-normal text-white/45">{card.nameEn}</span>
              ) : null}
            </Heading>
            <p className="font-mono text-body-sm text-white/50">
              {en ? "Symbol" : "代码"}: {card.symbol} · {localizedVenue(card.symbol, en)}
            </p>
            <div className="flex flex-wrap gap-3 text-caption text-white/40">
              <span>{en ? "Research updated" : "研究更新"}: {formatDate(card.researchUpdatedAt, en)}</span>
              <span>{locked ? (en ? "Full-cycle research for members" : "会员可查看完整周期研究") : (en ? "Full-cycle research unlocked" : "完整周期研究已开放")}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="border-white/15 bg-white/[0.03] font-mono text-caption text-white/70">
              {en ? TAG_EN[tag] || safeEnglish(tag, "Research theme") : tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 py-5 sm:px-6">
        <section>
          <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">{en ? "Fundamental overview" : "基本面简介"}</h3>
          <p className="mt-2 text-body-sm leading-relaxed text-white/75">{summary}</p>
        </section>

        {mcap ? (
          <section>
            <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">{en ? "Market capitalization" : "市值"}</h3>
            <p className="mt-2 text-body-sm text-white/75">{en ? mcap.labelEn : mcap.labelZh}</p>
            {mcap.updatedAt ? <p className="mt-1 text-caption text-white/40">{en ? "Updated" : "更新时间"}: {formatDate(mcap.updatedAt, en)}</p> : null}
          </section>
        ) : null}

        {card.contractAddress ? (
          <section>
            <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">{en ? "Contract address" : "合约地址"}</h3>
            <p className="mt-2 break-all font-mono text-caption text-white/70">{card.contractAddress}</p>
          </section>
        ) : null}

        <section>
          <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">{en ? "Research thesis" : "关注逻辑"}</h3>
          <ul className="mt-3 space-y-2">
            {thesis.slice(0, 2).map((line) => (
              <li key={line} className="flex gap-2 text-body-sm text-white/75">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/35" aria-hidden />
                <span>{en ? safeEnglish(line) : line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">{en ? "Catalysts" : "催化剂"}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {catalysts.slice(0, 4).map((item) => <Badge key={item} variant="outline" className="border-white/12 text-white/70">{en ? safeEnglish(item) : item}</Badge>)}
          </div>
        </section>

        <section>
          <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">{en ? "Risks" : "风险"}</h3>
          <ul className="mt-2 space-y-1.5">
            {risks.slice(0, 3).map((item) => <li key={item} className="text-body-sm text-white/65">· {en ? safeEnglish(item) : item}</li>)}
          </ul>
        </section>

        {mode === "fullAccess" && evidence ? (
          <section className="rounded-lg border border-cyan-400/12 bg-cyan-400/[0.025] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-body-sm font-medium text-white/85">{en ? "External data and fundamental evidence" : "外部数据与基本面证据"}</p>
                <p className="mt-1 text-caption text-white/45">{en ? "Data completeness" : "数据完整度"} {evidence.completeness}% · {en ? "Monthly weight" : "月度权重"} {evidence.monthlyWeight}%</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-lg font-semibold ${evidence.effectiveScore >= 18 ? "text-emerald-300" : evidence.effectiveScore <= -18 ? "text-red-300" : "text-amber-200"}`}>
                  {evidence.effectiveScore > 0 ? "+" : ""}{evidence.effectiveScore}
                </p>
                <p className="text-caption text-white/45">{en ? safeEnglish(evidence.stance, "Cross-method assessment") : evidence.stance}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-auto rounded-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm font-medium text-white/85">{en ? "MOOX member research" : "MOOX会员研究"}</p>
            <p className={locked ? "text-caption text-white/45" : "text-caption text-emerald-300/70"}>{locked ? (en ? "Members only" : "会员专享") : (en ? "Full research available" : "完整研究可见")}</p>
          </div>
          <ul className="mt-3 space-y-1.5 text-caption text-white/55">
            {benefits.map((label) => (
              <li key={label} className="flex items-center gap-2">
                <span aria-hidden className={locked ? "text-white/45" : "text-emerald-300/70"}>{locked ? "•" : "✓"}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm"><Link href={href(card.detailHref)}>{en ? "View research profile" : "查看研究档案"}</Link></Button>
            {locked ? <Button asChild size="sm" variant="outline"><Link href={href("/pricing")}>{en ? "Compare access" : "开通会员"}</Link></Button> : null}
          </div>
        </section>
      </div>
    </article>
  );
}

export function ConvictionListClient({ payload }: { payload: ConvictionListPagePayload }) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const [filter, setFilter] = useState<"ALL" | "STOCK" | "CRYPTO">("ALL");
  const visibleCards = useMemo(() => payload.cards.filter((card) => filter === "ALL" || card.assetType === filter), [filter, payload.cards]);
  const filters = en ? ([['ALL', 'All'], ['STOCK', 'Stocks'], ['CRYPTO', 'Crypto']] as const) : ([['ALL', '全部'], ['STOCK', '股票'], ['CRYPTO', '加密资产']] as const);

  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
        <header className="max-w-3xl border-b border-white/[0.08] pb-8">
          <p className="font-mono text-caption uppercase tracking-[0.22em] text-white/40">{en ? "MOOX RESEARCH" : "MOOX 重点关注"}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{en ? "Research Watchlist" : "MOOX重点关注资产"}</h1>
          <p className="mt-2 text-body text-white/55">{en ? "Long-term monitoring of fundamentals, market structure, catalysts and key risks." : "持续跟踪基本面、市场节奏与关键风险。"}</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-white/65">
            <p>{en ? "Assets tracked" : "当前跟踪"}: <span className="text-white">{payload.trackedCount}</span></p>
            {payload.latestResearchUpdatedAt ? <p>{en ? "Latest research update" : "最近研究更新"}: <span className="text-white">{formatDate(payload.latestResearchUpdatedAt, en)}</span></p> : null}
            <p>{en ? "Public fundamentals. Full forecasts for members." : "研究原则：公开基本面，会员查看完整预测。"}</p>
          </div>
        </header>

        {payload.deviceAccessRequired ? (
          <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] p-4 text-body-sm text-amber-100">
            {en ? "Confirm this device to display full paid research." : "当前付费账号需要确认本设备后才能显示完整研究。"}
            <Link className="ml-1 underline" href={href("/account#account-security")}>{en ? "Manage trusted devices" : "管理登录设备"}</Link>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2" aria-label={en ? "Research watchlist filters" : "重点资产筛选"}>
          {filters.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-11 rounded-md border px-4 text-body-sm transition-colors ${filter === value ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 text-white/60 hover:border-white/20 hover:text-white"}`}>{label}</button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {visibleCards.map((card) => <PublicAssetCard key={card.id} card={card} mode={payload.mode} evidence={payload.vibeEvidence[card.id]} />)}
        </div>

        {!visibleCards.length ? <Text variant="body-sm" className="mt-8 text-white/55">{en ? "No published research-watchlist assets yet." : "暂无已发布的重点关注资产。"}</Text> : null}

        <footer className="mt-12 border-t border-white/[0.08] pt-6">
          <p className="max-w-3xl text-caption leading-relaxed text-white/40">{en ? "MOOX provides market research, probability-based outlooks and long-term monitoring. Nothing on this page is investment advice." : "MOOX提供的是市场研究、概率预测和长期跟踪观点。所有内容仅供研究参考，不构成任何投资建议。"}</p>
        </footer>
      </div>
    </div>
  );
}
