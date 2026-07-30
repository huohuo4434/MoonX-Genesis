"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { TrendBadge } from "@/components/data";
import { Badge, Heading, Text } from "@/components/ui";
import { getDominantDirection, type AssetIntelligenceSnapshot, type SnapshotMetadata } from "@/lib/data/intelligence-snapshot-types";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDate } from "@/lib/utils";

export function TodaysMoonXViewClient({
  assets,
  snapshot,
}: {
  assets: AssetIntelligenceSnapshot[];
  snapshot: SnapshotMetadata;
}) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN";

  return (
    <>
      <div className="mb-10 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            {t("ui.todayMoonxView")}
          </Text>
          <Badge variant="warning">{isChinese ? snapshot.statusLabelZh ?? snapshot.statusLabel : snapshot.statusLabel}</Badge>
          <Badge variant="outline">{t("common.curatedNotLive")}</Badge>
        </div>
        <Heading as="h2" size="h2" className="max-w-2xl">{t("ui.latestSnapshot")}</Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {t("ui.assetOverview")} · {formatLocalizedDate(snapshot.snapshotDate, locale)} · {t("common.notFinancialAdvice")}
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {assets.map((asset) => (
          <Link key={asset.id} href={`/research/intelligence-snapshot#${asset.id}`} className="group flex flex-col gap-3 rounded-lg border border-border/[0.08] bg-card p-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow-sm focus-ring">
            <div className="flex items-start justify-between gap-2">
              <Text variant="body" weight="semibold" className="text-foreground">
                {isChinese ? asset.assetZh ?? asset.asset : asset.asset}
              </Text>
              <TrendBadge trend={getDominantDirection(asset.scores)} />
            </div>
            <Text variant="body-sm" color="secondary">{isChinese ? asset.shortViewZh ?? asset.shortView : asset.shortView}</Text>
            <span className="mt-auto flex items-center gap-1 pt-2 text-caption text-foreground-tertiary transition-colors group-hover:text-primary">
              {t("common.viewDetails")}
              <ArrowRightIcon size={12} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <Link href="/research/intelligence-snapshot" className="mt-8 inline-flex items-center gap-1.5 rounded-sm text-body-sm text-foreground-secondary transition-colors hover:text-primary focus-ring">
        {t("ui.viewFullSnapshot")}
        <ArrowRightIcon size={14} />
      </Link>
    </>
  );
}
