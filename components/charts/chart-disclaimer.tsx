"use client";

import { Badge, Text } from "@/components/ui";
import { useTranslations } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface ChartDisclaimerProps {
  className?: string;
}

/**
 * Mandatory framing shown with every Scenario Forecast chart: what it is
 * (a simulation), where the data comes from (curated, not live), and that
 * it is not financial advice — plus the TradingView attribution required
 * for use of the `lightweight-charts` library.
 */
export function ChartDisclaimer({ className }: ChartDisclaimerProps) {
  const t = useTranslations();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">{t("common.scenarioSimulation")}</Badge>
        <Badge variant="outline">{t("common.curatedNotLive")}</Badge>
        <Badge variant="danger">{t("common.notFinancialAdvice")}</Badge>
      </div>
      <Text variant="caption" color="tertiary">
        {t("chart.disclaimerSimulation")}{" "}
        <a
          href="https://www.tradingview.com/lightweight-charts/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-foreground-secondary focus-ring"
        >
          Lightweight Charts™
        </a>{" "}
        by TradingView.
      </Text>
    </div>
  );
}
