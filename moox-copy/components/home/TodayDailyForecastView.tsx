"use client";

import { useState } from "react";
import Link from "next/link";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Button, Text } from "@/components/ui";
import { dailyAssetOrderIndex } from "@/lib/data/daily-asset-order";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import { displayDirection, isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import type { DailyForecast } from "@/types/daily-forecast";

function isDraft(f: DailyForecast) {
  return f.status === "draft" || f.confidence <= 0 || f.summary === "研究尚未完成";
}

function ProbabilityBars({ up, flat, down }: { up: number; flat: number; down: number }) {
  return (
    <div className="space-y-1.5">
      {(
        [
          ["上涨", up, "bg-emerald-600/80"],
          ["震荡", flat, "bg-slate-500/70"],
          ["下跌", down, "bg-rose-600/75"],
        ] as const
      ).map(([label, value, color]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-caption text-foreground-tertiary">{label}</span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-caption tabular-nums text-foreground-secondary">
            {value}%
          </span>
        </div>
      ))}
    </div>
  );
}

function MetaRow({
  forecastDate,
  publishedAt,
  version,
  lockStatus,
}: {
  forecastDate?: string;
  publishedAt?: string;
  version?: string;
  lockStatus: string;
}) {
  return (
    <div className="mb-4 grid gap-2 rounded-xl border border-border/[0.08] bg-card/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-caption text-foreground-tertiary">预测日期</p>
        <p className="text-body-sm text-foreground">
          {forecastDate ? formatDateChina(forecastDate) : "—"}
        </p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">发布时间</p>
        <p className="text-body-sm text-foreground">
          {publishedAt ? formatDateTimeChina(publishedAt) : "—"}
        </p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">版本</p>
        <p className="text-body-sm text-foreground">{version ?? "—"}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">锁定状态</p>
        <p className="text-body-sm text-foreground">{lockStatus}</p>
      </div>
    </div>
  );
}

export function TodayDailyForecastView({
  forecasts,
  compositeSummary,
  publishHint,
  forecastDate,
  accessDenied,
  accessReason,
  teaser,
  detailLevel = "full",
}: {
  forecasts: DailyForecast[];
  compositeSummary?: string;
  publishHint?: string;
  forecastDate?: string;
  accessDenied?: "LOGIN_REQUIRED" | "WAIT_UNTIL_08";
  denyMessage?: string;
  accessReason?: "ADMIN" | "ACTIVE_MEMBER" | "REGISTERED_AFTER_RELEASE";
  teaser?: {
    published: boolean;
    marketCount: number;
    forecastDate: string | null;
    publishedAt: string | null;
    locked: true;
  } | null;
  /** Registered users after 08:00 see summary; members/admin see full. */
  detailLevel?: "summary" | "full";
}) {
  const readyForecasts = forecasts
    .filter((f) => isHumanPublishedForecast(f) && !isDraft(f))
    .sort((a, b) => dailyAssetOrderIndex(a.assetId) - dailyAssetOrderIndex(b.assetId));
  const [openId, setOpenId] = useState<string | null>(null);

  const sectionDate =
    teaser?.forecastDate || forecastDate || readyForecasts[0]?.forecastForDate || undefined;
  const earliestPublish = accessDenied
    ? teaser?.publishedAt ?? undefined
    : readyForecasts
        .map((f) => f.publishedAt)
        .filter(Boolean)
        .sort()[0];
  const sectionVersion =
    readyForecasts.length > 0
      ? `V${Math.max(...readyForecasts.map((f) => f.version || 1), 1)}`
      : "—";

  const lockStatus = accessDenied
    ? accessDenied === "LOGIN_REQUIRED"
      ? "需登录"
      : "08:00开放"
    : accessReason === "ADMIN"
      ? "管理员"
      : accessReason === "ACTIVE_MEMBER"
        ? "会员"
        : "已开放";

  const autoSummary =
    readyForecasts.length === 0
      ? ""
      : `今日综合判断：${readyForecasts
          .map((f) => `${f.assetName}${displayDirection(f)}`)
          .join("、")}。`;

  return (
    <section id="moonx-view" className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="今日观点" title="今日观点" subtitle="按账户权限开放 · 交易结束后公开验证" />

        <MetaRow
          forecastDate={sectionDate}
          publishedAt={earliestPublish}
          version={sectionVersion}
          lockStatus={lockStatus}
        />

        {accessDenied === "LOGIN_REQUIRED" ? (
          <div className="mt-2 max-w-xl space-y-3 rounded-xl border border-border/[0.1] bg-card p-5">
            <Text variant="body" weight="semibold">
              今日市场观点
            </Text>
            <Text variant="body-sm" color="secondary">
              注册用户可在北京时间08:00后查看今日观点；有效会员可全天提前查看完整预测。
            </Text>
            <Text variant="caption" color="tertiary">
              未登录不展示方向、概率与路径。
            </Text>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild variant="primary" size="sm">
                <Link href="/login?next=/#moonx-view">登录查看</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/pricing">会员方案</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {accessDenied === "WAIT_UNTIL_08" ? (
          <div className="mt-2 max-w-xl space-y-3 rounded-xl border border-border/[0.1] bg-card p-5">
            <Text variant="body" weight="semibold">
              今日观点将在北京时间08:00开放
            </Text>
            <Text variant="body-sm" color="secondary">
              开放前不会展示方向与概率。有效会员可全天提前查看。
            </Text>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild variant="primary" size="sm">
                <Link href="/pricing">升级会员</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {!accessDenied && publishHint ? (
          <p className="mb-3 text-caption text-foreground-tertiary">{publishHint}</p>
        ) : null}

        {!accessDenied && readyForecasts.length > 0 ? (
          <>
            <p className="mb-4 max-w-3xl text-body-sm text-foreground-secondary">
              {autoSummary || compositeSummary}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {readyForecasts.map((f) => {
                const open = openId === f.id;
                const p = f.probabilities ?? {
                  up: f.confidence,
                  flat: Math.max(0, 100 - f.confidence),
                  down: 0,
                };
                const showFull = detailLevel === "full";
                return (
                  <article
                    key={f.id}
                    className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-border/[0.1] bg-card p-4"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <Text variant="body" weight="semibold" className="min-w-0 break-words">
                        {f.assetName}
                      </Text>
                      <Badge variant="outline">{displayDirection(f)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-caption text-foreground-tertiary">
                      <p>预测日期：{formatDateChina(f.forecastForDate)}</p>
                      <p>发布时间：{formatDateTimeChina(f.publishedAt)}</p>
                      <p>版本号：V{f.version ?? 1}</p>
                      <p>锁定：已开放</p>
                    </div>
                    <ProbabilityBars up={p.up} flat={p.flat} down={p.down} />
                    <p className="break-words text-body-sm text-foreground-secondary">
                      {f.headline ?? f.summary}
                    </p>
                    {showFull ? (
                      <>
                        <button
                          type="button"
                          className="min-h-11 text-left text-caption text-primary underline-offset-2 hover:underline"
                          onClick={() => setOpenId(open ? null : f.id)}
                          aria-expanded={open}
                        >
                          {open ? "收起详情" : "展开详情"}
                        </button>
                        {open ? (
                          <div className="space-y-2 break-words border-t border-border/[0.06] pt-3 text-caption text-foreground-tertiary">
                            <p>目标时段：{f.tradingSessionLabel}</p>
                            <div className="rounded-md border border-border/[0.08] bg-muted/30 p-3">
                              <PriceLevelsBlock
                                support={f.supportLevels}
                                resistance={f.resistanceLevels}
                                invalidation={f.invalidation}
                                confirmation={f.confirmation}
                                priceSource={f.priceDataSourceLabel}
                                snapshotAt={
                                  f.priceSnapshotAtLabel
                                    ? formatDateTimeChina(f.priceSnapshotAtLabel)
                                    : undefined
                                }
                              />
                            </div>
                            {f.expectedPath?.length ? (
                              <p>盘中路径：{f.expectedPath.join(" → ")}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {!accessDenied && readyForecasts.length === 0 ? (
          <Text variant="body-sm" color="secondary" className="mt-2">
            今日观点尚未发布
          </Text>
        ) : null}
      </div>
    </section>
  );
}
