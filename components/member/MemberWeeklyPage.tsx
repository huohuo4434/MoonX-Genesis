"use client";

import Link from "next/link";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
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

function updateTime(value: string, en: boolean): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(date);
}

function RevisionNotice({ a }: { a: WeeklyAnalysisMemberView }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const notice = a.memberRevisionNotice;
  if (!notice) return null;

  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-sm font-semibold text-amber-100">{en ? "Version change" : "版本变化"}</p>
        <span className="font-mono text-caption text-amber-100/65">
          {en ? `Current V${a.version}` : `当前 V${a.version}`} · {updateTime(notice.changedAt, en)}
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <div className="rounded-xl border border-border/40 bg-background/30 p-3">
          <p className="text-caption text-foreground-tertiary">{en ? notice.previousLabelEn : notice.previousLabelZh}</p>
          <p className="mt-1 text-body-sm text-foreground-secondary">{en ? notice.previousSummaryEn : notice.previousSummaryZh}</p>
        </div>
        <div className="hidden items-center text-xl text-amber-200/60 lg:flex">→</div>
        <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-3">
          <p className="text-caption font-semibold text-primary">{en ? "Current official view" : "当前正式版本"}</p>
          <p className="mt-1 text-body-sm text-foreground">{en ? notice.currentSummaryEn : notice.currentSummaryZh}</p>
        </div>
      </div>
      <p className="mt-3 text-caption leading-5 text-foreground-tertiary">
        <span className="font-semibold text-foreground-secondary">{en ? "Why it changed: " : "修订原因："}</span>
        {en ? notice.reasonEn : notice.reasonZh}
      </p>
    </div>
  );
}

function WeeklyAtAGlance({ rows }: { rows: WeeklyMarketSlot[] }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const published = rows.flatMap((slot) => slot.kind === "published" ? [slot.analysis] : []);
  const revisionRows = published.filter((row) => row.memberRevisionNotice);

  return (
    <section className="mb-8 space-y-4" aria-labelledby="weekly-at-a-glance">
      <div>
        <Heading as="h2" size="h3" id="weekly-at-a-glance">{en ? "This week at a glance" : "本周一眼看懂"}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-1 block">
          {en ? "Read the current version first. Material pre-window revisions are shown explicitly below." : "先认当前版本，再看关键节奏；目标窗口前发生的重要修订会明确列出，不让旧观点和新结论混在一起。"}
        </Text>
      </div>
      {revisionRows.map((row) => <RevisionNotice key={`${row.id}-revision`} a={row} />)}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {published.map((row) => (
          <article key={`${row.id}-glance`} className="rounded-xl border border-border/[0.09] bg-card/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{en ? assetNameEn(row.assetName) : row.assetName} <span className="font-mono text-caption font-normal text-foreground-tertiary">{row.displaySymbol ?? row.symbol}</span></p>
                <p className="mt-1 font-mono text-caption text-foreground-tertiary">V{row.version} · {updateTime(row.updatedAt, en)}</p>
              </div>
              <Badge variant="default">{mooxDirectionArrow(row.overallDirection)} {en ? mooxDirectionLabelEn(row.overallDirection) : mooxDirectionLabelZh(row.overallDirection)}</Badge>
            </div>
            <p className="mt-3 text-body-sm leading-6 text-foreground-secondary">{en ? safeEnglish(row.headline) : row.headline}</p>
          </article>
        ))}
      </div>
    </section>
  );
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
        <div className="min-w-0">
          <Text variant="body" weight="semibold" className="break-words">{en ? assetNameEn(a.assetName) : a.assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{code} · {assetVenue(code)}</span></Text>
          <p className="mt-1 font-mono text-caption text-foreground-tertiary">V{a.version} · {updateTime(a.updatedAt, en)}</p>
        </div>
        <Badge variant="outline">{en ? "Current" : "当前版本"}</Badge>
      </div>
      <p className="text-body-sm font-medium leading-6 text-foreground">{en ? safeEnglish(a.headline) : a.headline}</p>
      <PlainLanguageSummary
        direction={a.overallDirection}
        path={en ? safeEnglish(a.weeklyPath) : a.weeklyPath}
        confirmation={en ? (a.confirmation ? safeEnglish(a.confirmation) : undefined) : a.confirmation}
        invalidation={en ? safeEnglish(a.invalidation) : a.invalidation}
        en={en}
      />
      {a.keyDates?.length ? <dl className="grid gap-2 text-body-sm"><div>
          <dt className="text-caption text-foreground-tertiary">{en ? "Key dates" : "本周关键日期"}</dt>
          <dd className="mt-2 grid gap-2 sm:grid-cols-2">{a.keyDates.map((item) => <div key={`${a.id}-${item.date}-${item.label}`} className="rounded-md border border-border/60 p-2">
            <div className="flex items-center justify-between gap-2"><span className="font-mono text-body-sm">{item.date}</span><Badge variant="default">{en ? directionEn(item.expectedEffect) : item.expectedEffect}</Badge></div>
            <div className="mt-1 text-foreground-secondary">{en ? safeEnglish(item.label) : item.label}</div>
            <div className="mt-1 text-caption text-foreground-tertiary">{en ? "Evidence" : "依据"}: {item.sources.map((source) => sourceLabel(source, en)).join(" + ")}{item.confidence ? ` · ${item.confidence}%` : ""}</div>
            {item.note ? <div className="mt-1 text-caption text-foreground-tertiary">{en ? safeEnglish(item.note) : item.note}</div> : null}
          </div>)}</dd>
        </div></dl> : null}
      <div className="rounded-lg border border-rose-300/15 bg-rose-300/[0.035] p-3">
        <p className="text-caption font-semibold text-rose-100/80">{en ? "Invalidation" : "失效条件"}</p>
        <p className="mt-1 text-body-sm leading-6 text-foreground-secondary">{en ? safeEnglish(a.invalidation) : a.invalidation}</p>
      </div>
      <details className="rounded-lg border border-border/[0.07] bg-muted/10 px-3 py-2">
        <summary className="min-h-8 cursor-pointer py-1 text-body-sm text-foreground-secondary">{en ? "Probabilities, levels and research detail" : "展开概率、支撑压力与研究细节"}</summary>
        <dl className="mt-3 grid gap-2 border-t border-border/[0.07] pt-3 text-body-sm sm:grid-cols-2">
          <div><dt className="text-caption text-foreground-tertiary">{en ? "Bullish scenario" : "上涨情景权重"}</dt><dd className="font-mono tabular-nums">{a.probabilities.up}%</dd></div>
          <div><dt className="text-caption text-foreground-tertiary">{en ? "Range scenario" : "震荡情景权重"}</dt><dd className="font-mono tabular-nums">{a.probabilities.flat}%</dd></div>
          <div><dt className="text-caption text-foreground-tertiary">{en ? "Bearish scenario" : "下跌情景权重"}</dt><dd className="font-mono tabular-nums">{a.probabilities.down}%</dd></div>
          <div><dt className="text-caption text-foreground-tertiary">{en ? "Confidence" : "当前信心"}</dt><dd className="font-mono tabular-nums">{a.confidence}%</dd></div>
          <div><dt className="text-caption text-foreground-tertiary">{en ? "Key support" : "关键支撑"}</dt><dd>{a.keySupport?.join(joiner) || "—"}</dd></div>
          <div><dt className="text-caption text-foreground-tertiary">{en ? "Key resistance" : "关键压力"}</dt><dd>{a.keyResistance?.join(joiner) || "—"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-caption text-foreground-tertiary">{en ? "Primary risks" : "主要风险"}</dt><dd>{a.risks?.length ? (en ? safeEnglish(a.risks.join(sentenceJoiner)) : a.risks.join(sentenceJoiner)) : (en ? "See technical risk-control levels below." : "以失效条件和下方技术风控为准。")}</dd></div>
          <div className="sm:col-span-2"><dt className="text-caption text-foreground-tertiary">{en ? "Catalysts / stronger window" : "主要催化"}</dt><dd>{en ? safeEnglish(a.catalysts?.join(sentenceJoiner) || a.strongWindow) : (a.catalysts?.length ? a.catalysts.join(joiner) : a.strongWindow || "—")}</dd></div>
        </dl>
        <div className="mt-3"><PriceLevelsBlock support={a.keySupport} resistance={a.keyResistance} invalidation={en ? safeEnglish(a.invalidation) : a.invalidation} confirmation={en ? safeEnglish(a.confirmation) : a.confirmation} /></div>
      </details>
      <Text variant="caption" color="tertiary">{en ? "Analysis window" : "分析周期"}: {weekLabel}</Text>
    </Card>
  );
}

export function MemberWeeklyLockedPage({ summary }: { summary: WeeklyAnalysisPublicSummary }) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  return <main><Section spacing="lg"><div className="mx-auto flex max-w-2xl flex-col gap-4 px-4">
    <div className="flex items-center gap-2"><LockIcon size={18} /><Badge variant="default">{en ? "Members" : "会员"}</Badge></div>
    <Heading as="h1" size="h2">{en ? "Weekly Outlook" : "会员周走势预测"}</Heading>
    <Text variant="body" color="secondary">{en ? "Review each core market’s weekly direction, path, key dates, price levels and invalidation." : "逐个查看核心市场本周方向、周内路径、关键日期、支撑压力与失效条件。"}</Text>
    <MetaHeader summary={summary} />
    <div className="grid gap-3">{summary.teasers.map((item) => <Card key={item.id} padding="md" className="space-y-2 overflow-hidden"><Text variant="body" weight="semibold">{en ? assetNameEn(item.assetName) : item.assetName} <span className="font-mono text-caption font-normal text-foreground-tertiary">{item.displaySymbol ?? item.symbol}</span></Text><Badge variant="outline">{item.isReady ? (en ? "Available to members" : "会员可查看") : (en ? "Research pending" : "资料待补充")}</Badge></Card>)}</div>
    <div className="flex flex-wrap gap-3 pt-2"><Button asChild variant="primary"><Link href={href("/pricing")}>{en ? "Compare access" : "会员解锁"}</Link></Button><Button asChild variant="outline"><Link href={href(`/login?next=${encodeURIComponent("/member/weekly")}`)}>{en ? "Sign in" : "登录"}</Link></Button></div>
  </div></Section></main>;
}

export function MemberWeeklyFullPage({ slots, summary }: { slots: WeeklyMarketSlot[]; summary: WeeklyAnalysisPublicSummary }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const rows = slots?.length > 0 ? slots : (summary.teasers.map((item) => item.isReady ? null : ({ kind: "unpublished" as const, assetId: item.assetId, assetName: item.assetName, symbol: item.symbol, displaySymbol: item.displaySymbol ?? item.symbol })).filter(Boolean) as WeeklyMarketSlot[]);
  return <main><Section spacing="lg"><div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
    <Badge variant="default" className="mb-3">{en ? "Members" : "会员"}</Badge>
    <Heading as="h1" size="h2" className="mb-2">{en ? "Weekly Outlook" : "会员周走势预测"}</Heading>
    <Text variant="body" color="secondary" className="mb-6 max-w-3xl">{en ? "Direction, weekly path, key dates, price levels and invalidation for every core market." : "逐个标的讲清本周方向、周内路径、关键日期、支撑压力与失效条件。"}</Text>
    <MetaHeader summary={summary} />
    <WeeklyAtAGlance rows={rows} />
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <Heading as="h2" size="h3">{en ? "Nine core markets" : "九大核心市场"}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-1 block">{en ? "Open any card for its weekly path and execution levels." : "先看方向，再看路径、关键日期和执行点位。"}</Text>
      </div>
      <Button asChild variant="outline" size="sm"><Link href={en ? "/en/member/weekly-report" : "/member/weekly-report"}>{en ? "Read Weekly Report" : "查看会员周报"}</Link></Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">{rows.map((slot) => slot.kind === "published" ? <PublishedCard key={slot.analysis.id} a={slot.analysis} weekLabel={dateRange(summary, en)} /> : <UnpublishedCard key={slot.assetId} assetName={slot.assetName} displaySymbol={slot.displaySymbol} nextWeek={summary.displayMode === "NEXT_WEEK"} />)}</div>
  </div></Section></main>;
}
