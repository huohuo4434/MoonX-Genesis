"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ChartSkeleton } from "./ChartSkeleton";
import { ChartDisclaimer } from "./chart-disclaimer";
import { Button, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { AssetChartScenario } from "@/types/forecast-chart";

const ForecastCandlestickChart = dynamic(
  () => import("./forecast-candlestick-chart").then((mod) => mod.ForecastCandlestickChart),
  { ssr: false, loading: () => <ChartSkeleton className="h-[260px]" /> }
);

export interface BitcoinForecastPreviewProps {
  scenario: AssetChartScenario;
  /** Anchor on the full Research Intelligence chart section. */
  fullChartHref: string;
}

const PREVIEW_LEVEL_IDS = ["btc-support-64650", "btc-major-resistance-67300", "btc-target-70000"];

/**
 * Compact homepage teaser for the Bitcoin Scenario Forecast — candles,
 * forecast divider, the three headline levels, and the yellow forecast
 * path. Always shows the Base Case; the full controls live on the
 * Research Intelligence page.
 */
export function BitcoinForecastPreview({ scenario, fullChartHref }: BitcoinForecastPreviewProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const isChinese = locale === "zh-CN";
  const base = scenario.scenarios.base;

  return (
    <div className="flex flex-col gap-4">
      <ChartDisclaimer />
      <ForecastCandlestickChart
        scenario={scenario}
        scenarioId="base"
        timeframe="1D"
        toggles={{ showLevels: true, showForecastPath: true, showTurningWindows: false, showConsolidationZones: false, showTechnicalSignals: false }}
        height={260}
        compact
        visibleLevelIds={PREVIEW_LEVEL_IDS}
      />
      <Text variant="caption" color="tertiary" className="max-w-2xl normal-case tracking-normal">
        {t("chart.textSummary", {
          asset: isChinese ? scenario.assetZh ?? scenario.asset : scenario.asset,
          symbol: scenario.symbol,
          scenario: t("chart.baseCase"),
          summary: isChinese ? base.summaryZh ?? base.summary : base.summary,
          support: isChinese ? scenario.mainSupportZh ?? scenario.mainSupport : scenario.mainSupport,
          resistance: isChinese ? scenario.mainResistanceZh ?? scenario.mainResistance : scenario.mainResistance,
          invalidation: isChinese ? scenario.invalidationLevelZh ?? scenario.invalidationLevel : scenario.invalidationLevel,
          start: scenario.forecastWindow.start,
          end: scenario.forecastWindow.end,
        })}
      </Text>
      <Button asChild variant="primary" size="md" className="self-start">
        <Link href={fullChartHref}>
          {t("ui.viewFullScenario")}
          <ArrowRightIcon size={14} />
        </Link>
      </Button>
    </div>
  );
}
