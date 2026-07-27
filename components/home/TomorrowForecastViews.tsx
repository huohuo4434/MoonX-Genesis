"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHeader } from "@/components/home/SectionHeader";
import { LockIcon } from "@/components/icons";
import { Badge, Button, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatForecastDateEn, formatForecastDateZh } from "@/lib/calendar/next-trading-day";
import type { DailyForecast, TomorrowForecastPublicSummary } from "@/types/daily-forecast";

const LOCKED_ROWS = [
  { key: "direction", zh: "明日方向", en: "Direction" },
  { key: "prob", zh: "上涨/下跌概率", en: "Up/down probability" },
  { key: "levels", zh: "支撑压力", en: "Support / resistance" },
  { key: "windows", zh: "关键时间窗口", en: "Key time windows" },
  { key: "invalidation", zh: "失效条件", en: "Invalidation" },
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
  const { locale } = useLocale();
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
          {summary.assetNames.join(isChinese ? "、" : ", ")}
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
            <Link href={pricingHref}>{t("home.tomorrowUnlockCta")}</Link>
          </Button>
          <Link
            href={memberHref}
            className="text-body-sm text-foreground-secondary underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("home.tomorrowBenefitsLink")}
          </Link>
        </div>

        <Text variant="caption" color="tertiary" className="mt-6 block max-w-2xl">
          {t("home.tomorrowLifecycleNote")}
        </Text>
        <Link
          href="/verification"
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
  const [open, setOpen] = useState(false);
  const pending = forecast.confidence <= 0 || forecast.summary === "研究尚未完成" || forecast.status === "draft";

  return (
    <article className="flex flex-col rounded-lg border border-primary/25 bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text variant="body" weight="semibold">
            {forecast.assetName}
          </Text>
          <Text variant="caption" color="tertiary" className="font-mono">
            {forecast.symbol}
          </Text>
        </div>
        <Badge variant={pending ? "neutral" : "default"}>
          {pending ? t("home.tomorrowResearchPending") : forecast.direction}
        </Badge>
      </div>

      <Text variant="caption" color="secondary" className="mt-3 block">
        {t("home.tomorrowNextSession")}
        {formatDate(forecast.forecastForDate, isChinese)}
        <span className="text-foreground-tertiary"> · {forecast.tradingSessionLabel}</span>
      </Text>

      {pending ? (
        <Text variant="body-sm" color="secondary" className="mt-4">
          {t("home.tomorrowResearchPending")}
        </Text>
      ) : (
        <>
          <Text variant="body-sm" className="mt-3">
            {forecast.summary}
          </Text>
          <Text variant="caption" color="tertiary" className="mt-2 block">
            {t("home.tomorrowConfidence")}: {forecast.confidence}%
          </Text>
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
          {forecast.expectedPath?.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowPath")}: </span>
              {forecast.expectedPath.join(isChinese ? " → " : " → ")}
            </p>
          ) : null}
          {forecast.supportLevels?.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowSupport")}: </span>
              {forecast.supportLevels.join(", ")}
            </p>
          ) : null}
          {forecast.resistanceLevels?.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowResistance")}: </span>
              {forecast.resistanceLevels.join(", ")}
            </p>
          ) : null}
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
                  {w.label}: {w.description}
                </li>
              ))}
            </ul>
          ) : null}
          {forecast.catalysts?.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowCatalysts")}: </span>
              {forecast.catalysts.join(isChinese ? "；" : "; ")}
            </p>
          ) : null}
          {forecast.risks?.length ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowRisks")}: </span>
              {forecast.risks.join(isChinese ? "；" : "; ")}
            </p>
          ) : null}
          {forecast.invalidation ? (
            <p>
              <span className="text-foreground-tertiary">{t("home.tomorrowInvalidation")}: </span>
              {forecast.invalidation}
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
                    v{r.version} · {formatTime(r.updatedAt, isChinese)} · {r.reason}
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
  const { locale } = useLocale();
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
            <strong className="ml-1 text-foreground">{summary.lastUpdatedLabel}</strong>
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
          <Link href={detailHref} className="text-body-sm text-primary underline-offset-4 hover:underline">
            {t("home.tomorrowFullPage")}
          </Link>
          <Link
            href="/verification"
            className="text-body-sm text-foreground-secondary underline-offset-4 hover:underline"
          >
            {t("home.tomorrowHistoryLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
