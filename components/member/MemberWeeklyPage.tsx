"use client";

import Link from "next/link";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { PlainLanguageSummary } from "@/components/education/PlainLanguageSummary";
import { LockIcon } from "@/components/icons";
import { assetVenue } from "@/lib/presentation/asset-catalog";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { assetNameEn, directionEn, safeEnglish } from "@/lib/i18n/english-content";
import type {
  WeeklyAnalysisMemberView,
  WeeklyAnalysisPublicSummary,
  WeeklyMarketSlot,
} from "@/types/weekly-analysis";

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
        <Badge variant="default">{en ? directionEn(a.overallDirection) : a.overallDirection}</Badge>
      </div>
      <Text variant="body-sm" color="secondary" className="break-words">{en ? safeEnglish(a.headline) : a.headline}</Text>
      <PlainLanguageSummary
        direction={en ? directionEn(a.overallDirection) : a.overallDirection}
        path={en ? safeEnglish(a.weeklyPath) : a.weeklyPath}
        confirmation={en ? (a.confirmation ? safeEnglish(a.confirmation) : undefined) : a.confirmation}
        invalidation={en ? safeEnglish(a.invalidation) : a.invalidation}
        en={en}
      />
      <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Direction" : "方向"}</dt><dd className="font-medium">{en ? directionEn(a.overallDirection) : a.overallDirection}</dd></div>
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Higher" : "上涨概率"}</dt><dd className="font-mono tabular-nums">{a.probabilities.up}%</dd></div>
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Range-bound" : "震荡概率"}</dt><dd className="font-mono tabular-nums">{a.probabilities.flat}%</dd></div>
        <div><dt className="text-caption text-foreground-tertiary">{en ? "Lower" : "下跌概率"}</dt><dd className="font-mono tabular-nums">{a.probabilities.down}%</dd></div>
        <div className="sm:col-span-2"><dt className="text-caption text-foreground-tertiary">{en ? "Expected weekly path" : "本周路径"}</dt><dd className="text-foreground-secondary">{en ? safeEnglish(a.weeklyPath) : a.weeklyPath}</dd></div>
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
        <div className="sm:col-span-2"><dt className="text-caption text-foreground-tertiary">{en ? "Primary risks" : "主要风险"}</dt><dd>{en ? safeEnglish(a.risks?.join(sentenceJoiner) || a.invalidation) : (a.risks?.length ? a.risks.join(sentenceJoiner) : a.invalidation || "—")}</dd></div>
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
    <Heading as="h1" size="h2">{en ? "Weekly Outlook" : summary.headingZh ?? "本周行情分析"}</Heading>
    <Text variant="body" color="secondary">{en ? "Coverage includes Bitcoin, Ether, the S&P 500, Nasdaq 100, Shanghai Composite, Hang Seng TECH, gold, silver and WTI. Active members can view direction, probabilities, expected paths and key risk windows." : summary.subtitleZh ?? "覆盖比特币、以太坊、标普500、纳斯达克100、上证、恒生科技、黄金、白银与WTI原油。登录有效会员后可查看完整方向、概率与路径。"}</Text>
    <MetaHeader summary={summary} />
    <div className="grid gap-3">{summary.teasers.map((item) => <Card key={item.id} padding="md" className="space-y-2 overflow-hidden"><Text variant="body" weight="semibold">{en ? assetNameEn(item.assetName) : item.assetName} <span className="font-mono text-caption font-normal text-foreground-tertiary">{item.displaySymbol ?? item.symbol}</span></Text><Badge variant="outline">{item.isReady ? (en ? "Available to members" : "会员可查看") : (en ? "Research pending" : "资料待补充")}</Badge></Card>)}</div>
    <div className="flex flex-wrap gap-3 pt-2"><Button asChild variant="primary"><Link href={href("/pricing")}>{en ? "Compare access" : "会员解锁"}</Link></Button><Button asChild variant="outline"><Link href={href(`/login?next=${encodeURIComponent("/member/weekly")}`)}>{en ? "Sign in" : "登录"}</Link></Button></div>
  </div></Section></main>;
}

export function MemberWeeklyFullPage({ slots, summary }: { slots: WeeklyMarketSlot[]; summary: WeeklyAnalysisPublicSummary; analyses?: WeeklyAnalysisMemberView[] }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const rows = slots?.length > 0 ? slots : (summary.teasers.map((item) => item.isReady ? null : ({ kind: "unpublished" as const, assetId: item.assetId, assetName: item.assetName, symbol: item.symbol, displaySymbol: item.displaySymbol ?? item.symbol })).filter(Boolean) as WeeklyMarketSlot[]);
  return <main><Section spacing="lg"><div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
    <Badge variant="default" className="mb-3">{en ? "Members" : "会员"}</Badge>
    <Heading as="h1" size="h2" className="mb-2">{en ? "Weekly Outlook" : summary.headingZh ?? "本周行情分析"}</Heading>
    <Text variant="body" color="secondary" className="mb-6 max-w-2xl">{en ? "A structured view of direction, weekly sequence, key dates and risk windows across nine core markets." : summary.subtitleZh ?? "提前了解九个核心市场的整体方向、周内运行顺序和关键风险窗口。"}</Text>
    <MetaHeader summary={summary} />
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">{rows.map((slot) => slot.kind === "published" ? <PublishedCard key={slot.analysis.id} a={slot.analysis} weekLabel={dateRange(summary, en)} /> : <UnpublishedCard key={slot.assetId} assetName={slot.assetName} displaySymbol={slot.displaySymbol} nextWeek={summary.displayMode === "NEXT_WEEK"} />)}</div>
  </div></Section></main>;
}
