"use client";

import Link from "next/link";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { WeeklyAlphaFive } from "@/components/member/WeeklyAlphaFive";
import { MemberMarketBranchOutlookSection } from "@/components/member/MemberMarketBranchOutlook";
import { MemberQimenStoneRadar } from "@/components/member/MemberQimenStoneRadar";
import { PlainLanguageSummary } from "@/components/education/PlainLanguageSummary";
import { LockIcon } from "@/components/icons";
import { assetVenue } from "@/lib/presentation/asset-catalog";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { assetNameEn, directionEn, safeEnglish } from "@/lib/i18n/english-content";
import { mooxDirectionArrow, mooxDirectionLabelEn, mooxDirectionLabelZh } from "@/lib/forecasts/moox-direction-doctrine";
import type {
  WeeklyAnalysisMemberView,
  WeeklyAnalysisPublicSummary,
  WeeklyMarketSlot,
} from "@/types/weekly-analysis";
import type { WeeklyAlphaIssue } from "@/types/weekly-alpha";
import type { PublicProjection } from "@/lib/presentation/public-attribution";
import type { MemberMarketBranchOutlook } from "@/types/member-market-branch";
import type { MemberResearchRadarPack } from "@/types/member-research-radar";
type PublicResearchRadar=Omit<MemberResearchRadarPack,"stone">&{macroLiquidity:MemberResearchRadarPack["stone"]};

function sourceLabel(source: "LIUYAO" | "QIMEN" | "BAZI" | "TECHNICAL" | "MACRO", en: boolean): string {
  const zh = { LIUYAO: "六爻", QIMEN: "奇门", BAZI: "八字", TECHNICAL: "技术", MACRO: "宏观" } as const;
  const english = {
    LIUYAO: "Liu Yao",
    QIMEN: "Qimen Dunjia",
    BAZI: "BaZi",
    TECHNICAL: "Technical structure",
    MACRO: "Macro",
  } as const;
  return en ? english[source] : zh[source];
}


function dateRange(summary: WeeklyAnalysisPublicSummary, en: boolean): string {
  if (!en) return summary.weekLabel;
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Shanghai" });
  const start = new Date(`${summary.weekStart}T00:00:00+08:00`);
  const end = new Date(`${summary.weekEnd}T00:00:00+08:00`);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function MetaHeader({ summary }: { summary: WeeklyAnalysisPublicSummary }) {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <Card padding="md" className="mb-8 grid gap-2 overflow-hidden sm:grid-cols-3">
      <div><p className="text-caption text-foreground-tertiary">{en ? "Analysis window" : "分析周期"}</p><p className="text-body-sm font-medium">{dateRange(summary, en)}</p></div>
      <div><p className="text-caption text-foreground-tertiary">{en ? "Last updated" : "最近更新"}</p><p className="text-body-sm font-medium">{en ? safeEnglish(summary.lastUpdatedLabel) : summary.lastUpdatedLabel}</p></div>
      <div><p className="text-caption text-foreground-tertiary">{en ? "Published assets" : "已发布资产数量"}</p><p className="text-body-sm font-medium font-mono">{summary.publishedCount} / {summary.coverageCount}</p></div>
      <Text variant="caption" color="tertiary" className="sm:col-span-3">
        {en ? safeEnglish(summary.nextPublishHint, "The next weekly edition will appear after editorial review and publication.") : summary.nextPublishHint}
      </Text>
    </Card>
  );
}

function UnpublishedCard({ assetName, displaySymbol, nextWeek }: { assetName: string; displaySymbol: string; nextWeek?: boolean }) {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-3 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <Text variant="body" weight="semibold" className="min-w-0 break-words">{en ? assetNameEn(assetName) : assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{displaySymbol}</span></Text>
        <Badge variant="outline">{en ? "Research pending" : "资料待补充"}</Badge>
      </div>
      <Text variant="body-sm" color="secondary">
        {en
          ? `The ${nextWeek ? "next-week" : "current-week"} outlook is waiting for verifiable source research. Direction, probabilities and path will appear only after review.`
          : nextWeek
            ? "下周尚缺少可验证的原始研究依据；补充后会自动显示方向、概率与路径。"
            : "本周尚缺少可验证的原始研究依据；补充后会自动显示方向、概率与路径。"}
      </Text>
    </Card>
  );
}

function PublishedCard({ a, weekLabel }: { a: WeeklyAnalysisMemberView; weekLabel: string }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const code = a.displaySymbol ?? a.symbol;
  const joiner = en ? ", " : "、";
  const sentenceJoiner = en ? "; " : "；";
  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-3 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <Text variant="body" weight="semibold" className="min-w-0 break-words">{en ? assetNameEn(a.assetName) : a.assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{code} · {assetVenue(code)}</span></Text>
        <Badge variant="default">{mooxDirectionArrow(a.overallDirection)} {en ? mooxDirectionLabelEn(a.overallDirection) : mooxDirectionLabelZh(a.overallDirection)}</Badge>
      </div>
      <PlainLanguageSummary
        direction={a.overallDirection}
        path={en ? safeEnglish(a.weeklyPath) : a.weeklyPath}
        confirmation={en ? (a.confirmation ? safeEnglish(a.confirmation) : undefined) : a.confirmation}
        invalidation={en ? safeEnglish(a.invalidation) : a.invalidation}
        en={en}
      />
      {a.headline ? <details className="rounded-lg border border-border/[0.07] bg-muted/10 px-3 py-2">
        <summary className="cursor-pointer text-caption text-foreground-tertiary">{en ? "Archived edition note" : "原始版本研究说明（留档）"}</summary>
        <Text variant="caption" color="tertiary" className="mt-2 block break-words">{en ? safeEnglish(a.headline) : a.headline}</Text>
      </details> : null}
      <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Official call" : "MOOX唯一方向"}</dt><dd className="font-medium">{mooxDirectionArrow(a.overallDirection)} {en ? mooxDirectionLabelEn(a.overallDirection) : mooxDirectionLabelZh(a.overallDirection)}</dd></div>
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Bullish scenario" : "上涨情景权重"}</dt><dd className="font-mono tabular-nums">{a.probabilities.up}%</dd></div>
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Range scenario" : "震荡情景权重"}</dt><dd className="font-mono tabular-nums">{a.probabilities.flat}%</dd></div>
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Bearish scenario" : "下跌情景权重"}</dt><dd className="font-mono tabular-nums">{a.probabilities.down}%</dd></div>
        <div className="sm:col-span-2"><dt className="text-caption text-foreground-tertiary">{en ? "Expected weekly path" : "本周路径"}</dt><dd className="text-foreground-secondary">{en ? safeEnglish(a.weeklyPath) : a.weeklyPath}</dd></div>
        {a.basisWeights ? <div className="sm:col-span-2">
          <dt className="text-caption text-foreground-tertiary">{en ? "Research roles" : "研究分工"}</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            <Badge variant="default">{en ? "Liu Yao · direction" : "六爻 · 定方向"}</Badge>
            <Badge variant="outline">{en ? "Qimen · timing" : "奇门 · 择时"}</Badge>
            <Badge variant="outline">{en ? "Cycle / BaZi · background" : "周期 / 八字 · 大背景"}</Badge>
            <Badge variant="outline">{en ? "Technical · levels only" : "技术 · 只找点位"}</Badge>
            <Badge variant="outline">{en ? "Macro · context" : "宏观 · 背景校验"}</Badge>
          </dd>
          <div className="mt-2 text-caption text-primary">{en ? "The official bullish/bearish call comes from metaphysical evidence. Technical analysis has no vote on direction." : "看涨/看跌的正式方向由玄学证据决定；技术分析没有方向投票权。"}</div>
        </div> : null}
        {a.keyDates?.length ? <div className="sm:col-span-2">
          <dt className="text-caption text-foreground-tertiary">{en ? "Key dates" : "本周关键日期"}</dt>
          <dd className="mt-2 grid gap-2 sm:grid-cols-2">{a.keyDates.map((item) => <div key={`${a.id}-${item.date}-${item.label}`} className="rounded-md border border-border/60 p-2">
            <div className="flex items-center justify-between gap-2"><span className="font-mono text-body-sm">{item.date}</span><Badge variant="default">{en ? directionEn(item.expectedEffect) : item.expectedEffect}</Badge></div>
            <div className="mt-1 text-foreground-secondary">{en ? safeEnglish(item.label) : item.label}</div>
            <div className="mt-1 text-caption text-foreground-tertiary">{en ? "Evidence" : "依据"}: {item.sources.map((source) => sourceLabel(source, en)).join(" + ")}{item.confidence ? ` · ${item.confidence}%` : ""}</div>
            {item.note ? <div className="mt-1 text-caption text-foreground-tertiary">{en ? safeEnglish(item.note) : item.note}</div> : null}
          </div>)}</dd>
        </div> : null}
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Key support" : "关键支撑"}</dt><dd>{a.keySupport?.join(joiner) || "—"}</dd></div>
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Key resistance" : "关键压力"}</dt><dd>{a.keyResistance?.join(joiner) || "—"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-caption text-foreground-tertiary">{en ? "Primary risks" : "主要风险"}</dt><dd>{a.risks?.length ? (en ? safeEnglish(a.risks.join(sentenceJoiner)) : a.risks.join(sentenceJoiner)) : (en ? "See technical risk-control levels below. They do not reverse the official call." : "技术风控点位见下方；触发风控只处理仓位，不反向修改MOOX方向。")}</dd></div>
        <div className="sm:col-span-2"><dt className="text-caption text-foreground-tertiary">{en ? "Catalysts / stronger window" : "主要催化"}</dt><dd>{en ? safeEnglish(a.catalysts?.join(sentenceJoiner) || a.strongWindow) : (a.catalysts?.length ? a.catalysts.join(joiner) : a.strongWindow || "—")}</dd></div>
      </dl>
      <PriceLevelsBlock support={a.keySupport} resistance={a.keyResistance} invalidation={en ? safeEnglish(a.invalidation) : a.invalidation} confirmation={en ? safeEnglish(a.confirmation) : a.confirmation} />
      <Text variant="caption" color="tertiary">{en ? "Analysis window" : "分析周期"}: {weekLabel}</Text>
    </Card>
  );
}

export function MemberWeeklyLockedPage({ summary }: { summary: WeeklyAnalysisPublicSummary }) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  return <main><Section spacing="lg"><div className="mx-auto flex max-w-2xl flex-col gap-4 px-4">
    <div className="flex items-center gap-2"><LockIcon size={18} /><Badge variant="default">{en ? "Members" : "会员"}</Badge></div>
    <Heading as="h1" size="h2">{en ? "Weekly" : "本周 · 会员周报"}</Heading>
    <Text variant="body" color="secondary">{en ? "Active members receive Yi's integrated weekly interpretation with calendar checks, traditional methods, real-candle execution levels and core-market context." : "付费会员每周可查看易老师综合解读：传统术数、万年历硬校验、真实K线、支撑压力、周内路径与核心市场背景。AI仅辅助归并、冲突检查和情景推演。"}</Text>
    <MetaHeader summary={summary} />
    <div className="grid gap-3">{summary.teasers.map((item) => <Card key={item.id} padding="md" className="space-y-2 overflow-hidden"><Text variant="body" weight="semibold">{en ? assetNameEn(item.assetName) : item.assetName} <span className="font-mono text-caption font-normal text-foreground-tertiary">{item.displaySymbol ?? item.symbol}</span></Text><Badge variant="outline">{item.isReady ? (en ? "Available to members" : "会员可查看") : (en ? "Research pending" : "资料待补充")}</Badge></Card>)}</div>
    <div className="flex flex-wrap gap-3 pt-2"><Button asChild variant="primary"><Link href={href("/pricing")}>{en ? "Compare access" : "会员解锁"}</Link></Button><Button asChild variant="outline"><Link href={href(`/login?next=${encodeURIComponent("/member/weekly")}`)}>{en ? "Sign in" : "登录"}</Link></Button></div>
  </div></Section></main>;
}

export function MemberWeeklyFullPage({ slots, summary, alphaIssue, branchOutlook, researchRadar }: { slots: WeeklyMarketSlot[]; summary: WeeklyAnalysisPublicSummary; alphaIssue: PublicProjection<WeeklyAlphaIssue> | null; branchOutlook: MemberMarketBranchOutlook; researchRadar: PublicResearchRadar; analyses?: WeeklyAnalysisMemberView[] }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const rows = slots?.length > 0 ? slots : (summary.teasers.map((item) => item.isReady ? null : ({ kind: "unpublished" as const, assetId: item.assetId, assetName: item.assetName, symbol: item.symbol, displaySymbol: item.displaySymbol ?? item.symbol })).filter(Boolean) as WeeklyMarketSlot[]);
  return <main><Section spacing="lg"><div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
    <Badge variant="default" className="mb-3">{en ? "Members" : "会员"}</Badge>
    <Heading as="h1" size="h2" className="mb-2">{en ? "Weekly + Core Market Outlook" : "本周 · 会员周报"}</Heading>
    <Text variant="body" color="secondary" className="mb-6 max-w-3xl">{en ? "Start with the five highest-conviction weekly opportunities, then use the nine core markets as the broader context appendix." : "先看本周证据最干净、最值得盯的5个标的，再用九大核心市场作为大盘与跨市场背景附录。"}</Text>
    <MetaHeader summary={summary} />
    {alphaIssue ? <WeeklyAlphaFive issue={alphaIssue} /> : <Card padding="lg" className="mb-8 border-amber-400/20 bg-amber-400/[0.025]"><Text variant="body" weight="semibold">{en ? "Weekly is under editorial review" : "本周研究正在编辑审核"}</Text><Text variant="body-sm" color="secondary" className="mt-2 block">{en ? "MOOX does not auto-fill five names when calendar or Liu Yao evidence has not passed publication review." : "万年历或六爻证据未完成发布审核时，MOOX不会为了凑满5个自动塞入低质量标的。"}</Text></Card>}
    <MemberMarketBranchOutlookSection outlook={branchOutlook} />
    <MemberQimenStoneRadar radar={researchRadar} />
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <Heading as="h2" size="h3">{en ? "Nine core markets · context appendix" : "九大核心市场 · 背景附录"}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-1 block">{en ? "These markets remain the full weekly context. Alpha 5 above is the concentrated selection, not a replacement for the broader map." : "下面保留原九大核心市场周度地图；上面的Alpha 5是精选，不替代全市场背景。"}</Text>
      </div>
    </div>
    <Card padding="md" className="mb-4 border-cyan-400/20 bg-cyan-400/[0.035]">
      <Text variant="body-sm" weight="semibold">{en ? "MOOX direction doctrine" : "本期方向规则"}</Text>
      <Text variant="body-sm" color="secondary" className="mt-2 block">{en ? "The official bullish/bearish call is determined by Liu Yao and cross-horizon metaphysical resonance. Qimen is used for timing; technical analysis is used only for price levels and execution." : "正式看涨/看跌方向由六爻主判断与多周期玄学共振决定；奇门负责时间窗口；技术分析只负责支撑、压力、入场与风控点位，不参与方向判断。"}</Text>
      {(summary.researchBlendNoteZh || summary.researchBlendNoteEn) ? <details className="mt-2">
        <summary className="cursor-pointer text-caption text-foreground-tertiary">{en ? "Archived edition methodology note" : "原版本融合说明（仅留档）"}</summary>
        <Text variant="caption" color="tertiary" className="mt-2 block">{en ? summary.researchBlendNoteEn : summary.researchBlendNoteZh}</Text>
      </details> : null}
    </Card>
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">{rows.map((slot) => slot.kind === "published" ? <PublishedCard key={slot.analysis.id} a={slot.analysis} weekLabel={dateRange(summary, en)} /> : <UnpublishedCard key={slot.assetId} assetName={slot.assetName} displaySymbol={slot.displaySymbol} nextWeek={summary.displayMode === "NEXT_WEEK"} />)}</div>
  </div></Section></main>;
}
