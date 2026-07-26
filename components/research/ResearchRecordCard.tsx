"use client";

import { Badge, Button, Card, Progress, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { directionBadgeVariant } from "@/lib/research/research-utils";
import { formatDate } from "@/lib/utils";
import type { ResearchRecord } from "@/types/research";

export interface ResearchRecordCardProps {
  record: ResearchRecord;
  onViewDetails: (record: ResearchRecord) => void;
}

export function ResearchRecordCard({ record, onViewDetails }: ResearchRecordCardProps) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <Card padding="md" hover className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <Text variant="body" weight="semibold" className="text-foreground">
            {pickLocalized(record.assetName, locale)}
            {record.symbol && <span className="ml-1.5 font-mono text-caption text-foreground-tertiary">{record.symbol}</span>}
          </Text>
          <Text variant="caption" color="tertiary">
            {t(`framework.${record.framework}`)} · {pickLocalized(record.publicSourceLabel, locale)}
          </Text>
        </div>
        <Badge variant={directionBadgeVariant(record.direction)} className="shrink-0">
          {t(`directions.${record.direction}`)}
        </Badge>
      </div>

      {record.forecastStart && record.forecastEnd && (
        <Text variant="caption" color="tertiary">
          {t("researchLibrary.forecastWindowLabel", {
            start: formatDate(record.forecastStart),
            end: formatDate(record.forecastEnd),
          })}
        </Text>
      )}

      <Text variant="body-sm" color="secondary" className="line-clamp-3">
        {pickLocalized(record.summary, locale)}
      </Text>

      {record.direction !== "insufficient-evidence" && (
        <Progress value={record.editorialConfidence} label={t("researchLibrary.editorialConfidence")} />
      )}

      <div className="mt-1 flex items-center justify-between gap-2">
        <Badge variant="outline">{t(`status.${record.status}`)}</Badge>
        <Button variant="ghost" size="sm" onClick={() => onViewDetails(record)}>
          {t("common.viewDetails")}
        </Button>
      </div>
    </Card>
  );
}
