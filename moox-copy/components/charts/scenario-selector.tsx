"use client";

import { cn } from "@/lib/utils";
import type { ForecastScenarioId } from "@/types/forecast-chart";

export interface ScenarioOption {
  id: ForecastScenarioId;
  label: string;
}

export interface ScenarioSelectorProps {
  value: ForecastScenarioId;
  onChange: (id: ForecastScenarioId) => void;
  options: ScenarioOption[];
  className?: string;
}

const scenarioAccent: Record<ForecastScenarioId, string> = {
  base: "data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:border-primary/30",
  bull: "data-[active=true]:bg-success/15 data-[active=true]:text-success data-[active=true]:border-success/30",
  bear: "data-[active=true]:bg-danger/15 data-[active=true]:text-danger data-[active=true]:border-danger/30",
};

/** Base / Bull / Bear Case tab control. Keyboard accessible via native `<button>` focus order. */
export function ScenarioSelector({ value, onChange, options, className }: ScenarioSelectorProps) {
  return (
    <div role="tablist" aria-label="Scenario" className={cn("inline-flex items-center gap-1 rounded-md border border-border/[0.1] bg-surface p-1", className)}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          data-active={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-sm border border-transparent px-3 py-1.5 text-body-sm font-medium text-foreground-secondary transition-colors focus-ring hover:text-foreground",
            scenarioAccent[option.id]
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
