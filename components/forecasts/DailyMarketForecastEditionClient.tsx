"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import { SectionHeader } from "@/components/home/SectionHeader";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type { DailyMarketForecastEditionPayload } from "@/types/daily-market-edition";

function lockCopy(mode: DailyMarketForecastEditionPayload["mode"]) {
  if (mode === "member_early") return "会员预览已开放";
  if (mode === "admin") return "管理员全量可见";
  if (mode === "public_open") return "公开版已开放";
  return "公开内容锁定";
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
          eyebrow="Daily Forecasts"
          title="每日核心市场预测"
          subtitle="四大核心市场以人工审核版发布；会员可提前查看，公开版按上海时间中午开放。"
        />

        <div className="mb-4 grid gap-3 rounded-xl border border-border/[0.08] bg-card/70 p-4 md:grid-cols-4">
          <div>
            <Text variant="caption" color="tertiary">
              Forecast Date
            </Text>
            <Text variant="body-sm">{teaser?.forecastDate ? formatDateChina(teaser.forecastDate) : "正在整理"}</Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              Member Access
            </Text>
            <Text variant="body-sm">{payload.nextMemberAvailabilityLabel}</Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              Public Access
            </Text>
            <Text variant="body-sm">{payload.nextPublicAvailabilityLabel}</Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              Status
            </Text>
            <Text variant="body-sm">{lockCopy(payload.mode)}</Text>
          </div>
        </div>

        {payload.state === "empty" ? (
          <Card padding="lg" className="border-border/[0.08] bg-card/70">
            <Text variant="body" weight="semibold">
              正在整理
            </Text>
            <Text variant="body-sm" color="secondary" className="mt-2">
              当前四大核心市场预测尚未录入人工审核版。页面会在内容就绪后按上海时间自动开放。
            </Text>
            <Text variant="body-sm" color="secondary" className="mt-2">
              初始发布阶段将严格只覆盖：Bitcoin、S&P 500、Nasdaq 100、Gold。
            </Text>
          </Card>
        ) : null}

        {payload.state === "ready" && teaser ? (
          <Card padding="lg" className="border-border/[0.08] bg-card/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Text variant="body" weight="semibold">
                  当期 Daily Edition
                </Text>
                <Text variant="body-sm" color="secondary" className="mt-2">
                  版本 V{teaser.version}
                  {teaser.publishedAt ? ` · 发布时间 ${formatDateTimeChina(teaser.publishedAt)}` : ""}
                </Text>
              </div>
              <Badge variant="outline">{lockCopy(payload.mode)}</Badge>
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
                  当前只展示覆盖资产与开放时间。方向、节奏、价位、条件、技术链接和会员证据会在服务端授权后才进入客户端。
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
                      <article
                        key={entry.assetId}
                        className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-border/[0.08] bg-card/80 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <Text variant="body" weight="semibold">
                              {pickLocalized(entry.assetName, locale)}
                            </Text>
                            <Text variant="caption" color="tertiary">
                              {entry.symbol} · {pickLocalized(entry.marketLabel, locale)}
                            </Text>
                          </div>
                          <Badge variant="outline">{entry.mainDirection}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{entry.intradayPath}</Badge>
                          <Badge variant="outline">Confidence {entry.confidence}%</Badge>
                        </div>
                        <Text variant="body-sm" color="secondary">
                          {pickLocalized(entry.summary, locale)}
                        </Text>
                        <button
                          type="button"
                          className="text-left text-caption text-primary underline-offset-2 hover:underline"
                          onClick={() => setOpenId(open ? null : entry.assetId)}
                        >
                          {open ? "收起详情" : "展开详情"}
                        </button>
                        {open ? (
                          <div className="space-y-2 border-t border-border/[0.06] pt-3">
                            <Text variant="body-sm" color="secondary">
                              支撑：{entry.supportLevels.join("、") || "—"}
                            </Text>
                            <Text variant="body-sm" color="secondary">
                              压力：{entry.resistanceLevels.join("、") || "—"}
                            </Text>
                            {entry.confirmation ? (
                              <Text variant="body-sm" color="secondary">
                                Confirmation：{pickLocalized(entry.confirmation, locale)}
                              </Text>
                            ) : null}
                            {entry.invalidation ? (
                              <Text variant="body-sm" color="secondary">
                                Invalidation：{pickLocalized(entry.invalidation, locale)}
                              </Text>
                            ) : null}
                            {entry.conditions?.length ? (
                              <div>
                                <Text variant="caption" color="tertiary">
                                  Conditions
                                </Text>
                                <ul className="mt-1 space-y-1">
                                  {entry.conditions.map((condition, index) => (
                                    <li key={`${entry.assetId}-condition-${index}`} className="text-body-sm text-foreground-secondary">
                                      {pickLocalized(condition, locale)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {entry.frameworkContributions.length ? (
                              <div>
                                <Text variant="caption" color="tertiary">
                                  Framework Contribution
                                </Text>
                                <ul className="mt-1 space-y-1">
                                  {entry.frameworkContributions.map((factor) => (
                                    <li key={factor.id} className="text-body-sm text-foreground-secondary">
                                      {pickLocalized(factor.label, locale)} · {factor.weight}%
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            <Text variant="caption" color="tertiary">
                              {pickLocalized(entry.frameworkDisclaimer, locale)}
                            </Text>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href="/verification">查看验证</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/pricing">查看会员权益</Link>
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
