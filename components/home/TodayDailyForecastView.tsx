"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatForecastDateEn, formatForecastDateZh } from "@/lib/calendar/next-trading-day";
import type { DailyForecast } from "@/types/daily-forecast";

function isPending(f: DailyForecast) {
  return f.confidence <= 0 || f.summary === "研究尚未完成" || f.status === "draft";
}

export function TodayDailyForecastView({ forecasts }: { forecasts: DailyForecast[] }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";

  return (
    <section id="moonx-view" className="border-t border-border/[0.06] py-12 lg:py-16">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <div className="mb-2">
          <Badge variant="info">{t("home.todayVerifyingBadge")}</Badge>
        </div>
        <SectionHeader
          eyebrow={t("home.todayEyebrow")}
          title={t("home.todayTitle")}
          subtitle={t("home.todaySubtitle")}
        />

        {forecasts.length === 0 ? (
          <Text variant="body" color="secondary">
            {t("horizon.awaitingUpdate")}
          </Text>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {forecasts.map((f) => {
              const pending = isPending(f);
              const firstPublished = f.publishedAt;
              const revised = (f.revisionHistory?.length ?? 0) > 0 || f.status === "revised";
              return (
                <article
                  key={f.id}
                  className="flex min-h-[200px] flex-col gap-3 rounded-lg border border-border/[0.08] bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Text variant="body" weight="semibold">
                        {f.assetName}
                      </Text>
                      <Text variant="caption" color="tertiary" className="font-mono">
                        {f.symbol}
                      </Text>
                    </div>
                    <Badge variant={pending ? "neutral" : "outline"}>
                      {pending ? t("home.tomorrowResearchPending") : f.direction}
                    </Badge>
                  </div>

                  <Text variant="caption" color="secondary">
                    {t("home.todayForecastDate")}
                    {isChinese
                      ? formatForecastDateZh(f.forecastForDate)
                      : formatForecastDateEn(f.forecastForDate)}
                  </Text>

                  <Text variant="body-sm" color="secondary">
                    {pending ? t("home.tomorrowResearchPending") : f.summary}
                  </Text>

                  <div className="mt-auto space-y-1 border-t border-border/[0.06] pt-3 text-caption text-foreground-tertiary">
                    <p>
                      {t("home.todayFirstPublished")}{" "}
                      {firstPublished
                        ? new Date(firstPublished).toLocaleString(isChinese ? "zh-CN" : "en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                    <p>
                      {t("home.tomorrowVersion")} v{f.version}
                      {revised ? ` · ${t("home.todayIntradayRevision")}` : ` · ${t("home.todayNoRevision")}`}
                    </p>
                    <p>
                      {t("home.todayVerifyState")}: {t("home.todayVerifyingBadge")}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Text variant="caption" color="tertiary" className="mt-6 block max-w-2xl">
          {t("home.todayLifecycleHint")}
        </Text>
        <Link
          href="/research#verification"
          className="mt-2 inline-block text-body-sm text-primary underline-offset-4 hover:underline"
        >
          {t("home.tomorrowHistoryLink")}
        </Link>
      </div>
    </section>
  );
}
