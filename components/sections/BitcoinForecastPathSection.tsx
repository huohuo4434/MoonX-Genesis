import { BitcoinForecastPreview } from "@/components/charts";
import { Heading, Section, Text } from "@/components/ui";
import { getForecastChartScenario } from "@/lib/data/forecast-chart-scenarios";

/**
 * Compact homepage teaser for the Bitcoin Scenario Forecast chart. Links
 * out to the full interactive MoonX Scenario Charts section on the
 * Research Intelligence page — does not duplicate its controls.
 */
export async function BitcoinForecastPathSection() {
  const scenario = await getForecastChartScenario("bitcoin");
  if (!scenario) return null;

  return (
    <Section id="bitcoin-forecast-path" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-8 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          Scenario Forecast System
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          Bitcoin Forecast Path
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          A simulated visualization of MoonX&rsquo;s curated Bitcoin scenario — support, resistance,
          target, and the forecast path ahead.
        </Text>
      </div>

      <BitcoinForecastPreview scenario={scenario} fullChartHref="/research/intelligence-snapshot#moonx-scenario-charts" />
    </Section>
  );
}
