"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Text } from "@/components/ui";
import { pickLocalized, type LocalizedText } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDate } from "@/lib/utils";

interface WatchRow {
  id: string;
  assetName: LocalizedText;
  symbol: string;
  horizon: LocalizedText;
  nextEvent: LocalizedText;
  updatedAt?: string;
  rating: "bullish" | "neutral" | "bearish";
  hasFormalRating: boolean;
}

export function StrategicWatchlistPreviewClient({ rows }: { rows: WatchRow[] }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow={t("home.watchlistEyebrow")}
        title={t("home.watchlistTitle")}
        subtitle={t("home.watchlistSubtitleCompact")}
      />
      <div className="overflow-hidden rounded-lg border border-border/[0.08]">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`grid gap-2 px-4 py-3 sm:grid-cols-[1.2fr_0.8fr_1fr_1fr] sm:items-center ${
              index > 0 ? "border-t border-border/[0.06]" : ""
            }`}
          >
            <div>
              <Text variant="body-sm" weight="semibold">
                {pickLocalized(row.assetName, locale)}
              </Text>
              <Text variant="caption" color="tertiary" className="font-mono">
                {row.symbol}
              </Text>
            </div>
            <Badge variant="outline">
              {row.hasFormalRating
                ? t(`watchlist.ratingLabel.${row.rating}`)
                : t("horizon.focusTracking")}
            </Badge>
            <Text variant="caption" color="secondary">
              {pickLocalized(row.horizon, locale)}
            </Text>
            <div>
              <Text variant="caption" color="secondary" className="line-clamp-2">
                {pickLocalized(row.nextEvent, locale)}
              </Text>
              {row.updatedAt && (
                <Text variant="caption" color="tertiary">
                  {formatLocalizedDate(row.updatedAt, locale)}
                </Text>
              )}
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/markets/watchlist"
        className="mt-4 inline-flex items-center gap-1 text-body-sm text-foreground-secondary hover:text-primary focus-ring"
      >
        {t("home.viewFullWatchlist")}
        <ArrowRightIcon size={14} />
      </Link>
    </div>
  );
}
