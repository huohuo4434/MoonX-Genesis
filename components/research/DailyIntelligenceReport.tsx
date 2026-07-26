import { AlertTriangleIcon, CheckIcon } from "@/components/icons";
import { TrendBadge } from "@/components/data";
import { Badge, Card, Progress, Text } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { DailyIntelligenceReport as DailyIntelligenceReportData } from "@/lib/data/research-intelligence";

export interface DailyIntelligenceReportProps {
  report: DailyIntelligenceReportData;
}

/** Structured daily research snapshot MoonX produces once frameworks reach consensus on an asset. */
export function DailyIntelligenceReport({ report }: DailyIntelligenceReportProps) {
  return (
    <Card padding="lg" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Badge variant="outline" className="self-start">
            Demo Report
          </Badge>
          <Text variant="body" weight="semibold" className="mt-1 text-h3 text-foreground">
            {report.asset} <span className="text-foreground-tertiary">{report.symbol}</span>
          </Text>
          <Text variant="caption" color="tertiary">
            {formatDate(report.date)}
          </Text>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Text variant="caption" color="tertiary">
            Market Consensus
          </Text>
          <TrendBadge trend={report.marketConsensus} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Progress label="Bullish Score" value={report.bullishScore} />
        <Progress label="Bearish Score" value={report.bearishScore} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Key Factors
          </Text>
          <ul className="flex flex-col gap-2.5">
            {report.keyFactors.map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                <CheckIcon size={14} className="mt-0.5 shrink-0 text-success" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Risk Factors
          </Text>
          <ul className="flex flex-col gap-2.5">
            {report.riskFactors.map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                <AlertTriangleIcon size={14} className="mt-0.5 shrink-0 text-warning" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/[0.08] pt-5">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          Final MoonX View
        </Text>
        <Text variant="body-sm" color="secondary">
          {report.finalView}
        </Text>
      </div>
    </Card>
  );
}
