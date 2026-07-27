"use client";

import { ChevronDownIcon } from "@/components/icons";
import { Badge, Card, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { AssetChartScenario } from "@/types/forecast-chart";

export interface ForecastExplanationProps {
  scenario: AssetChartScenario;
  className?: string;
}

interface ExplanationSection {
  id: string;
  title: string;
  content: string[];
}

/**
 * "Why this path?" — framework contribution badges plus expandable
 * Base/Bull/Bear logic, key risks, and a verification checklist. Uses
 * native `<details>` so it works without any client-side state.
 */
export function ForecastExplanation({ scenario, className }: ForecastExplanationProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const isChinese = locale === "zh-CN";
  const sections: ExplanationSection[] = [
    { id: "base-logic", title: t("chart.baseCaseLogic"), content: [isChinese ? scenario.scenarios.base.logicZh ?? scenario.scenarios.base.logic : scenario.scenarios.base.logic] },
    { id: "bull-trigger", title: t("chart.bullCaseTrigger"), content: [isChinese ? scenario.scenarios.bull.logicZh ?? scenario.scenarios.bull.logic : scenario.scenarios.bull.logic] },
    { id: "bear-trigger", title: t("chart.bearCaseTrigger"), content: [isChinese ? scenario.scenarios.bear.logicZh ?? scenario.scenarios.bear.logic : scenario.scenarios.bear.logic] },
    { id: "key-risks", title: t("chart.keyRisks"), content: isChinese ? scenario.keyRisksZh ?? scenario.keyRisks : scenario.keyRisks },
    { id: "verification-checklist", title: t("chart.verificationChecklist"), content: isChinese ? scenario.verificationChecklistZh ?? scenario.verificationChecklist : scenario.verificationChecklist },
  ];

  return (
    <Card padding="lg" className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {t("chart.whyThisPath")}
        </Text>
        <div className="flex flex-wrap gap-2">
          {scenario.relevantFrameworks.map((framework) => (
            <Badge key={framework} variant="outline">
              {framework}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border/[0.08]">
        {sections.map((section) => (
          <details key={section.id} className="group py-3 first:pt-0 last:pb-0 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm text-body-sm font-medium text-foreground transition-colors hover:text-primary focus-ring">
              {section.title}
              <ChevronDownIcon size={16} className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3">
              {section.content.length === 1 ? (
                <Text variant="body-sm" color="secondary">
                  {section.content[0]}
                </Text>
              ) : (
                <ul className="flex flex-col gap-2">
                  {section.content.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                      <span aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm border border-border/30" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
      </div>
    </Card>
  );
}
