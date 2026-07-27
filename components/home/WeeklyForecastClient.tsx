"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Card, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { WeeklyEdition } from "@/lib/data/weekly-edition";

export function WeeklyForecastClient({ edition }: { edition: WeeklyEdition }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";

  return (
    <section id="weekly-forecast" className="border-t border-border/[0.06] py-12 lg:py-16">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("home.weeklyEyebrow")}
          title={t("home.weeklyTitle")}
          subtitle={t("home.weeklySubtitle")}
        />
        <Text variant="caption" color="tertiary" className="mb-5 block">
          {edition.periodStart} → {edition.periodEnd}
        </Text>

        {edition.cards.length === 0 ? (
          <Card padding="lg">
            <Text variant="body" weight="semibold">
              {t("home.weeklyEmpty")}
            </Text>
          </Card>
        ) : (
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            {edition.cards.map((card) => {
              const summary = isChinese ? card.record.summary.zhCN : card.record.summary.en;
              const parentSummary = card.parentRecord
                ? isChinese
                  ? card.parentRecord.summary.zhCN
                  : card.parentRecord.summary.en
                : null;
              return (
                <Card key={card.assetId} padding="lg" className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Text variant="body" weight="semibold">
                        {isChinese ? card.nameZhCN : card.nameEn}
                      </Text>
                      <Text variant="caption" color="tertiary" className="font-mono">
                        {card.symbol}
                      </Text>
                    </div>
                    <Badge variant="outline">
                      {isChinese ? card.sourceArchiveLabelZhCN : card.sourceArchiveLabelEn}
                    </Badge>
                  </div>
                  <Text variant="body-sm" color="secondary">
                    {summary}
                  </Text>
                  {parentSummary && (
                    <Text variant="caption" color="tertiary">
                      {isChinese ? "更大周期：" : "Higher horizon: "}
                      {parentSummary.slice(0, 120)}
                      {parentSummary.length > 120 ? "…" : ""}
                    </Text>
                  )}
                  {card.technicalRecord && (
                    <Text variant="caption" color="tertiary">
                      {isChinese ? "技术验证：" : "Technical watch: "}
                      {(isChinese
                        ? card.technicalRecord.summary.zhCN
                        : card.technicalRecord.summary.en
                      ).slice(0, 100)}
                      …
                    </Text>
                  )}
                  <Text variant="caption" color="tertiary">
                    {isChinese ? "验证中" : "Verification in progress"}
                  </Text>
                </Card>
              );
            })}
          </div>
        )}

        <Text variant="caption" color="tertiary" className="mb-3 block">
          {isChinese ? edition.dayUncertaintyNoteZhCN : edition.dayUncertaintyNoteEn}
        </Text>

        {(() => {
          const rhythmCard =
            edition.cards.find((card) => card.assetId === "gold") ?? edition.cards[0];
          if (!rhythmCard) return null;
          return (
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {rhythmCard.daySlots.map((day) => (
              <div key={day.key} className="rounded-lg border border-border/[0.06] bg-card/60 px-3 py-4">
                <Text variant="caption" color="tertiary">
                  {t(`home.week.${day.key}`)}
                  {rhythmCard.assetId === "gold" ? (isChinese ? " · 黄金" : " · Gold") : ""}
                </Text>
                <Text variant="body-sm" weight="semibold" className="mt-2">
                  {isChinese ? day.rhythmZhCN : day.rhythmEn}
                </Text>
                <Text variant="caption" color="secondary" className="mt-1">
                  {isChinese ? day.directionLabelZhCN : day.directionLabelEn}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 line-clamp-3">
                  {isChinese ? day.conditionZhCN : day.conditionEn}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-2">
                  {day.revised
                    ? isChinese
                      ? "已修正"
                      : "Revised"
                    : isChinese
                      ? "未修正"
                      : "Not revised"}
                </Text>
              </div>
            ))}
          </div>
          );
        })()}

        <Link
          href="/forecasts"
          className="mt-5 inline-flex text-body-sm text-foreground-secondary hover:text-primary focus-ring"
        >
          {isChinese ? "查看本周预测详情" : "View weekly forecast details"}
        </Link>
      </div>
    </section>
  );
}
