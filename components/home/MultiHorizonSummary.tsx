"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Card, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDateRange } from "@/lib/utils";
import type { AssetForecastSummary, ForecastDirection } from "@/types/forecast-horizon";

const DIRECTION_KEY: Record<ForecastDirection, string> = {
  strong_bullish: "horizon.strongBullish",
  bullish: "horizon.bullish",
  slightly_bullish: "horizon.slightlyBullish",
  neutral: "horizon.neutral",
  slightly_bearish: "horizon.slightlyBearish",
  bearish: "horizon.bearish",
  strong_bearish: "horizon.strongBearish",
  pending: "horizon.pending",
};

const CONFIDENCE_KEY = {
  low: "horizon.confidenceLow",
  medium: "horizon.confidenceMedium",
  high: "horizon.confidenceHigh",
} as const;

type HorizonOutlookCard = {
  titleZhCN: string;
  titleEn: string;
  summaryZhCN: string;
  summaryEn: string;
  noteZhCN: string;
  noteEn: string;
};

export function MultiHorizonSummary({
  assets,
  bitcoinAnnualOutlook,
  bitcoinAnnualRiskNote,
  usEquityAnnualOutlook,
}: {
  assets: AssetForecastSummary[];
  bitcoinAnnualOutlook?: HorizonOutlookCard;
  bitcoinAnnualRiskNote?: HorizonOutlookCard;
  usEquityAnnualOutlook?: HorizonOutlookCard;
}) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";
  const [selectedId, setSelectedId] = useState(assets[0]?.assetId ?? "");
  const selected = assets.find((asset) => asset.assetId === selectedId) ?? assets[0];

  if (!selected) {
    return (
      <section className="border-t border-border/[0.06] py-12 lg:py-16">
        <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
          <SectionHeader title={t("home.multiHorizonTitle")} subtitle={t("home.multiHorizonSubtitle")} />
          <Text variant="body" color="secondary">{t("horizon.awaitingUpdate")}</Text>
        </div>
      </section>
    );
  }

  const strategic = selected.layers.find((layer) => layer.horizon === "strategic");
  const tactical = selected.layers.find((layer) => layer.horizon === "tactical");
  const execution = selected.layers.find((layer) => layer.horizon === "execution");
  const showBtcAnnual = selected.assetId === "bitcoin" && bitcoinAnnualOutlook;
  const showBtcRisk = selected.assetId === "bitcoin" && bitcoinAnnualRiskNote;
  const showUsAnnual = selected.assetId === "nasdaq-100" && usEquityAnnualOutlook;

  return (
    <section id="multi-horizon" className="border-t border-border/[0.06] py-12 lg:py-16">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("home.multiHorizonEyebrow")}
          title={t("home.multiHorizonTitle")}
          subtitle={t("home.multiHorizonSubtitle")}
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {assets.map((asset) => (
            <button
              key={asset.assetId}
              type="button"
              onClick={() => setSelectedId(asset.assetId)}
              className={`rounded-md px-3 py-1.5 text-body-sm transition-colors focus-ring ${
                selected.assetId === asset.assetId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground-secondary hover:text-foreground"
              }`}
            >
              {isChinese ? asset.nameZhCN : asset.nameEn}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card padding="lg" className="flex flex-col gap-3">
            <Text variant="label" color="secondary">{t("horizon.strategic")}</Text>
            <Text variant="body" weight="semibold">
              {isChinese
                ? strategic?.directionLabelZhCN ?? t(DIRECTION_KEY[strategic?.direction ?? "pending"])
                : strategic?.directionLabelEn ?? t(DIRECTION_KEY[strategic?.direction ?? "pending"])}
            </Text>
            <Text variant="caption" color="tertiary">
              {strategic?.periodStart
                ? formatLocalizedDateRange(strategic.periodStart, strategic.periodEnd, locale)
                : t("horizon.awaitingUpdate")}
            </Text>
            <Text variant="body-sm" color="secondary">
              {isChinese ? strategic?.summaryZhCN : strategic?.summaryEn}
            </Text>
            {strategic?.confidenceLabel && (
              <Text variant="caption" color="tertiary">
                {t("horizon.confidence")}: {t(CONFIDENCE_KEY[strategic.confidenceLabel])}
              </Text>
            )}
          </Card>

          <Card padding="lg" className="flex flex-col gap-3">
            <Text variant="label" color="secondary">{t("horizon.tactical")}</Text>
            <Text variant="body" weight="semibold">
              {isChinese
                ? tactical?.directionLabelZhCN ?? t(DIRECTION_KEY[tactical?.direction ?? "pending"])
                : tactical?.directionLabelEn ?? t(DIRECTION_KEY[tactical?.direction ?? "pending"])}
            </Text>
            <Text variant="body-sm" color="secondary">
              {isChinese ? tactical?.summaryZhCN : tactical?.summaryEn}
            </Text>
            {tactical?.periodStart && (
              <Text variant="caption" color="tertiary">
                {formatLocalizedDateRange(tactical.periodStart, tactical.periodEnd, locale)}
              </Text>
            )}
            {tactical?.keyDates?.[0] && (
              <Text variant="caption" color="tertiary">
                {t("horizon.keyWindow")}: {formatLocalizedDateRange(tactical.keyDates[0], tactical.keyDates[0], locale)}
              </Text>
            )}
            <Text variant="caption" color="tertiary">{t("horizon.conditionsToVerify")}</Text>
          </Card>

          <Card padding="lg" className="flex flex-col gap-3">
            <Text variant="label" color="secondary">
              {selected.assetId === "gold" ? t("horizon.shortPriceScenario") : t("horizon.execution")}
            </Text>
            {selected.assetId === "gold" && (
              <Text variant="body-sm" color="secondary">
                {isChinese ? execution?.summaryZhCN : execution?.summaryEn}
              </Text>
            )}
            <Text variant="body-sm" color="secondary">
              {t("horizon.support")}: {execution?.supportLevels?.join(" / ") || t("horizon.awaitingUpdate")}
            </Text>
            <Text variant="body-sm" color="secondary">
              {t("horizon.resistance")}: {execution?.resistanceLevels?.join(" / ") || t("horizon.awaitingUpdate")}
            </Text>
            <Text variant="body-sm" color="secondary">
              {t("horizon.confirmation")}:{" "}
              {(isChinese ? execution?.confirmationZhCN : execution?.confirmation) || t("horizon.awaitingUpdate")}
            </Text>
            <Text variant="body-sm" color="secondary">
              {t("horizon.invalidation")}:{" "}
              {(isChinese ? execution?.invalidationZhCN : execution?.invalidation) || t("horizon.awaitingUpdate")}
            </Text>
            <Text variant="caption" color="tertiary">{t("horizon.executionNote")}</Text>
          </Card>
        </div>

        {showBtcAnnual && bitcoinAnnualOutlook && (
          <Card padding="lg" className="mt-4 flex flex-col gap-2">
            <Text variant="label" color="secondary">
              {isChinese ? bitcoinAnnualOutlook.titleZhCN : bitcoinAnnualOutlook.titleEn}
            </Text>
            <Text variant="body-sm" color="secondary">
              {isChinese ? bitcoinAnnualOutlook.summaryZhCN : bitcoinAnnualOutlook.summaryEn}
            </Text>
            <Text variant="caption" color="tertiary">
              {isChinese ? bitcoinAnnualOutlook.noteZhCN : bitcoinAnnualOutlook.noteEn}
            </Text>
          </Card>
        )}

        {showBtcRisk && bitcoinAnnualRiskNote && (
          <Card padding="lg" className="mt-4 flex flex-col gap-2">
            <Text variant="label" color="secondary">
              {isChinese ? bitcoinAnnualRiskNote.titleZhCN : bitcoinAnnualRiskNote.titleEn}
            </Text>
            <Text variant="body-sm" color="secondary">
              {isChinese ? bitcoinAnnualRiskNote.summaryZhCN : bitcoinAnnualRiskNote.summaryEn}
            </Text>
            <Text variant="caption" color="tertiary">
              {isChinese ? bitcoinAnnualRiskNote.noteZhCN : bitcoinAnnualRiskNote.noteEn}
            </Text>
          </Card>
        )}

        {showUsAnnual && usEquityAnnualOutlook && (
          <Card padding="lg" className="mt-4 flex flex-col gap-2">
            <Text variant="label" color="secondary">
              {isChinese ? usEquityAnnualOutlook.titleZhCN : usEquityAnnualOutlook.titleEn}
            </Text>
            <Text variant="body-sm" color="secondary">
              {isChinese ? usEquityAnnualOutlook.summaryZhCN : usEquityAnnualOutlook.summaryEn}
            </Text>
            <Text variant="caption" color="tertiary">
              {isChinese ? usEquityAnnualOutlook.noteZhCN : usEquityAnnualOutlook.noteEn}
            </Text>
          </Card>
        )}
      </div>
    </section>
  );
}
