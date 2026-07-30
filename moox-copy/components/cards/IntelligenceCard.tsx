import { ArrowRightIcon } from "@/components/icons";
import { TrendBadge, type Trend } from "@/components/data";
import { Button, Card, Text } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { AssetStatus, DemoAssetIntelligence } from "@/lib/data/demo-content";

export interface IntelligenceCardProps {
  asset: DemoAssetIntelligence;
}

const statusToTrend: Record<AssetStatus, Trend> = {
  bullish: "up",
  bearish: "down",
  neutral: "neutral",
};

/** Dashboard snapshot card for the "Today's Intelligence" section. */
export function IntelligenceCard({ asset }: IntelligenceCardProps) {
  return (
    <Card hover padding="lg" className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="body" weight="semibold" className="text-foreground">
            {asset.name}
          </Text>
          <Text variant="caption" color="tertiary">
            {asset.symbol}
          </Text>
        </div>
        <TrendBadge trend={statusToTrend[asset.status]} />
      </div>

      <div className="flex items-center justify-between border-y border-border/[0.08] py-3">
        <Text variant="caption" color="tertiary">
          Forecast Period
        </Text>
        <Text variant="caption" className="font-mono text-foreground-secondary">
          {asset.forecastPeriod}
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Text variant="caption" color="tertiary">
            Confidence
          </Text>
          <Text variant="mono" className="text-h3 text-foreground">
            {asset.confidenceScore}%
          </Text>
        </div>
        <div className="flex flex-col gap-1.5">
          <Text variant="caption" color="tertiary">
            Evidence
          </Text>
          <Text variant="mono" className="text-h3 text-foreground">
            {asset.evidenceScore}%
          </Text>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Text variant="caption" color="tertiary">
          Updated {formatDate(asset.lastUpdate)}
        </Text>
        <Button variant="ghost" size="sm">
          View Analysis
          <ArrowRightIcon size={14} />
        </Button>
      </div>
    </Card>
  );
}
