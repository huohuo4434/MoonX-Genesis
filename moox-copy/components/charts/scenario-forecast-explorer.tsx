"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChartSkeleton } from "./ChartSkeleton";
import { ForecastChartToolbar, type AssetOption } from "./forecast-chart-toolbar";
import { ForecastLevelsPanel } from "./forecast-levels-panel";
import { ForecastExplanation } from "./forecast-explanation";
import { ChartDisclaimer } from "./chart-disclaimer";
import { Card, Heading, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { AssetChartScenario, ChartTimeframe, ForecastChartToggles, ForecastScenarioId } from "@/types/forecast-chart";

const ForecastCandlestickChart = dynamic(
  () => import("./forecast-candlestick-chart").then((mod) => mod.ForecastCandlestickChart),
  { ssr: false, loading: () => <ChartSkeleton className="h-[420px]" /> }
);

export interface ScenarioForecastExplorerProps {
  scenarios: AssetChartScenario[];
  verificationStatusLabel: string;
  defaultAssetId?: string;
  className?: string;
}

const DEFAULT_TOGGLES: ForecastChartToggles = {
  showLevels: true,
  showForecastPath: true,
  showTurningWindows: true,
  showConsolidationZones: true,
  showTechnicalSignals: false,
};

/**
 * The full MoonX Scenario Forecast System: asset/scenario/timeframe/toggle
 * controls, the TradingView-style chart, the levels info panel, and the
 * "Why this path?" explanation — everything wired to curated scenario data.
 */
export function ScenarioForecastExplorer({
  scenarios,
  verificationStatusLabel,
  defaultAssetId,
  className,
}: ScenarioForecastExplorerProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const isChinese = locale === "zh-CN";
  const [assetId, setAssetId] = useState(defaultAssetId ?? scenarios[0]?.id ?? "");
  const [scenarioId, setScenarioId] = useState<ForecastScenarioId>("base");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1D");
  const [toggles, setToggles] = useState<ForecastChartToggles>(DEFAULT_TOGGLES);
  const [resetToken, setResetToken] = useState(0);

  const scenario = useMemo(() => scenarios.find((s) => s.id === assetId) ?? scenarios[0], [scenarios, assetId]);

  const assetOptions: AssetOption[] = useMemo(
    () => scenarios.map((s) => ({ id: s.id, label: `${isChinese ? s.assetZh ?? s.asset : s.asset} (${s.symbol})` })),
    [isChinese, scenarios]
  );

  if (!scenario) return null;

  const scenarioWeights = {
    base: scenario.scenarios.base.scenarioWeight,
    bull: scenario.scenarios.bull.scenarioWeight,
    bear: scenario.scenarios.bear.scenarioWeight,
  };
  const scenarioOptions = [
    { id: "base" as const, label: t("chart.baseCase") },
    { id: "bull" as const, label: t("chart.bullCase") },
    { id: "bear" as const, label: t("chart.bearCase") },
  ];
  const activePath = scenario.scenarios[scenarioId];
  const textSummary = t("chart.textSummary", {
    asset: isChinese ? scenario.assetZh ?? scenario.asset : scenario.asset,
    symbol: scenario.symbol,
    scenario: scenarioOptions.find((option) => option.id === scenarioId)?.label ?? activePath.label,
    summary: isChinese ? activePath.summaryZh ?? activePath.summary : activePath.summary,
    support: isChinese ? scenario.mainSupportZh ?? scenario.mainSupport : scenario.mainSupport,
    resistance: isChinese ? scenario.mainResistanceZh ?? scenario.mainResistance : scenario.mainResistance,
    invalidation: isChinese ? scenario.invalidationLevelZh ?? scenario.invalidationLevel : scenario.invalidationLevel,
    start: scenario.forecastWindow.start,
    end: scenario.forecastWindow.end,
  });

  return (
    <div className={className}>
      <div className="mb-6 flex flex-col gap-3">
        <Heading as="h3" size="h3">
          {isChinese ? scenario.chartTitleZh ?? scenario.chartTitle : scenario.chartTitle}
        </Heading>
        <ChartDisclaimer />
      </div>

      <ForecastChartToolbar
        assets={assetOptions}
        assetId={assetId}
        onAssetChange={(id) => setAssetId(id)}
        scenarioOptions={scenarioOptions}
        scenarioId={scenarioId}
        onScenarioChange={setScenarioId}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        toggles={toggles}
        onToggleChange={(key, value) => setToggles((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setResetToken((n) => n + 1)}
        className="mb-6"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card padding="lg" className="overflow-hidden">
          <ForecastCandlestickChart
            scenario={scenario}
            scenarioId={scenarioId}
            timeframe={timeframe}
            toggles={toggles}
            height={440}
            resetToken={resetToken}
          />
        </Card>
        <ForecastLevelsPanel
          currentView={isChinese ? scenario.currentViewZh ?? scenario.currentView : scenario.currentView}
          forecastWindow={scenario.forecastWindow}
          scenarioWeights={scenarioWeights}
          mainSupport={isChinese ? scenario.mainSupportZh ?? scenario.mainSupport : scenario.mainSupport}
          mainResistance={isChinese ? scenario.mainResistanceZh ?? scenario.mainResistance : scenario.mainResistance}
          invalidationLevel={isChinese ? scenario.invalidationLevelZh ?? scenario.invalidationLevel : scenario.invalidationLevel}
          nextTurningWindow={isChinese ? scenario.nextTurningWindowZh ?? scenario.nextTurningWindow : scenario.nextTurningWindow}
          verificationStatusLabel={verificationStatusLabel}
        />
      </div>

      <Text variant="caption" color="tertiary" className="mt-4 max-w-3xl normal-case tracking-normal">
        <span className="font-medium text-foreground-secondary">{t("chart.textSummaryLabel")}</span>
        {textSummary}
      </Text>

      <ForecastExplanation scenario={scenario} className="mt-6" />
    </div>
  );
}
