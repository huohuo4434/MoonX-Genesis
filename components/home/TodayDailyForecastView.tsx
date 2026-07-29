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

function verifyLabel(f: DailyForecast): string {
  if (f.status === "verified") return "已验证";
  if (f.status === "expired") return "已过期";
  return "待收盘验证";
}

function lockLabel(accessDenied?: "LOGIN_REQUIRED" | "WAIT_UNTIL_08"): string {
  if (accessDenied === "LOGIN_REQUIRED") return "锁定（需登录）";
  if (accessDenied === "WAIT_UNTIL_08") return "锁定（08:00开放）";
  return "已锁定";
}

function MetaRow({
  forecastDate,
  publishedAt,
  version,
  lockStatus,
  verifyStatus,
}: {
  forecastDate?: string;
  publishedAt?: string;
  version?: string;
  lockStatus: string;
  verifyStatus: string;
}) {
  return (
    <div className="mb-4 grid gap-2 rounded-xl border border-border/[0.08] bg-card/70 p-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <p className="text-body-sm text-foreground font-mono">{version ?? "V1"}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">状态</p>
        <p className="text-body-sm text-foreground">{lockStatus}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">验证状态</p>
        <p className="text-body-sm text-foreground">{verifyStatus}</p>
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
  denyMessage,
  teaser,
}: {
  forecasts: DailyForecast[];
  compositeSummary?: string;
  publishHint?: string;
  /** Beijing calendar forecast date for the section (auto-updates daily). */
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
  const sectionVerify =
    accessDenied
      ? "—"
      : readyForecasts.length === 0
        ? "—"
        : readyForecasts.every((f) => f.status === "verified")
          ? "已验证"
          : readyForecasts.some((f) => f.status === "expired")
            ? "部分已过期"
            : "待收盘验证";
  const sectionVersion =
    readyForecasts.length > 0
      ? `V${Math.max(...readyForecasts.map((f) => f.version || 1), 1)}`
      : "V1";

  const autoSummary =
    readyForecasts.length === 0
      ? ""
      : `今日综合判断：${readyForecasts
          .map((f) => `${f.assetName}${displayDirection(f)}`)
          .join("、")}。`;

  return (
    <section id="moonx-view" className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="MOOX" title="今日观点" subtitle="登录用户可见 · 交易结束后自动验证" />

        <MetaRow
          forecastDate={sectionDate}
          publishedAt={earliestPublish}
          version={sectionVersion}
          lockStatus={lockLabel(accessDenied)}
          verifyStatus={sectionVerify}
        />

        {accessDenied === "LOGIN_REQUIRED" ? (
          <div className="mt-4 max-w-xl space-y-3 rounded-xl border border-border/[0.1] bg-card p-5">
            <Text variant="body" weight="semibold">
              {teaser?.published ? "今日预测已经发布" : "今日预测尚未发布"}
            </Text>
            {teaser?.published ? (
              <Text variant="body-sm" color="secondary">
                覆盖市场：{teaser.marketCount}
                {teaser.publishedAt
                  ? ` · 发布时间：${formatDateTimeChina(teaser.publishedAt)}`
                  : ""}
                {" · "}锁定状态：需登录
              </Text>
            ) : (
              <Text variant="body-sm" color="secondary">
                今日预测尚未发布。登录后可在发布后查看完整方向与概率。
              </Text>
            )}
            <Text variant="body-sm" color="secondary">
              登录后查看今日预测方向、概率与路径。{denyMessage ? ` ${denyMessage}` : ""}
            </Text>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild variant="primary" size="sm">
                <Link href="/login?next=/">登录</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/register?next=/">注册</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {accessDenied === "WAIT_UNTIL_08" ? (
          <div className="mt-4 max-w-xl space-y-3 rounded-xl border border-border/[0.1] bg-card p-5">
            <Text variant="body" weight="semibold">
              {teaser?.published ? "今日预测已经发布" : "今日预测尚未发布"}
            </Text>
            {teaser?.published ? (
              <Text variant="body-sm" color="secondary">
                覆盖市场：{teaser.marketCount} · 锁定状态：北京时间08:00开放
              </Text>
            ) : null}
            <Text variant="body-sm" color="secondary">
              今日预测将在北京时间08:00向普通用户开放。有效会员可全天提前查看。
              {denyMessage ? ` ${denyMessage}` : ""}
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
                return (
                  <article
                    key={f.id}
                    className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-border/[0.1] bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)/0.04)]"
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
                      <p>状态：已锁定</p>
                      <p>验证状态：{verifyLabel(f)}</p>
                    </div>
                    <ProbabilityBars up={p.up} flat={p.flat} down={p.down} />
                    <p className="break-words text-body-sm text-foreground-secondary">
                      {f.headline ?? f.summary}
                    </p>
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
                        ) : (
                          <p>盘中路径：按公开摘要观察</p>
                        )}
                        {f.risks?.length ? <p>风险：{f.risks.join("；")}</p> : null}
                        {f.symbol === "WTI" ? (
                          <p>行情及验证使用WTI近月连续合约，不代表特定交割月份的现货价格。</p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {!accessDenied && readyForecasts.length === 0 ? (
          <Text variant="body-sm" color="secondary" className="mt-2">
            今日预测尚未发布
          </Text>
        ) : null}

        <Link
          href="/verification"
          className="mt-4 inline-block min-h-11 text-body-sm text-primary underline-offset-4 hover:underline"
        >
          查看历史准确率
        </Link>
      </div>
    </section>
  );
}
