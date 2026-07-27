"use client";

import { RefreshIcon } from "@/components/icons";
import { ScenarioSelector, type ScenarioOption } from "./scenario-selector";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Text } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/LocaleProvider";
import type { ChartTimeframe, ForecastChartToggles, ForecastScenarioId } from "@/types/forecast-chart";

export interface AssetOption {
  id: string;
  label: string;
}

const TIMEFRAMES: ChartTimeframe[] = ["4H", "1D", "1W"];

const TOGGLE_CONFIG: { key: keyof ForecastChartToggles; labelKey: string }[] = [
  { key: "showLevels", labelKey: "chart.showSupportResistance" },
  { key: "showForecastPath", labelKey: "chart.showForecastPath" },
  { key: "showTurningWindows", labelKey: "chart.showTurningWindows" },
  { key: "showConsolidationZones", labelKey: "chart.showConsolidationZones" },
];

export interface ForecastChartToolbarProps {
  assets: AssetOption[];
  assetId: string;
  onAssetChange: (id: string) => void;
  scenarioOptions: ScenarioOption[];
  scenarioId: ForecastScenarioId;
  onScenarioChange: (id: ForecastScenarioId) => void;
  timeframe: ChartTimeframe;
  onTimeframeChange: (timeframe: ChartTimeframe) => void;
  toggles: ForecastChartToggles;
  onToggleChange: (key: keyof ForecastChartToggles, value: boolean) => void;
  onReset: () => void;
  hasTechnicalSignals?: boolean;
  className?: string;
}

/** Full control surface for the Scenario Forecast chart — asset/scenario/timeframe/toggles/reset. */
export function ForecastChartToolbar({
  assets,
  assetId,
  onAssetChange,
  scenarioOptions,
  scenarioId,
  onScenarioChange,
  timeframe,
  onTimeframeChange,
  toggles,
  onToggleChange,
  onReset,
  hasTechnicalSignals = false,
  className,
}: ForecastChartToolbarProps) {
  const t = useTranslations();
  const toggleConfig = hasTechnicalSignals
    ? [...TOGGLE_CONFIG, { key: "showTechnicalSignals" as const, labelKey: "technical.showTechnicalSignals" }]
    : TOGGLE_CONFIG;
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={assetId} onValueChange={onAssetChange}>
          <SelectTrigger className="w-[220px]" aria-label={t("chart.asset")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ScenarioSelector value={scenarioId} onChange={onScenarioChange} options={scenarioOptions} />

        <div role="group" aria-label={t("chart.timeframe1d")} className="inline-flex items-center gap-1 rounded-md border border-border/[0.1] bg-surface p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              aria-pressed={timeframe === tf}
              onClick={() => onTimeframeChange(tf)}
              className={cn(
                "rounded-sm px-2.5 py-1.5 text-caption font-mono font-medium text-foreground-secondary transition-colors focus-ring hover:text-foreground",
                timeframe === tf && "bg-muted text-foreground"
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onReset} className="ml-auto">
          <RefreshIcon size={14} />
          {t("common.resetView")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {toggleConfig.map(({ key, labelKey }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2">
            <Switch
              checked={toggles[key]}
              onCheckedChange={(checked) => onToggleChange(key, checked)}
              aria-label={t(labelKey)}
            />
            <Text variant="body-sm" color="secondary">
              {t(labelKey)}
            </Text>
          </label>
        ))}
      </div>
    </div>
  );
}
