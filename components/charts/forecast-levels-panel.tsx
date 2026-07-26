import { Badge, Card, Progress, Text } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import type { ForecastScenarioId } from "@/types/forecast-chart";

export interface ForecastLevelsPanelProps {
  currentView: string;
  forecastWindow: { start: string; end: string };
  scenarioWeights: Record<ForecastScenarioId, number>;
  activeScenarioId: ForecastScenarioId;
  mainSupport: string;
  mainResistance: string;
  invalidationLevel: string;
  nextTurningWindow: string;
  verificationStatusLabel: string;
  className?: string;
}

const scenarioLabels: Record<ForecastScenarioId, string> = { base: "Base Case", bull: "Bull Case", bear: "Bear Case" };

/**
 * Compact information panel shown beside/below the Scenario Forecast chart.
 * "Scenario Weight" is deliberately not called a probability — see
 * `lib/data/forecast-chart-scenarios.ts` for how the numbers are derived.
 */
export function ForecastLevelsPanel({
  currentView,
  forecastWindow,
  scenarioWeights,
  activeScenarioId,
  mainSupport,
  mainResistance,
  invalidationLevel,
  nextTurningWindow,
  verificationStatusLabel,
  className,
}: ForecastLevelsPanelProps) {
  return (
    <Card padding="lg" className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-1">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          Current MoonX View
        </Text>
        <Text variant="body-sm" weight="medium" className="text-foreground">
          {currentView}
        </Text>
      </div>

      <div className="flex items-center justify-between border-y border-border/[0.08] py-3">
        <Text variant="caption" color="tertiary">
          Forecast Window
        </Text>
        <Text variant="caption" className="font-mono text-foreground-secondary">
          {formatDate(forecastWindow.start)} – {formatDate(forecastWindow.end)}
        </Text>
      </div>

      <div className="flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          Scenario Weight
        </Text>
        {(Object.keys(scenarioWeights) as ForecastScenarioId[]).map((id) => (
          <Progress
            key={id}
            label={`${scenarioLabels[id]}${id === activeScenarioId ? " (viewing)" : ""}`}
            value={scenarioWeights[id]}
          />
        ))}
        <Text variant="caption" color="tertiary">
          Curated weighting derived from MoonX Intelligence Snapshot scores — not a statistical probability.
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border/[0.08] pt-4">
        <div className="flex flex-col gap-1">
          <Text variant="caption" color="tertiary">
            Main Support
          </Text>
          <Text variant="body-sm" className="font-mono text-success">
            {mainSupport}
          </Text>
        </div>
        <div className="flex flex-col gap-1">
          <Text variant="caption" color="tertiary">
            Main Resistance
          </Text>
          <Text variant="body-sm" className="font-mono text-danger">
            {mainResistance}
          </Text>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Text variant="caption" color="tertiary">
            Invalidation Level
          </Text>
          <Text variant="body-sm" className="font-mono text-warning">
            {invalidationLevel}
          </Text>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Text variant="caption" color="tertiary">
            Next Turning Window
          </Text>
          <Text variant="body-sm" className="text-foreground-secondary">
            {nextTurningWindow}
          </Text>
        </div>
      </div>

      <div className="border-t border-border/[0.08] pt-4">
        <Badge variant="warning">{verificationStatusLabel}</Badge>
      </div>
    </Card>
  );
}
