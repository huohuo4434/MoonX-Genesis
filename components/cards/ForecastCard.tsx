import { ArrowRightIcon } from "@/components/icons";
import { ConfidenceBadge, RiskBadge, ScoreBadge, TrendBadge } from "@/components/data";
import { Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Text } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { DemoForecast } from "@/lib/data/demo-content";

export interface ForecastCardProps {
  forecast: DemoForecast;
}

/** Premium forecast summary card — direction, scores, risk, and verification status at a glance. */
export function ForecastCard({ forecast }: ForecastCardProps) {
  return (
    <Card hover padding="lg" className="flex flex-col gap-5">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-0">
        <div className="flex flex-col gap-1.5">
          <Badge variant="outline">Demo Forecast</Badge>
          <CardTitle className="mt-1">{forecast.asset}</CardTitle>
          <Text variant="caption" color="tertiary">
            {forecast.symbol} · {forecast.windowLabel}
          </Text>
        </div>
        <TrendBadge trend={forecast.direction} />
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
            Confidence
          </Text>
          <ConfidenceBadge score={forecast.confidenceScore} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
            Risk Level
          </Text>
          <RiskBadge level={forecast.riskLevel} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
            Evidence Score
          </Text>
          <ScoreBadge value={forecast.evidenceScore} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
            Agreement Score
          </Text>
          <ScoreBadge value={forecast.agreementScore} />
        </div>
      </CardContent>

      <CardFooter className="items-center justify-between border-t border-border/[0.08] pt-4">
        <Text variant="caption" color="tertiary">
          Verification due {formatDate(forecast.verificationDate)}
        </Text>
        <Button variant="ghost" size="sm">
          View Forecast
          <ArrowRightIcon size={14} />
        </Button>
      </CardFooter>
    </Card>
  );
}
