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
  const sanitize = (value?: string) =>
    value
      ?.replace(/Long-Range Target/g, "Far-Horizon Target")
      .replace(/long targets/gi, "far-horizon targets")
      .replace(/长期目标/g, "远端目标");
  const publicScenario = {
    ...scenario,
    currentView: sanitize(scenario.currentView) ?? scenario.currentView,
    currentViewZh: sanitize(scenario.currentViewZh),
    mainSupport: sanitize(scenario.mainSupport) ?? scenario.mainSupport,
    mainSupportZh: sanitize(scenario.mainSupportZh),
    mainResistance: sanitize(scenario.mainResistance) ?? scenario.mainResistance,
    mainResistanceZh: sanitize(scenario.mainResistanceZh),
    invalidationLevel: sanitize(scenario.invalidationLevel) ?? scenario.invalidationLevel,
    invalidationLevelZh: sanitize(scenario.invalidationLevelZh),
    nextTurningWindow: sanitize(scenario.nextTurningWindow) ?? scenario.nextTurningWindow,
    nextTurningWindowZh: sanitize(scenario.nextTurningWindowZh),
    keyRisks: scenario.keyRisks.map((risk) => sanitize(risk) ?? risk),
    keyRisksZh: scenario.keyRisksZh?.map((risk) => sanitize(risk) ?? risk),
    levels: scenario.levels.map((level) => ({
      ...level,
      label: sanitize(level.label) ?? level.label,
      labelZh: sanitize(level.labelZh),
    })),
    scenarios: {
      base: {
        ...scenario.scenarios.base,
        label: sanitize(scenario.scenarios.base.label) ?? scenario.scenarios.base.label,
        summary: sanitize(scenario.scenarios.base.summary) ?? scenario.scenarios.base.summary,
        summaryZh: sanitize(scenario.scenarios.base.summaryZh),
        logic: sanitize(scenario.scenarios.base.logic) ?? scenario.scenarios.base.logic,
        logicZh: sanitize(scenario.scenarios.base.logicZh),
      },
      bull: {
        ...scenario.scenarios.bull,
        label: sanitize(scenario.scenarios.bull.label) ?? scenario.scenarios.bull.label,
        summary: sanitize(scenario.scenarios.bull.summary) ?? scenario.scenarios.bull.summary,
        summaryZh: sanitize(scenario.scenarios.bull.summaryZh),
        logic: sanitize(scenario.scenarios.bull.logic) ?? scenario.scenarios.bull.logic,
        logicZh: sanitize(scenario.scenarios.bull.logicZh),
      },
      bear: {
        ...scenario.scenarios.bear,
        label: sanitize(scenario.scenarios.bear.label) ?? scenario.scenarios.bear.label,
        summary: sanitize(scenario.scenarios.bear.summary) ?? scenario.scenarios.bear.summary,
        summaryZh: sanitize(scenario.scenarios.bear.summaryZh),
        logic: sanitize(scenario.scenarios.bear.logic) ?? scenario.scenarios.bear.logic,
        logicZh: sanitize(scenario.scenarios.bear.logicZh),
      },
    },
  };

  return (
    <Section id="bitcoin-forecast-path" spacing="lg" className="border-t border-border/[0.06]">
      <BitcoinForecastPathClient scenario={publicScenario} />
    </Section>
  );
}
