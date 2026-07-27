"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDate } from "@/lib/utils";
import type { ResearchRecord } from "@/types/research";

function truncate(text: string, max = 100): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function LatestResearchClient({ records }: { records: ResearchRecord[] }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow={t("home.latestEyebrow")}
        title={t("home.latestTitle")}
        subtitle={t("home.latestSubtitle")}
      />
      {records.length === 0 ? (
        <Text variant="body" color="secondary">
          {t("home.latestEmpty")}
        </Text>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {records.map((record) => (
            <article
              key={record.id}
              className="flex flex-col gap-3 rounded-lg border border-border/[0.08] bg-card p-5"
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{pickLocalized(record.assetName, locale)}</Badge>
                <Badge variant="neutral">{t(`framework.${record.framework}`)}</Badge>
              </div>
              <Text variant="body" weight="semibold">
                {pickLocalized(record.title, locale)}
              </Text>
              <Text variant="caption" color="tertiary">
                {pickLocalized(record.horizon, locale)} · {formatLocalizedDate(record.publishedAt, locale)}
              </Text>
              <Text variant="body-sm" color="secondary">
                {truncate(pickLocalized(record.summary, locale))}
              </Text>
              <Link
                href="/research/library"
                className="mt-auto inline-flex items-center gap-1 text-caption text-foreground-tertiary hover:text-primary focus-ring"
              >
                {t("home.readFull")}
                <ArrowRightIcon size={12} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
