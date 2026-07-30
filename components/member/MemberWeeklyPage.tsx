"use client";

import Link from "next/link";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { ForecastEvidencePanel } from "@/components/forecasts/ForecastEvidencePanel";
import { LockIcon } from "@/components/icons";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { buildForecastModuleEvidence } from "@/lib/methodology/evidence";
import type {
  WeeklyAnalysisMemberView,
  WeeklyAnalysisPublicSummary,
  WeeklyMarketSlot,
} from "@/types/weekly-analysis";


function sourceLabel(source: "LIUYAO" | "QIMEN" | "BAZI" | "TECHNICAL" | "MACRO"): string {
  const labels = {
    LIUYAO: "六爻",
    QIMEN: "奇门",
    BAZI: "八字",
    TECHNICAL: "技术",
    MACRO: "宏观",
  } as const;
  return labels[source];
}

function MetaHeader({ summary }: { summary: WeeklyAnalysisPublicSummary }) {
  return (
    <Card padding="md" className="mb-8 grid gap-2 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-caption text-foreground-tertiary">分析周期</p>
        <p className="text-body-sm font-medium">{summary.weekLabel}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">发布时间</p>
        <p className="text-body-sm font-medium">{summary.publishedAtLabel}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">最后更新时间</p>
        <p className="text-body-sm font-medium">{summary.lastUpdatedLabel}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">已发布资产数量</p>
        <p className="text-body-sm font-medium font-mono">
          {summary.publishedCount} / {summary.coverageCount}
        </p>
      </div>
      <Text variant="caption" color="tertiary" className="sm:col-span-2 lg:col-span-4">
        {summary.nextPublishHint}
      </Text>
    </Card>
  );
}

function UnpublishedCard({
  assetName,
  displaySymbol,
}: {
  assetName: string;
  displaySymbol: string;
}) {
  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-3 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <Text variant="body" weight="semibold" className="min-w-0 break-words">
          {assetName}{" "}
          <span className="font-mono text-body-sm font-normal text-foreground-tertiary">
            {displaySymbol}
          </span>
        </Text>
        <Badge variant="outline">尚未发布</Badge>
      </div>
      <Text variant="body-sm" color="secondary">
        本周该市场分析尚未发布。发布后将在此处显示方向、概率与路径。
      </Text>
    </Card>
  );
}

function PublishedCard({
  a,
  weekLabel,
}: {
  a: WeeklyAnalysisMemberView;
  weekLabel: string;
}) {
  const code = a.displaySymbol ?? a.symbol;
  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-3 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <Text variant="body" weight="semibold" className="min-w-0 break-words">
          {a.assetName}{" "}
          <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{code}</span>
        </Text>
        <Badge variant="default">{a.overallDirection}</Badge>
      </div>
      <Text variant="body-sm" color="secondary" className="break-words">
        {a.headline}
      </Text>

      <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
        <div>
          <dt className="text-caption text-foreground-tertiary">方向</dt>
          <dd className="font-medium">{a.overallDirection}</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">上涨概率</dt>
          <dd className="font-mono tabular-nums">{a.probabilities.up}%</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">震荡概率</dt>
          <dd className="font-mono tabular-nums">{a.probabilities.flat}%</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">下跌概率</dt>
          <dd className="font-mono tabular-nums">{a.probabilities.down}%</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-foreground-tertiary">本周路径</dt>
          <dd className="text-foreground-secondary">{a.weeklyPath}</dd>
        </div>
        {a.keyDates?.length ? (
          <div className="sm:col-span-2">
            <dt className="text-caption text-foreground-tertiary">本周关键日期</dt>
            <dd className="mt-2 grid gap-2 sm:grid-cols-2">
              {a.keyDates.map((item) => (
                <div key={`${a.id}-${item.date}-${item.label}`} className="rounded-md border border-border/60 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-body-sm">{item.date}</span>
                    <Badge variant="default">{item.expectedEffect}</Badge>
                  </div>
                  <div className="mt-1 text-foreground-secondary">{item.label}</div>
                  <div className="mt-1 text-caption text-foreground-tertiary">
                    依据：{item.sources.map(sourceLabel).join(" + ")}{item.confidence ? ` · ${item.confidence}%` : ""}
                  </div>
                  {item.note ? <div className="mt-1 text-caption text-foreground-tertiary">{item.note}</div> : null}
                </div>
              ))}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-caption text-foreground-tertiary">关键支撑</dt>
          <dd>{a.keySupport?.join("、") || "—"}</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">关键压力</dt>
          <dd>{a.keyResistance?.join("、") || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-foreground-tertiary">主要风险</dt>
          <dd>{a.risks?.length ? a.risks.join("；") : a.invalidation || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-foreground-tertiary">主要催化</dt>
          <dd>{a.catalysts?.length ? a.catalysts.join("、") : a.strongWindow || "—"}</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">发布时间</dt>
          <dd>{formatDateTimeChina(a.publishedAt)}</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">版本号</dt>
          <dd className="font-mono">V{a.version || 1}</dd>
        </div>
      </dl>

      <PriceLevelsBlock
        support={a.keySupport}
        resistance={a.keyResistance}
        invalidation={a.invalidation}
        confirmation={a.confirmation}
        priceSource={a.priceDataSourceLabel}
        snapshotAt={
          a.priceSnapshotAtLabel ? formatDateTimeChina(a.priceSnapshotAtLabel) : undefined
        }
      />
      <Text variant="caption" color="tertiary">
        分析周期：{weekLabel}
      </Text>
      <ForecastEvidencePanel
        items={buildForecastModuleEvidence({
          id: a.id,
          symbol: a.symbol,
          directionLabel: a.overallDirection,
          summary: a.headline,
          expectedPath: a.weeklyPath ? [a.weeklyPath] : undefined,
          probabilities: a.probabilities,
          supportLevels: a.keySupport,
          resistanceLevels: a.keyResistance,
          invalidation: a.invalidation,
          confirmation: a.confirmation,
          confidence: a.confidence,
          catalysts: a.catalysts,
          risks: a.risks,
        })}
      />
    </Card>
  );
}

export function MemberWeeklyLockedPage({ summary }: { summary: WeeklyAnalysisPublicSummary }) {
  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4">
          <div className="flex items-center gap-2">
            <LockIcon size={18} />
            <Badge variant="default">会员</Badge>
          </div>
          <Heading as="h1" size="h2">
            本周行情分析
          </Heading>
          <Text variant="body" color="secondary">
            覆盖比特币、标普500、纳斯达克100、上证、恒生科技、黄金与WTI原油七个市场。登录有效会员后可查看完整方向、概率与路径。
          </Text>
          <MetaHeader summary={summary} />
          <div className="grid gap-3">
            {summary.teasers.map((t) => (
              <Card key={t.id} padding="md" className="space-y-2 overflow-hidden">
                <Text variant="body" weight="semibold">
                  {t.assetName}{" "}
                  <span className="font-mono text-caption font-normal text-foreground-tertiary">
                    {t.displaySymbol ?? t.symbol}
                  </span>
                </Text>
                <Badge variant="outline">{t.isReady ? "会员锁定" : "尚未发布"}</Badge>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="primary">
              <Link href="/pricing">会员解锁</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/login?next=${encodeURIComponent("/member/weekly")}`}>登录</Link>
            </Button>
          </div>
        </div>
      </Section>
    </main>
  );
}

export function MemberWeeklyFullPage({
  slots,
  summary,
}: {
  slots: WeeklyMarketSlot[];
  summary: WeeklyAnalysisPublicSummary;
  /** @deprecated kept for callers that still pass analyses */
  analyses?: WeeklyAnalysisMemberView[];
}) {
  const rows =
    slots?.length > 0
      ? slots
      : (summary.teasers.map((t) =>
          t.isReady
            ? null
            : {
                kind: "unpublished" as const,
                assetId: t.assetId,
                assetName: t.assetName,
                symbol: t.symbol,
                displaySymbol: t.displaySymbol ?? t.symbol,
              }
        ).filter(Boolean) as WeeklyMarketSlot[]);

  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
          <Badge variant="default" className="mb-3">
            会员
          </Badge>
          <Heading as="h1" size="h2" className="mb-2">
            本周行情分析
          </Heading>
          <Text variant="body" color="secondary" className="mb-6 max-w-2xl">
            提前了解本周七个核心市场的整体方向、周内运行顺序和关键风险窗口。
          </Text>
          <MetaHeader summary={summary} />

          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {rows.map((slot) =>
              slot.kind === "published" ? (
                <PublishedCard
                  key={slot.analysis.id}
                  a={slot.analysis}
                  weekLabel={summary.weekLabel}
                />
              ) : (
                <UnpublishedCard
                  key={slot.assetId}
                  assetName={slot.assetName}
                  displaySymbol={slot.displaySymbol}
                />
              )
            )}
          </div>
        </div>
      </Section>
    </main>
  );
}
