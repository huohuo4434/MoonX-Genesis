"use client";

import { useState } from "react";
import Link from "next/link";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { PlainLanguageSummary } from "@/components/education/PlainLanguageSummary";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Button, Text } from "@/components/ui";
import { dailyAssetOrderIndex } from "@/lib/data/daily-asset-order";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import { displayDirection, isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import { assetDisplaySymbol, assetVenue } from "@/lib/presentation/asset-catalog";
import { normalizeDailyLanguage, normalizeDailyPath } from "@/lib/forecasts/daily-language";
import { mooxDirectionArrow, mooxDirectionLabelEn, mooxDirectionLabelZh } from "@/lib/forecasts/moox-direction-doctrine";
import { dailyDirectionHeadline, dailyPathLabelEn, dailyPathLabelZh } from "@/lib/forecasts/daily-direction-presentation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { assetNameEn, safeEnglish, safeEnglishList, signalStrengthEn } from "@/lib/i18n/english-content";
import type { DailyForecast } from "@/types/daily-forecast";

const EN_ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SPX: "S&P 500",
  NDX: "Nasdaq 100",
  SHCOMP: "Shanghai Composite",
  HSTECH: "Hang Seng TECH",
  GOLD: "Gold",
  SILVER: "Silver",
  WTI: "WTI crude oil",
};

const EN_VENUES: Record<string, string> = {
  BTC: "Global crypto market",
  ETH: "Global crypto market",
  SPX: "US index market",
  NDX: "US index market",
  SHCOMP: "Shanghai Stock Exchange",
  HSTECH: "Hong Kong Exchanges",
  GOLD: "International gold market",
  SILVER: "International silver market",
  WTI: "International energy market",
};

function formatDateForLocale(value: string, en: boolean): string {
  if (!en) return formatDateChina(value);
  const date = new Date(`${value}T00:00:00+08:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Shanghai" }).format(date);
}

function formatDateTimeForLocale(value: string, en: boolean): string {
  if (!en) return formatDateTimeChina(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Shanghai" }).format(date)} GMT+8`;
}

function isDraft(f: DailyForecast) {
  return f.status === "draft" || f.confidence <= 0 || f.summary === "研究尚未完成";
}

function ProbabilityBars({ up, flat, down, en }: { up: number; flat: number; down: number; en: boolean }) {
  return (
    <div className="space-y-1.5">
      {(
        [
          [en ? "Up" : "上涨", up, "bg-emerald-600/80"],
          [en ? "Range" : "震荡", flat, "bg-slate-500/70"],
          [en ? "Down" : "下跌", down, "bg-rose-600/75"],
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
  accessLabel,
  en,
}: {
  forecastDate?: string;
  publishedAt?: string;
  accessLabel: string;
  en: boolean;
}) {
  return (
    <div className="mb-4 grid gap-2 rounded-xl border border-border/[0.08] bg-card/70 p-4 sm:grid-cols-3">
      <div>
        <p className="text-caption text-foreground-tertiary">{en ? "Forecast date" : "预测日期"}</p>
        <p className="text-body-sm text-foreground">{forecastDate ? formatDateForLocale(forecastDate, en) : en ? "Pending" : "待更新"}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">{en ? "Last updated" : "最近更新"}</p>
        <p className="text-body-sm text-foreground">{publishedAt ? formatDateTimeForLocale(publishedAt, en) : accessLabel === (en ? "Sign in to view" : "登录后查看") ? accessLabel : en ? "Not published" : "尚未发布"}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">{en ? "Access" : "查看权限"}</p>
        <p className="text-body-sm text-foreground">{accessLabel}</p>
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
  accessReason: _accessReason,
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
  const { locale, href } = useLocale();
  const en = locale === "en";
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
  const accessLabel = accessDenied
    ? accessDenied === "LOGIN_REQUIRED"
      ? en ? "Sign in to view" : "登录后查看"
      : en ? "Available after 08:00 Beijing time" : "北京时间08:00开放"
    : detailLevel === "full"
      ? en ? "Full forecast" : "完整观点"
      : en ? "Direction summary" : "方向摘要";

  const autoSummary =
    readyForecasts.length === 0
      ? ""
      : `${en ? "Today’s combined view: " : "今日综合判断："}${readyForecasts
          .map((f) => `${en ? EN_ASSET_NAMES[assetDisplaySymbol(f.symbol)] ?? assetNameEn(f.assetName) : f.assetName} ${dailyDirectionHeadline(displayDirection(f), en ? "en" : "zh")}`)
          .join(en ? ", " : "、")}${en ? "." : "。"}`;

  return (
    <section id="moonx-view" className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={en ? "Latest view" : "今日观点"}
          title={en ? "Today’s market view" : "今日观点"}
          subtitle={en ? "Access depends on account status · Public verification after the session" : "按账户权限开放 · 交易结束后公开验证"}
        />

        <MetaRow
          forecastDate={sectionDate}
          publishedAt={earliestPublish}
          accessLabel={accessLabel}
          en={en}
        />

        {accessDenied === "LOGIN_REQUIRED" ? (
          <div className="mt-2 max-w-xl space-y-3 rounded-xl border border-border/[0.1] bg-card p-5">
            <Text variant="body" weight="semibold">
              {en ? "Today’s market view" : "今日市场观点"}
            </Text>
            <Text variant="body-sm" color="secondary">
              {en ? "Registered users can view today’s basic forecast after 08:00 Beijing time. Active members receive full early access all day." : "注册用户可在北京时间08:00后查看今日观点；有效会员可全天提前查看完整预测。"}
            </Text>
            <Text variant="caption" color="tertiary">
              {en ? "Direction, probabilities and expected path are hidden until sign-in." : "未登录不展示方向、概率与路径。"}
            </Text>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild variant="primary" size="sm">
                <Link href={href("/login?next=/#moonx-view")}>{en ? "Sign in" : "登录查看"}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={href("/pricing")}>{en ? "Membership plans" : "会员方案"}</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {accessDenied === "WAIT_UNTIL_08" ? (
          <div className="mt-2 max-w-xl space-y-3 rounded-xl border border-border/[0.1] bg-card p-5">
            <Text variant="body" weight="semibold">
              {en ? "Today’s view opens at 08:00 Beijing time" : "今日观点将在北京时间08:00开放"}
            </Text>
            <Text variant="body-sm" color="secondary">
              {en ? "Direction and probabilities remain hidden before release. Active members receive early access all day." : "开放前不会展示方向与概率。有效会员可全天提前查看。"}
            </Text>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild variant="primary" size="sm">
                <Link href={href("/pricing")}>{en ? "Upgrade membership" : "升级会员"}</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {!accessDenied && publishHint ? (
          <p className="mb-3 text-caption text-foreground-tertiary">{en ? safeEnglish(publishHint, "Publication timing follows the current access schedule.") : publishHint}</p>
        ) : null}

        {!accessDenied && readyForecasts.length > 0 ? (
          <>
            <p className="mb-4 max-w-3xl text-body-sm text-foreground-secondary">
              {autoSummary || (en ? safeEnglish(compositeSummary) : compositeSummary)}
            </p>
            <div className={`grid gap-4 ${readyForecasts.length === 1 ? "grid-cols-1" : "md:grid-cols-2"}`}>
              {readyForecasts.map((f) => {
                const open = openId === f.id;
                const p = f.probabilities ?? {
                  up: f.confidence,
                  flat: Math.max(0, 100 - f.confidence),
                  down: 0,
                };
                const showFull = detailLevel === "full";
                const normalizedPath = en ? safeEnglishList(normalizeDailyPath(f.expectedPath)) : normalizeDailyPath(f.expectedPath);
                const pathBias = en
                  ? safeEnglish(f.pathBias || normalizedPath.join(" → "), "Expected path is awaiting technical confirmation.")
                  : normalizeDailyLanguage(f.pathBias) || normalizedPath.join(" → ") || "运行节奏待补充";
                return (
                  <article
                    key={f.id}
                    className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-border/[0.1] bg-card p-4"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Text variant="body" weight="semibold" className="min-w-0 break-words">
                          {en ? EN_ASSET_NAMES[assetDisplaySymbol(f.symbol)] ?? assetNameEn(f.assetName) : f.assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{assetDisplaySymbol(f.symbol)}</span>
                        </Text>
                        <Text variant="caption" color="tertiary" className="mt-1 block">{en ? EN_VENUES[assetDisplaySymbol(f.symbol)] ?? assetVenue(f.symbol) : assetVenue(f.symbol)}</Text>
                      </div>
                      <Badge variant="outline">{mooxDirectionArrow(displayDirection(f))} {dailyDirectionHeadline(displayDirection(f), en ? "en" : "zh")}</Badge>
                    </div>
                    <div className="grid gap-2 text-caption text-foreground-tertiary sm:grid-cols-2">
                      <p>{en ? safeEnglish(f.targetSessionLabel ?? f.tradingSessionLabel, "Next market session") : f.targetSessionLabel ?? f.tradingSessionLabel}</p><p>{en ? "Version" : "版本"} V{f.version} · {en ? "Locked" : "已锁定"}</p>
                      <p>{en ? "Updated" : "更新"}：{formatDateTimeForLocale(f.publishedAt, en)}</p>
                    </div>
                    <Text variant="caption" color="tertiary" className="block">{en ? "MOOX OFFICIAL DIRECTION" : "MOOX 唯一方向"}</Text>
                    <p className="text-body-sm font-semibold text-foreground">
                      {en ? "Overall: " : "总体："}{en ? mooxDirectionLabelEn(displayDirection(f)) : mooxDirectionLabelZh(displayDirection(f))}
                      <span className="text-foreground-tertiary"> · </span>
                      {en ? "Intraday path: " : "日内路径："}{en ? dailyPathLabelEn(displayDirection(f)) : dailyPathLabelZh(displayDirection(f))}
                    </p>
                    <PlainLanguageSummary
                      direction={displayDirection(f)}
                      path={pathBias}
                      en={en}
                    />
                    <div>
                      <Text variant="caption" color="tertiary" className="mb-1 block">{en ? "Scenario weights (not a direction vote)" : "情景权重（不参与方向投票）"}</Text>
                      <ProbabilityBars up={p.up} flat={p.flat} down={p.down} en={en} />
                    </div>
                    <div className="grid gap-2 rounded-lg border border-border/[0.07] bg-muted/20 p-3 text-caption sm:grid-cols-3">
                      <p><span className="text-foreground-tertiary">{en ? "Expected path: " : "运行路径："}</span><span className="text-foreground-secondary">{pathBias}</span></p>
                      <p><span className="text-foreground-tertiary">{en ? "Signal strength: " : "信号强度："}</span><span className="text-foreground-secondary">{en ? signalStrengthEn(f.signalStrength ?? (f.confidence >= 66 ? "高" : f.confidence >= 52 ? "中" : "低")) : f.signalStrength ?? (f.confidence >= 66 ? "高" : f.confidence >= 52 ? "中" : "低")}</span></p>
                      <p><span className="text-foreground-tertiary">{en ? "Direction rule: " : "方向规则："}</span><span className="text-foreground-secondary">{en ? "Metaphysics sets direction" : "玄学定方向"}</span></p>
                    </div>
                    <p className="break-words text-caption text-foreground-secondary">
                      {en ? "Research note: " : "研究说明："}{en ? safeEnglish(f.headline ?? f.summary) : normalizeDailyLanguage(f.headline ?? f.summary)}
                    </p>
                    {showFull ? (
                      <>
                        <button
                          type="button"
                          className="min-h-11 text-left text-caption text-primary underline-offset-2 hover:underline"
                          onClick={() => setOpenId(open ? null : f.id)}
                          aria-expanded={open}
                        >
                          {open ? (en ? "Hide details" : "收起详情") : (en ? "Show details" : "展开详情")}
                        </button>
                        {open ? (
                          <div className="space-y-2 break-words border-t border-border/[0.06] pt-3 text-caption text-foreground-tertiary">
                            <p>{en ? "Target session: " : "目标时段："}{en ? safeEnglish(f.targetSessionLabel ?? f.tradingSessionLabel, "Next market session") : f.targetSessionLabel ?? f.tradingSessionLabel}</p>
                            <div className="rounded-md border border-border/[0.08] bg-muted/30 p-3">
                              <PriceLevelsBlock
                                support={f.supportLevels}
                                resistance={f.resistanceLevels}
                                invalidation={f.invalidation}
                                confirmation={f.confirmation}
                                priceSource={undefined}
                                snapshotAt={undefined}
                              />
                            </div>
                            {normalizedPath.length ? (
                              <p>{en ? "Intraday path: " : "盘中路径："}{normalizedPath.join(" → ")}</p>
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
            {en ? "Today’s view has not been published yet." : "今日观点尚未发布"}
          </Text>
        ) : null}
      </div>
    </section>
  );
}
