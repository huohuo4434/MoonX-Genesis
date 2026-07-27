"use client";

import Link from "next/link";
import { AlertTriangleIcon, ArrowRightIcon } from "@/components/icons";
import { Badge, Button, Card, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { cn, formatLocalizedDate } from "@/lib/utils";
import type { WatchlistEntry, WatchlistRating, WatchlistStatus } from "@/types/research";

function ratingBadgeVariant(rating: WatchlistRating) {
  if (rating === "bullish") return "success" as const;
  if (rating === "bearish") return "danger" as const;
  return "neutral" as const;
}

const STATUS_KEY: Record<WatchlistStatus, string> = {
  "pre-ipo-watch": "watchlist.preIpoWatch",
  "ipo-strategic-watch": "watchlist.ipoStrategicWatch",
  active: "watchlist.active",
  "high-volatility-watch": "watchlist.highVolatilityWatch",
};

export interface WatchlistCardProps {
  entry: WatchlistEntry;
  researchCount: number;
  className?: string;
}

export function WatchlistCard({ entry, researchCount, className }: WatchlistCardProps) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <Card padding="lg" hover className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <Text variant="body" weight="semibold" className="text-foreground">
            {pickLocalized(entry.assetName, locale)}
          </Text>
          <Text variant="caption" color="tertiary" className="font-mono">
            {entry.symbol}
          </Text>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={ratingBadgeVariant(entry.rating)}>{t(`directions.${entry.rating}`)}</Badge>
          <Badge variant="outline">{t(STATUS_KEY[entry.status])}</Badge>
        </div>
      </div>

      {entry.ratingNote && (
        <Text variant="caption" color="tertiary" className="whitespace-pre-line normal-case tracking-normal">
          {pickLocalized(entry.ratingNote, locale)}
        </Text>
      )}

      <div className="flex flex-col gap-1">
        <Text variant="label" color="tertiary" className="uppercase tracking-wide">
          {t("watchlist.horizon")}
        </Text>
        <Text variant="body-sm" color="secondary">
          {pickLocalized(entry.horizon, locale)}
        </Text>
      </div>

      <div className="flex flex-col gap-1.5">
        <Text variant="label" color="tertiary" className="uppercase tracking-wide">
          {t("watchlist.mainTheme")}
        </Text>
        <div className="flex flex-wrap gap-1.5">
          {entry.mainTheme.map((theme, index) => (
            <Badge key={index} variant="neutral">
              {pickLocalized(theme, locale)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Text variant="label" color="tertiary" className="uppercase tracking-wide">
          {t("watchlist.currentThesis")}
        </Text>
        <Text variant="body-sm" color="secondary">
          {pickLocalized(entry.thesis, locale)}
        </Text>
      </div>

      <div className="flex flex-col gap-1">
        <Text variant="label" color="tertiary" className="uppercase tracking-wide">
          {t("watchlist.keyRisks")}
        </Text>
        <ul className="flex flex-col gap-1">
          {entry.risks.map((risk, index) => (
            <li key={index} className="flex gap-2 text-body-sm text-foreground-secondary">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground-tertiary" />
              {pickLocalized(risk, locale)}
            </li>
          ))}
        </ul>
      </div>

      {entry.meta && entry.meta.length > 0 && (
        <div className="grid grid-cols-2 gap-2 rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
          {entry.meta.map((item) => (
            <div key={item.labelKey} className="flex flex-col gap-0.5">
              <Text variant="caption" color="tertiary">
                {t(item.labelKey)}
              </Text>
              <Text variant="caption" weight="medium" className="text-foreground-secondary">
                {pickLocalized(item.value, locale)}
              </Text>
            </div>
          ))}
        </div>
      )}

      {entry.warning && (
        <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/10 p-2.5">
          <AlertTriangleIcon size={14} className="mt-0.5 shrink-0 text-warning" />
          <Text variant="caption" className="text-warning">
            {pickLocalized(entry.warning, locale)}
          </Text>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/[0.08] pt-3">
        <div className="flex flex-col gap-0.5">
          <Text variant="caption" color="tertiary">
            {t("watchlist.nextEvent")}
          </Text>
          <Text variant="caption" weight="medium" className="text-foreground-secondary">
            {pickLocalized(entry.nextEvent, locale)}
            {entry.nextEventDate ? ` · ${formatLocalizedDate(entry.nextEventDate, locale)}` : ""}
          </Text>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Text variant="caption" color="tertiary">
            {t("watchlist.researchCoverage")}
          </Text>
          <Text variant="caption" weight="medium" className="font-mono text-foreground-secondary">
            {researchCount}
          </Text>
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="self-start">
        <Link href="/research/library">
          {t("watchlist.viewResearch")}
          <ArrowRightIcon size={13} />
        </Link>
      </Button>
    </Card>
  );
}
