"use client";

import Link from "next/link";
import { useState } from "react";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { ForecastEvidencePanel } from "@/components/forecasts/ForecastEvidencePanel";
import { LockIcon } from "@/components/icons";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { buildForecastModuleEvidence } from "@/lib/methodology/evidence";
import type {
  WeeklyAnalysisMemberView,
  WeeklyAnalysisPublicSummary,
} from "@/types/weekly-analysis";

function MetaHeader({ summary }: { summary: WeeklyAnalysisPublicSummary }) {
  return (
    <Card padding="md" className="mb-8 space-y-2 overflow-hidden">
      <Text variant="body-sm" className="block break-words">
        分析周期：<strong>{summary.weekLabel}</strong>
      </Text>
      <Text variant="body-sm" className="block break-words">
        发布时间：{summary.publishedAtLabel}
      </Text>
      <Text variant="body-sm" className="block break-words">
        最后更新时间：{summary.lastUpdatedLabel}
      </Text>
      <Text variant="body-sm" className="block break-words">
        已发布资产：{summary.publishedCount} 项
        {summary.assetNames.length ? `（${summary.assetNames.join("、")}）` : ""}
      </Text>
      <Text variant="caption" color="tertiary" className="block">
        {summary.nextPublishHint}
      </Text>
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
            本周行情分析已经发布。登录有效会员后可查看整体方向、周内运行顺序和风险窗口。
          </Text>
          <MetaHeader summary={summary} />
          <div className="grid gap-3">
            {summary.teasers.map((t) => (
              <Card key={t.id} padding="md" className="space-y-2 overflow-hidden">
                <Text variant="body" weight="semibold">
                  {t.assetName}
                </Text>
                <Text variant="caption" color="tertiary" className="block">
                  分析有效日期：{summary.weekLabel}
                </Text>
                <Text variant="caption" color="tertiary" className="block">
                  观点已生成
                </Text>
                <Badge variant="outline">会员锁定</Badge>
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
  analyses,
  summary,
}: {
  analyses: WeeklyAnalysisMemberView[];
  summary: WeeklyAnalysisPublicSummary;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

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
            提前了解本周整体方向、周内运行顺序和关键风险窗口。
          </Text>
          <MetaHeader summary={summary} />

          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {analyses.map((a) => {
              const open = openId === a.id;
              return (
                <Card key={a.id} padding="lg" className="flex min-w-0 flex-col gap-3 overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <Text variant="body" weight="semibold" className="min-w-0 break-words">
                      {a.assetName}
                    </Text>
                    <Badge variant="default">{a.overallDirection}</Badge>
                  </div>
                  <Text variant="body-sm" color="secondary" className="break-words">
                    {a.headline}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    风险等级：{a.riskLevel}
                  </Text>
                  <button
                    type="button"
                    className="text-left text-caption text-primary underline-offset-2 hover:underline"
                    onClick={() => setOpenId(open ? null : a.id)}
                  >
                    {open ? "收起详情" : "展开周内路径与价位"}
                  </button>
                  {open ? (
                    <div className="space-y-2 break-words border-t border-border/[0.06] pt-2 text-caption text-foreground-tertiary">
                      <p>分析周期：{summary.weekLabel}</p>
                      <p>周内运行顺序：{a.weeklyPath}</p>
                      <p>
                        上涨 {a.probabilities.up}% · 震荡 {a.probabilities.flat}% · 下跌{" "}
                        {a.probabilities.down}%
                      </p>
                      {a.strongWindow ? <p>较强窗口：{a.strongWindow}</p> : null}
                      {a.weakWindow ? <p>较弱窗口：{a.weakWindow}</p> : null}
                      <PriceLevelsBlock
                        support={a.keySupport}
                        resistance={a.keyResistance}
                        invalidation={a.invalidation}
                        confirmation={a.confirmation}
                        priceSource={a.priceDataSourceLabel}
                        snapshotAt={
                          a.priceSnapshotAtLabel
                            ? formatDateTimeChina(a.priceSnapshotAtLabel)
                            : undefined
                        }
                      />
                      <p>发布时间：{formatDateTimeChina(a.publishedAt)}</p>
                    </div>
                  ) : null}
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
                      catalysts: a.strongWindow ? [`较强窗口：${a.strongWindow}`] : undefined,
                      risks: a.weakWindow ? [`较弱窗口：${a.weakWindow}`] : undefined,
                    })}
                  />
                </Card>
              );
            })}
          </div>

          {analyses.length === 0 ? (
            <Text variant="body" color="secondary" className="mt-8">
              本周暂无已发布的行情分析。
            </Text>
          ) : null}
        </div>
      </Section>
    </main>
  );
}
