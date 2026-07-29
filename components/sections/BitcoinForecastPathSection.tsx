import { Section } from "@/components/ui";
import { getForecastChartScenario } from "@/lib/data/forecast-chart-scenarios";
import { BitcoinForecastPathClient } from "./BitcoinForecastPathClient";

/**
 * Compact homepage teaser for the Bitcoin Scenario Forecast chart. Links
 * out to the full interactive MoonX Scenario Charts section on the
 * Research Intelligence page — does not duplicate its controls.
 */
export async function BitcoinForecastPathSection() {
  const scenario = await getForecastChartScenario("bitcoin");
  if (!scenario) return null;
  const publicScenario = {
    ...scenario,
    levels: scenario.levels.map((level) => ({
      ...level,
      label: level.label.replace(/Long-Range Target/g, "Far-Horizon Target"),
      labelZh: level.labelZh?.replace(/长期目标/g, "远端目标"),
    })),
  };

  return (
    <Section id="bitcoin-forecast-path" spacing="lg" className="border-t border-border/[0.06]">
      <BitcoinForecastPathClient scenario={publicScenario} />
    </Section>
  );
}
