"use client";

import { BitcoinForecastPreview } from "@/components/charts";
import { Heading, Text } from "@/components/ui";
import { useTranslations } from "@/lib/i18n/LocaleProvider";
import type { AssetChartScenario } from "@/types/forecast-chart";

export function BitcoinForecastPathClient({ scenario }: { scenario: AssetChartScenario }) {
  const t = useTranslations();

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">{t("ui.scenarioForecastSystem")}</Text>
        <Heading as="h2" size="h2" className="max-w-2xl">{t("ui.bitcoinForecastPath")}</Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">{t("ui.bitcoinForecastDescription")}</Text>
      </div>
      <BitcoinForecastPreview scenario={scenario} fullChartHref="/research/intelligence-snapshot#moonx-scenario-charts" />
    </>
  );
}
