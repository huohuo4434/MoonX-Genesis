"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDate } from "@/lib/utils";
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

export function TodayMoonXView({
  assets,
  updatedAt,
}: {
  assets: AssetForecastSummary[];
  updatedAt: string;
}) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";

  return (
    <section id="moonx-view" className="border-t border-border/[0.06] py-12 lg:py-16">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("home.todayEyebrow")}
          title={t("home.todayTitle")}
          subtitle={t("home.todaySubtitle")}
        />
        <Text variant="caption" color="tertiary" className="mb-6 block">
          {t("horizon.lastUpdated")} {formatLocalizedDate(updatedAt, locale)}
        </Text>

        {assets.length === 0 ? (
          <Text variant="body" color="secondary">
            {t("horizon.awaitingUpdate")}
          </Text>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {assets.map((asset) => {
              const strategic = asset.layers.find((layer) => layer.horizon === "strategic");
              const tactical = asset.layers.find((layer) => layer.horizon === "tactical");
              const execution = asset.layers.find((layer) => layer.horizon === "execution");
              const isGold = asset.assetId === "gold";
              const badgeLabel =
                isGold && strategic?.directionLabelZhCN
                  ? isChinese
                    ? strategic.directionLabelZhCN
                    : (strategic.directionLabelEn ?? t(DIRECTION_KEY[asset.direction]))
                  : t(DIRECTION_KEY[asset.direction]);
              const supportFallback = strategic
                ? t("horizon.longerHorizonActive")
                : t("horizon.awaitingUpdate");
              const resistanceFallback =
                asset.assetId === "crude-oil" ? t("horizon.resistancePending") : supportFallback;

              const strategicPrefix =
                isGold && strategic?.directionLabelZhCN
                  ? `${isChinese ? strategic.directionLabelZhCN : strategic.directionLabelEn} - `
                  : "";
              const tacticalPrefix =
                isGold && tactical?.directionLabelZhCN
                  ? `${isChinese ? tactical.directionLabelZhCN : tactical.directionLabelEn} - `
                  : "";

              return (
                <Link
                  key={asset.assetId}
                  href={asset.detailHref}
                  className="group flex min-h-[220px] flex-col gap-3 rounded-lg border border-border/[0.08] bg-card p-5 transition-colors hover:border-primary/30 focus-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Text variant="body" weight="semibold">
                        {isChinese ? asset.nameZhCN : asset.nameEn}
                      </Text>
                      <Text variant="caption" color="tertiary" className="font-mono">
                        {asset.symbol}
                      </Text>
                    </div>
                    <Badge variant="outline">{badgeLabel}</Badge>
                  </div>
                  <div className="flex flex-col gap-1.5 text-body-sm text-foreground-secondary">
                    <p>
                      <span className="text-foreground-tertiary">{t("horizon.strategicTrend")}: </span>
                      {strategicPrefix}
                      {isChinese ? strategic?.summaryZhCN : strategic?.summaryEn}
                    </p>
                    <p>
                      <span className="text-foreground-tertiary">{t("horizon.weeklyRhythm")}: </span>
                      {tacticalPrefix}
                      {isChinese ? tactical?.summaryZhCN : tactical?.summaryEn}
                    </p>
                    {isGold ? (
                      <p>
                        <span className="text-foreground-tertiary">{t("horizon.shortPriceScenario")}: </span>
                        {isChinese ? execution?.confirmationZhCN : execution?.confirmation}
                        {execution?.supportLevels?.[0]
                          ? ` | ${t("horizon.support")} ${execution.supportLevels[0]}`
                          : ""}
                        {execution?.resistanceLevels?.[0]
                          ? ` | ${t("horizon.resistance")} ${execution.resistanceLevels[0]}`
                          : ""}
                      </p>
                    ) : (
                      <>
                        <p>
                          <span className="text-foreground-tertiary">{t("horizon.support")}: </span>
                          {execution?.supportLevels?.[0] ?? supportFallback}
                        </p>
                        <p>
                          <span className="text-foreground-tertiary">{t("horizon.resistance")}: </span>
                          {execution?.resistanceLevels?.[0] ?? resistanceFallback}
                        </p>
                      </>
                    )}
                    {asset.nextObservation && (
                      <p>
                        <span className="text-foreground-tertiary">{t("horizon.nextObservation")}: </span>
                        {formatLocalizedDate(asset.nextObservation, locale)}
                      </p>
                    )}
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 text-caption text-foreground-tertiary group-hover:text-primary">
                    {t("common.viewDetails")}
                    <ArrowRightIcon size={12} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
