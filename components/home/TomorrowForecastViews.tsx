"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHeader } from "@/components/home/SectionHeader";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { normalizeDailyLanguage, normalizeDailyPath } from "@/lib/forecasts/daily-language";
import { LockIcon } from "@/components/icons";
import { Badge, Button, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { assetNameEn, safeEnglish, safeEnglishList, signalStrengthEn } from "@/lib/i18n/english-content";
import { formatForecastDateEn, formatForecastDateZh } from "@/lib/calendar/next-trading-day";
import { displayDirection } from "@/lib/data/daily-forecasts";
import { mooxDirectionArrow, mooxDirectionLabelEn, mooxDirectionLabelZh } from "@/lib/forecasts/moox-direction-doctrine";
import { dailyDirectionHeadline, dailyPathLabelEn, dailyPathLabelZh } from "@/lib/forecasts/daily-direction-presentation";
import { displayMarketCode } from "@/lib/forecasts/formal-direction";
import type { DailyForecast, TomorrowForecastPublicSummary } from "@/types/daily-forecast";

const LOCKED_ROWS = [
  { key: "direction", zh: "明日方向", en: "Direction" },
  { key: "prob", zh: "上涨/震荡/下跌情景权重", en: "Bull/range/bear scenario weights" },
  { key: "levels", zh: "支撑压力", en: "Support / resistance" },
  { key: "windows", zh: "关键时间窗口", en: "Key time windows" },
  { key: "invalidation", zh: "技术风控参考", en: "Technical risk reference" },
] as const;

function formatDate(iso: string, isChinese: boolean) {
  return isChinese ? formatForecastDateZh(iso) : formatForecastDateEn(iso);
}

function formatTime(iso: string | undefined, isChinese: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(isChinese ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TomorrowForecastLocked({
  summary,
  pricingHref,
  memberHref,
}: {
  summary: TomorrowForecastPublicSummary;
  pricingHref: string;
  memberHref: string;
}) {
  const { locale, href } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";

  return (
    <section id="tomorrow-forecast" className="border-t border-border/[0.06] bg-card/30 py-14 lg:py-20">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="default">{t("home.tomorrowMemberBadge")}</Badge>
          <LockIcon size={14} className="text-primary" aria-hidden />
        </div>
        <SectionHeader
          eyebrow={t("home.tomorrowEyebrow")}
          title={t("home.tomorrowTitle")}
          subtitle={t("home.tomorrowSubtitle")}
        />

        <div className="mb-8 grid gap-4 rounded-lg border border-primary/20 bg-background/60 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Text variant="caption" color="tertiary">
              {t("home.tomorrowNextSession")}
            </Text>
            <Text variant="body" weight="semibold" className="mt-1 block">
              {formatDate(summary.nextDateIso, isChinese)}
            </Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              {t("home.tomorrowAssetCount")}
            </Text>
            <Text variant="body" weight="semibold" className="mt-1 block">
              {summary.allDraft
                ? t("home.tomorrowPlannedAssets", { count: summary.assetCount })
                : t("home.tomorrowPublishedAssets", { count: summary.publishedCount })}
            </Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              {t("home.tomorrowLastUpdated")}
            </Text>
            <Text variant="body" weight="semibold" className="mt-1 block">
              {summary.allDraft ? "—" : summary.lastUpdatedLabel}
            </Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              {t("home.tomorrowPublishState")}
            </Text>
            <Text variant="body" weight="semibold" className="mt-1 block">
              {summary.allDraft
                ? t("home.tomorrowDraftPendingReview")
                : summary.publishedCount > 0
                  ? t("home.tomorrowPublishedCount", { count: summary.publishedCount })
                  : t("home.tomorrowReviewedWaiting")}
            </Text>
          </div>
        </div>

        <Text variant="body-sm" color="secondary" className="mb-4">
          {t("home.tomorrowCoveredAssets")}
          {(isChinese ? summary.assetNames : summary.assetNames.map(assetNameEn)).join(isChinese ? "、" : ", ")}
        </Text>

        <div className="mb-8 rounded-lg border border-border/[0.1] bg-muted/20 p-5">
          <div className="mb-4 flex items-center gap-2">
            <LockIcon size={16} className="text-foreground-secondary" />
            <Text variant="body" weight="semibold">
              {t("home.tomorrowLockedTitle")}
            </Text>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {LOCKED_ROWS.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between rounded-md border border-border/[0.08] bg-background/50 px-3 py-2.5"
              >
                <Text variant="body-sm" color="secondary">
                  {isChinese ? row.zh : row.en}
                </Text>
                <Badge variant="outline">{t("home.tomorrowUnlockHint")}</Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="primary">
            <Link href={href(pricingHref)}>{t("home.tomorrowUnlockCta")}</Link>
          </Button>
          <Link
            href={href(memberHref)}
            className="text-body-sm text-foreground-secondary underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("home.tomorrowBenefitsLink")}
          </Link>
        </div>

        <Text variant="caption" color="tertiary" className="mt-6 block max-w-2xl">
          {t("home.tomorrowLifecycleNote")}
        </Text>
        <Link
          href={href("/verification")}
          className="mt-2 inline-block text-body-sm text-primary underline-offset-4 hover:underline"
        >
          {t("home.tomorrowHistoryLink")}
        </Link>
      </div>
    </section>
  );
}

function MemberAssetCard({ forecast }: { forecast: DailyForecast }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const pending = forecast.confidence <= 0 || forecast.summary === "研究尚未完成" || forecast.status === "draft";
  const sourcePath = normalizeDailyPath(forecast.intradayRhythm?.length ? forecast.intradayRhythm : forecast.expectedPath);
  const normalizedPath = en ? safeEnglishList(sourcePath) : sourcePath;
  const pathBias = en
    ? safeEnglish(forecast.pathBias || normalizedPath.join(" → "), "Expected path is awaiting technical confirmation.")
    : normalizeDailyLanguage(forecast.pathBias) || normalizedPath.join(" → ") || "运行节奏待补充";
  const summary = en ? safeEnglish(forecast.summary) : normalizeDailyLanguage(forecast.summary);

  return (
    <article className="flex flex-col rounded-lg border border-primary/25 bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text variant="body" weight="semibold">
            {en ? assetNameEn(forecast.assetName) : forecast.assetName}
          </Text>
          <Text variant="caption" color="tertiary" className="font-mono">
            {displayMarketCode(forecast.symbol)}
          </Text>
        </div>
        <Badge variant={pending ? "neutral" : "default"}>
          {pending ? t("home.tomorrowResearchPending") : `${mooxDirectionArrow(displayDirection(forecast))} ${dailyDirectionHeadline(displayDirection(forecast), en ? "en" : "zh")}`}
        </Badge>
      </div>

      <Text variant="caption" color="secondary" className="mt-3 block">
        {t("home.tomorrowNextSession")}
        {formatDate(forecast.forecastForDate, isChinese)}
        <span className="text-foreground-tertiary"> · {en ? safeEnglish(forecast.targetSessionLabel ?? forecast.tradingSessionLabel, "Next market session") : forecast.targetSessionLabel ?? forecast.tradingSessionLabel} · V{forecast.version} {en ? "locked" : "已锁定"}</span>
      </Text>

      {pending ? (
        <Text variant="body-sm" color="secondary" className="mt-4">
          {t("home.tomorrowResearchPending")}
        </Text>
      ) : (
        <>
          <Text variant="body-sm" weight="semibold" className="mt-3">
            {en ? "Overall direction: " : "总体方向："}{en ? mooxDirectionLabelEn(displayDirection(forecast)) : mooxDirectionLabelZh(displayDirection(forecast))}
            <span className="text-foreground-tertiary"> · </span>
            {en ? "Intraday path: " : "日内路径："}{en ? dailyPathLabelEn(displayDirection(forecast)) : dailyPathLabelZh(displayDirection(forecast))}
          </Text>
          <Text variant="caption" color="secondary" className="mt-1 block">
            {en ? "Research note: " : "研究说明："}{summary}
          </Text>
          <div className="mt-3 grid gap-2 rounded-lg border border-border/[0.07] bg-muted/20 p-3 text-caption sm:grid-cols-2">
            <p><span className="text-foreground-tertiary">{en ? "Closing-direction probabilities: " : "收盘方向概率："}</span><span className="text-foreground-secondary">{en ? "Bullish" : "上涨"} {forecast.probabilities?.up ?? "—"}% / {en ? "Range-bound" : "震荡"} {forecast.probabilities?.flat ?? "—"}% / {en ? "Bearish" : "下跌"} {forecast.probabilities?.down ?? "—"}%</span></p>
            <p><span className="text-foreground-tertiary">{en ? "Expected path: " : "运行路径："}</span><span className="text-foreground-secondary">{pathBias}</span></p>
            <p><span className="text-foreground-tertiary">{en ? "Signal strength: " : "信号强度："}</span><span className="text-foreground-secondary">{en ? signalStrengthEn(forecast.signalStrength ?? (forecast.confidence >= 66 ? "高" : forecast.confidence >= 52 ? "中" : "低")) : forecast.signalStrength ?? (forecast.confidence >= 66 ? "高" : forecast.confidence >= 52 ? "中" : "低")}</span></p>
            <p><span className="text-foreground-tertiary">{en ? "Wait for confirmation: " : "技术执行是否等待条件："}</span><span className="text-foreground-secondary">{forecast.waitForConfirmation === false ? (en ? "No" : "否") : (en ? "Yes" : "是")}</span></p>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 self-start text-body-sm text-primary underline-offset-4 hover:underline focus-ring rounded-sm"
      >
        {open ? t("home.tomorrowCollapse") : t("home.tomorrowExpand")}
      </button>

      {open && !pending && (
        <div className="mt-4 space-y-3 border-t border-border/[0.08] pt-4 text-body-sm text-foreground-secondary">
          {normalizedPath.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowPath")}: </span>
              {normalizedPath.join(" → ")}
            </p>
          ) : null}
          <div className="rounded-md border border-border/[0.08] bg-muted/20 p-3">
            <PriceLevelsBlock support={forecast.supportLevels} resistance={forecast.resistanceLevels} invalidation={forecast.invalidation} confirmation={forecast.confirmation} />
          </div>
          {forecast.targetLevels?.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowTargets")}: </span>
              {forecast.targetLevels.join(", ")}
            </p>
          ) : null}
          {forecast.keyTimeWindows?.length ? (
            <ul className="space-y-1">
              <li className="text-foreground-tertiary">{t("home.tomorrowWindows")}</li>
              {forecast.keyTimeWindows.map((w) => (
                <li key={w.label}>
                  {en ? safeEnglish(w.label, "Timing window") : normalizeDailyLanguage(w.label)}: {en ? safeEnglish(w.description) : normalizeDailyLanguage(w.description)}
                </li>
              ))}
            </ul>
          ) : null}
          {forecast.catalysts?.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowCatalysts")}: </span>
              {(en ? safeEnglishList(forecast.catalysts) : forecast.catalysts).join(isChinese ? "；" : "; ")}
            </p>
          ) : null}
          {forecast.risks?.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowRisks")}: </span>
              {(en ? safeEnglishList(forecast.risks) : forecast.risks).join(isChinese ? "；" : "; ")}
            </p>
          ) : null}
          {forecast.revisionHistory?.length ? (
            <div>
              <Text variant="caption" color="tertiary">
                {t("home.tomorrowRevisions")}
              </Text>
              <ul className="mt-1 space-y-1">
                {forecast.revisionHistory.map((r) => (
                  <li key={`${r.version}-${r.updatedAt}`}>
                    v{r.version} · {formatTime(r.updatedAt, isChinese)} · {en ? safeEnglish(r.reason) : r.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-3 pt-4 text-caption text-foreground-tertiary">
        <span>
          {t("home.tomorrowVersion")} v{forecast.version}
          {forecast.status === "revised" ? ` · ${t("home.tomorrowRevised")}` : ""}
        </span>
        <span>
          {t("home.tomorrowLastUpdated")} {formatTime(forecast.updatedAt ?? forecast.publishedAt, isChinese)}
        </span>
      </div>
    </article>
  );
}

export function TomorrowForecastMember({
  summary,
  forecasts,
  detailHref,
  isPreviewGate,
}: {
  summary: TomorrowForecastPublicSummary;
  forecasts: DailyForecast[];
  detailHref: string;
  isPreviewGate?: boolean;
}) {
  const { locale, href } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";

  return (
    <section id="tomorrow-forecast" className="border-t border-border/[0.06] bg-card/40 py-14 lg:py-20">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="default">{t("home.tomorrowMemberBadge")}</Badge>
          {isPreviewGate ? <Badge variant="warning">{t("home.tomorrowPreviewBadge")}</Badge> : null}
        </div>
        <SectionHeader
          eyebrow={t("home.tomorrowEyebrow")}
          title={t("home.tomorrowTitle")}
          subtitle={t("home.tomorrowSubtitle")}
        />

        <div className="mb-6 flex flex-wrap gap-4 text-body-sm text-foreground-secondary">
          <span>
            {t("home.tomorrowNextSession")}
            <strong className="ml-1 text-foreground">{formatDate(summary.nextDateIso, isChinese)}</strong>
          </span>
          <span>
            {t("home.tomorrowLastUpdated")}
            <strong className="ml-1 text-foreground">{isChinese ? summary.lastUpdatedLabel : safeEnglish(summary.lastUpdatedLabel, "Published and locked")}</strong>
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {forecasts.map((f) => (
            <MemberAssetCard key={f.id} forecast={f} />
          ))}
        </div>

        <Text variant="caption" color="tertiary" className="mt-6 block max-w-2xl">
          {t("home.tomorrowLifecycleNote")}
        </Text>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link href={href(detailHref)} className="text-body-sm text-primary underline-offset-4 hover:underline">
            {t("home.tomorrowFullPage")}
          </Link>
          <Link
            href={href("/verification")}
            className="text-body-sm text-foreground-secondary underline-offset-4 hover:underline"
          >
            {t("home.tomorrowHistoryLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
