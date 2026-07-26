/**
 * Chart chrome (title/action/legend framing + skeleton/placeholder states)
 * plus the MoonX Scenario Forecast System — the curated, simulated
 * candlestick visualization built on `lightweight-charts`. See
 * `lib/data/forecast-chart-scenarios.ts` for the underlying data and
 * `docs/ARCHITECTURE.md` for how it fits together.
 */
export * from "./ChartContainer";
export * from "./ChartPlaceholder";
export * from "./ChartSkeleton";

export { ForecastCandlestickChart } from "./forecast-candlestick-chart";
export type { ForecastCandlestickChartProps } from "./forecast-candlestick-chart";
export { ForecastChartToolbar } from "./forecast-chart-toolbar";
export type { ForecastChartToolbarProps, AssetOption } from "./forecast-chart-toolbar";
export { ForecastLevelsPanel } from "./forecast-levels-panel";
export type { ForecastLevelsPanelProps } from "./forecast-levels-panel";
export { ScenarioSelector } from "./scenario-selector";
export type { ScenarioSelectorProps, ScenarioOption } from "./scenario-selector";
export { ChartDisclaimer } from "./chart-disclaimer";
export type { ChartDisclaimerProps } from "./chart-disclaimer";
export { ForecastExplanation } from "./forecast-explanation";
export type { ForecastExplanationProps } from "./forecast-explanation";
export { ScenarioForecastExplorer } from "./scenario-forecast-explorer";
export type { ScenarioForecastExplorerProps } from "./scenario-forecast-explorer";
export { BitcoinForecastPreview } from "./bitcoin-forecast-preview";
export type { BitcoinForecastPreviewProps } from "./bitcoin-forecast-preview";
