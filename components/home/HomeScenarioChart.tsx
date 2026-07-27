"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Button, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { AssetChartScenario } from "@/types/forecast-chart";

const ForecastCandlestickChart = dynamic(
  () => import("@/components/charts/forecast-candlestick-chart").then((mod) => mod.ForecastCandlestickChart),
  { ssr: false, loading: () => <ChartSkeleton className="h-[400px]" /> }
);

const PREVIEW_LEVEL_IDS = ["btc-support-64650", "btc-major-resistance-67300", "btc-target-70000"];

export function HomeScenarioChart({ scenario }: { scenario: AssetChartScenario | null }) {
  const t = useTranslations();
  const { locale } = useLocale();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";

  return (
    <section id="scenario-chart" className="border-t border-border/[0.06] py-12 lg:py-16">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("home.chartEyebrow")}
          title={t("home.chartTitle")}
          subtitle={t("home.chartSubtitle")}
        />
        {!scenario ? (
          <Text variant="body" color="secondary">{t("horizon.awaitingUpdate")}</Text>
        ) : (
          <div className="flex flex-col gap-4">
            <ForecastCandlestickChart
              scenario={scenario}
              scenarioId="base"
              timeframe="1D"
              toggles={{
                showLevels: true,
                showForecastPath: true,
                showTurningWindows: false,
                showConsolidationZones: false,
                showTechnicalSignals: false,
              }}
              height={400}
              compact
              visibleLevelIds={PREVIEW_LEVEL_IDS}
            />
            <div className="grid gap-2 text-body-sm text-foreground-secondary sm:grid-cols-3">
              <p>
                {t("horizon.support")}:{" "}
                {isChinese ? scenario.mainSupportZh ?? scenario.mainSupport : scenario.mainSupport}
              </p>
              <p>
                {t("horizon.resistance")}:{" "}
                {isChinese ? scenario.mainResistanceZh ?? scenario.mainResistance : scenario.mainResistance}
              </p>
              <p>
                {t("horizon.invalidation")}:{" "}
                {isChinese ? scenario.invalidationLevelZh ?? scenario.invalidationLevel : scenario.invalidationLevel}
              </p>
            </div>
            <Text variant="caption" color="tertiary">
              {t("home.chartDisclaimer")}
            </Text>
            <Button asChild variant="outline" size="sm" className="self-start">
              <Link href="/research/intelligence-snapshot#moonx-scenario-charts">
                {t("ui.viewFullScenario")}
                <ArrowRightIcon size={14} />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
