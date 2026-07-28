"use client";

import Link from "next/link";
import { Badge, Button, Card, Progress, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { directionBadgeVariant, researchStatusLabelKey } from "@/lib/research/research-utils";
import { formatLocalizedDate } from "@/lib/utils";
import type { ResearchRecord } from "@/types/research";

export interface ResearchRecordCardProps {
  record: ResearchRecord;
  onViewDetails?: (record: ResearchRecord) => void;
}

export function ResearchRecordCard({ record, onViewDetails }: ResearchRecordCardProps) {
  const { locale } = useLocale();
  const t = useTranslations();
  const verification = record.verificationResult;
  const showVerificationExtras = record.status === "verified" && verification;

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
          {record.ratingDisplay
            ? pickLocalized(record.ratingDisplay, locale)
            : t(`directions.${record.direction}`)}
        </Badge>
      </div>

      {record.forecastStart && record.forecastEnd && (
        <Text variant="caption" color="tertiary">
          {t("researchLibrary.forecastWindowLabel", {
            start: formatLocalizedDate(record.forecastStart, locale),
            end: formatLocalizedDate(record.forecastEnd, locale),
          })}
        </Text>
      )}

      <Text variant="body-sm" color="secondary" className="line-clamp-3">
        {pickLocalized(record.summary, locale)}
      </Text>

      {showVerificationExtras && (
        <div className="flex flex-col gap-1">
          {typeof verification.actualChangePct === "number" && (
            <Text variant="caption" color="secondary">
              {t("researchLibrary.actualChange")}: {verification.actualChangePct > 0 ? "+" : ""}
              {verification.actualChangePct}%
            </Text>
          )}
          <Text variant="caption" color="tertiary">
            {verification.scoreEligible === false
              ? t("researchLibrary.scoreNotEligible")
              : verification.conclusion
                ? pickLocalized(verification.conclusion, locale)
                : t("researchLibrary.verificationConclusion")}
          </Text>
        </div>
      )}

      {record.direction !== "insufficient-evidence" && record.editorialConfidence > 0 && (
        <>
          <Progress value={record.editorialConfidence} label={`${t("researchLibrary.editorialConfidence")}：${record.editorialConfidence}%`} />
          <Text variant="caption" color="tertiary">
            {t("researchLibrary.editorialConfidenceNote")}
          </Text>
        </>
      )}

      <div className="mt-1 flex items-center justify-between gap-2">
        <Badge variant="outline">{t(researchStatusLabelKey(record.status))}</Badge>
        {onViewDetails ? (
          <Button variant="ghost" size="sm" onClick={() => onViewDetails(record)}>
            {t("common.viewDetails")}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/research/record/${record.id}`}>{t("common.viewDetails")}</Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
