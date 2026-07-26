/**
 * Scenario Forecast chart data accessor.
 *
 * All chart numbers now come from `content/moonx/latest.json` via
 * `loadMoonXResearch()` — this module no longer hard-codes asset data.
 */
import "server-only";

import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import { toAssetChartScenario } from "@/lib/moonx/adapters";
import type { AssetChartScenario } from "@/types/forecast-chart";

export async function listForecastChartScenarios(): Promise<AssetChartScenario[]> {
  const doc = await loadMoonXResearchAsync();
  return doc.assets
    .map((asset) => toAssetChartScenario(asset))
    .filter((scenario): scenario is AssetChartScenario => scenario !== undefined);
}

export async function getForecastChartScenario(id: string): Promise<AssetChartScenario | undefined> {
  const scenarios = await listForecastChartScenarios();
  return scenarios.find((scenario) => scenario.id === id);
}
