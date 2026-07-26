"use client";

import { Badge, DialogDescription, DialogHeader, DialogTitle, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { directionBadgeVariant, statusBadgeVariant } from "@/lib/research/research-utils";
import { formatDate } from "@/lib/utils";
import type { ResearchRecord } from "@/types/research";

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <Text variant="label" color="tertiary" className="uppercase tracking-wide">
        {title}
      </Text>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-body-sm text-foreground-secondary">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground-tertiary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NumberList({ title, values }: { title: string; values?: number[] }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <Text variant="label" color="tertiary" className="uppercase tracking-wide">
        {title}
      </Text>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant="outline" className="font-mono">
            {value.toLocaleString("en-US")}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ResearchRecordDetail({ record }: { record: ResearchRecord }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto pr-1">
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={directionBadgeVariant(record.direction)}>{t(`directions.${record.direction}`)}</Badge>
          <Badge variant={statusBadgeVariant(record.status)}>{t(`status.${record.status}`)}</Badge>
          <Badge variant="outline">{t(`framework.${record.framework}`)}</Badge>
        </div>
        <DialogTitle>{pickLocalized(record.title, locale)}</DialogTitle>
        <DialogDescription>
          {pickLocalized(record.assetName, locale)}
          {record.symbol ? ` · ${record.symbol}` : ""} · {pickLocalized(record.publicSourceLabel, locale)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-foreground-tertiary">
        <span>{t("researchLibrary.publishedOn", { date: formatDate(record.publishedAt) })}</span>
        {record.forecastStart && record.forecastEnd && (
          <span>
            {t("researchLibrary.forecastWindowLabel", {
              start: formatDate(record.forecastStart),
              end: formatDate(record.forecastEnd),
            })}
          </span>
        )}
        <span>{t(`market.${record.market}`)}</span>
        <span>{t(`sourceType.${record.sourceType}`)}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Text variant="label" color="tertiary" className="uppercase tracking-wide">
          {t("researchLibrary.summary")}
        </Text>
        <Text variant="body-sm" color="secondary">
          {pickLocalized(record.summary, locale)}
        </Text>
      </div>

      <DetailList title={t("researchLibrary.thesis")} items={record.thesis.map((item) => pickLocalized(item, locale))} />
      {record.catalysts && (
        <DetailList title={t("researchLibrary.catalysts")} items={record.catalysts.map((item) => pickLocalized(item, locale))} />
      )}
      {record.risks && <DetailList title={t("researchLibrary.risks")} items={record.risks.map((item) => pickLocalized(item, locale))} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <NumberList title={t("researchLibrary.supports")} values={record.supports} />
        <NumberList title={t("researchLibrary.resistances")} values={record.resistances} />
        <NumberList title={t("researchLibrary.targets")} values={record.targets} />
      </div>

      {record.invalidation && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.invalidation")}
          </Text>
          <Text variant="body-sm" color="secondary">
            {pickLocalized(record.invalidation, locale)}
          </Text>
        </div>
      )}

      {record.turningWindows && record.turningWindows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.turningWindows")}
          </Text>
          <ul className="flex flex-col gap-1.5">
            {record.turningWindows.map((window_) => (
              <li key={window_.id} className="flex flex-col gap-0.5 rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
                <Text variant="caption" weight="medium" className="text-foreground">
                  {pickLocalized(window_.label, locale)}
                </Text>
                <Text variant="caption" color="tertiary" className="font-mono">
                  {window_.date ? formatDate(window_.date) : `${formatDate(window_.start ?? "")} – ${formatDate(window_.end ?? "")}`}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.verificationChecklist && record.verificationChecklist.length > 0 && (
        <DetailList
          title={t("researchLibrary.verificationChecklist")}
          items={record.verificationChecklist.map((item) => pickLocalized(item, locale))}
        />
      )}
    </div>
  );
}
