"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import { SectionHeader } from "@/components/home/SectionHeader";
import { ShareButtons } from "@/components/social/ShareButtons";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatDateChina } from "@/lib/utils/datetime";
import type { DailyMarketForecastEditionPayload } from "@/types/daily-market-edition";

function accessCopy(mode: DailyMarketForecastEditionPayload["mode"]) {
  if (mode === "member_early" || mode === "admin") return "会员可查看完整内容";
  if (mode === "public_open") return "已公开";
  return "等待开放";
}

export function DailyMarketForecastEditionClient({
  payload,
  compact = false,
}: {
  payload: DailyMarketForecastEditionPayload;
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);
  const teaser = payload.teaser;
  const edition = payload.edition;

  return (
    <div className={compact ? "" : "min-h-screen bg-[#07080a] text-white"}>
      <div className={compact ? "" : "mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10"}>
        <SectionHeader
          eyebrow="每日行情"
          title="每日核心市场预测"
          subtitle="覆盖加密资产、美股、A股、港股、贵金属与原油；不同市场按各自下一交易时段展示。"
        />

        <ShareButtons
          className="mb-4"
          url="/forecasts/daily"
          forecastDate={teaser?.forecastDate}
          summary={edition ? pickLocalized(edition.overallSummary, locale) : "MOOX 每日核心市场预测"}
        />

        <div className="mb-4 grid gap-3 rounded-xl border border-border/[0.08] bg-card/70 p-4 sm:grid-cols-3">
          <div>
            <Text variant="caption" color="tertiary">预测日期</Text>
            <Text variant="body-sm">{teaser?.forecastDate ? formatDateChina(teaser.forecastDate) : "正在整理"}</Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">会员开放时间</Text>
            <Text variant="body-sm">{payload.nextMemberAvailabilityLabel}</Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">当前状态</Text>
            <Text variant="body-sm">{accessCopy(payload.mode)}</Text>
          </div>
        </div>

        {payload.state === "empty" ? (
          <Card padding="lg" className="border-border/[0.08] bg-card/70">
            <Text variant="body" weight="semibold">本期预测正在生成</Text>
            <Text variant="body-sm" color="secondary" className="mt-2">
              系统会优先使用当前有效的周度与月度研究生成正式观点；缺少可靠依据的市场不会编造方向。
            </Text>
          </Card>
        ) : null}

        {payload.state === "ready" && teaser ? (
          <Card padding="lg" className="border-border/[0.08] bg-card/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Text variant="body" weight="semibold">本期覆盖市场</Text>
                <Text variant="body-sm" color="secondary" className="mt-2">
                  各市场按实际交易日与交易时段分别生效。
                </Text>
              </div>
              <Badge variant="outline">{accessCopy(payload.mode)}</Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {teaser.assetNames.map((assetName, index) => (
                <Badge key={`${teaser.assetIds[index]}-${index}`} variant="outline" className="border-white/15 bg-white/[0.03] text-white/70">
                  {pickLocalized(assetName, locale)}
                </Badge>
              ))}
            </div>

            {!edition ? (
              <div className="mt-4 rounded-lg border border-border/[0.08] bg-muted/20 p-4">
                <Text variant="body-sm" color="secondary">
                  完整方向、日内路径、关键价位与失效条件仅按当前访问权限展示。
                </Text>
              </div>
            ) : null}

            {edition ? (
              <>
                <Text variant="body" weight="semibold" className="mt-5 block">
                  {pickLocalized(edition.overallSummary, locale)}
                </Text>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {edition.entries.map((entry) => {
                    const open = openId === entry.assetId;
                    return (
                      <article key={entry.assetId} className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-border/[0.08] bg-card/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <Text variant="body" weight="semibold">{pickLocalized(entry.assetName, locale)}</Text>
                            <Text variant="caption" color="tertiary">{entry.symbol} · {pickLocalized(entry.marketLabel, locale)}</Text>
                          </div>
                          <Badge variant="outline">{entry.mainDirection}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{entry.intradayPath}</Badge>
                          <Badge variant="outline">置信度 {entry.confidence}%</Badge>
                        </div>
                        <Text variant="body-sm" color="secondary">{pickLocalized(entry.summary, locale)}</Text>
                        <ShareButtons
                          url="/forecasts/daily"
                          forecastDate={edition.forecastDate}
                          assetName={pickLocalized(entry.assetName, locale)}
                          direction={entry.mainDirection}
                          summary={pickLocalized(entry.summary, locale)}
                        />
                        <button type="button" className="text-left text-caption text-primary underline-offset-2 hover:underline" onClick={() => setOpenId(open ? null : entry.assetId)}>
                          {open ? "收起详情" : "展开详情"}
                        </button>
                        {open ? (
                          <div className="space-y-2 border-t border-border/[0.06] pt-3">
                            <Text variant="body-sm" color="secondary">支撑：{entry.supportLevels.join("、") || "暂无明确价位"}</Text>
                            <Text variant="body-sm" color="secondary">压力：{entry.resistanceLevels.join("、") || "暂无明确价位"}</Text>
                            {entry.confirmation ? <Text variant="body-sm" color="secondary">确认条件：{pickLocalized(entry.confirmation, locale)}</Text> : null}
                            {entry.invalidation ? <Text variant="body-sm" color="secondary">失效条件：{pickLocalized(entry.invalidation, locale)}</Text> : null}
                            {entry.conditions?.length ? (
                              <div>
                                <Text variant="caption" color="tertiary">观察条件</Text>
                                <ul className="mt-1 space-y-1">
                                  {entry.conditions.map((condition, index) => (
                                    <li key={`${entry.assetId}-condition-${index}`} className="text-body-sm text-foreground-secondary">{pickLocalized(condition, locale)}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="sm"><Link href="/verification">查看历史验证</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/pricing">查看会员权益</Link></Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
