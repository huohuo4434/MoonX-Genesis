"use client";

import { RefreshIcon } from "@/components/icons";
import { ScenarioSelector, type ScenarioOption } from "./scenario-selector";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Text } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ChartTimeframe, ForecastChartToggles, ForecastScenarioId } from "@/types/forecast-chart";

export interface AssetOption {
  id: string;
  label: string;
}

const TIMEFRAMES: ChartTimeframe[] = ["4H", "1D", "1W"];

const TOGGLE_CONFIG: { key: keyof ForecastChartToggles; label: string }[] = [
  { key: "showLevels", label: "Support & Resistance" },
  { key: "showForecastPath", label: "Forecast Path" },
  { key: "showTurningWindows", label: "Turning Windows" },
  { key: "showConsolidationZones", label: "Consolidation Zones" },
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
  className,
}: ForecastChartToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={assetId} onValueChange={onAssetChange}>
          <SelectTrigger className="w-[220px]" aria-label="Asset">
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

        <div role="group" aria-label="Timeframe" className="inline-flex items-center gap-1 rounded-md border border-border/[0.1] bg-surface p-1">
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
          Reset View
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {TOGGLE_CONFIG.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2">
            <Switch
              checked={toggles[key]}
              onCheckedChange={(checked) => onToggleChange(key, checked)}
              aria-label={label}
            />
            <Text variant="body-sm" color="secondary">
              {label}
            </Text>
          </label>
        ))}
      </div>
    </div>
  );
}
