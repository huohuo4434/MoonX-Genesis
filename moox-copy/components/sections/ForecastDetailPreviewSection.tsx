import { TrendBadge } from "@/components/data";
import { Badge, Card, Heading, Progress, Section, Text } from "@/components/ui";
import { demoForecastDetail } from "@/lib/data/demo-content";

/** A single deep-dive example showing how a MoonX forecast combines multiple frameworks. */
export function ForecastDetailPreviewSection() {
  const { asset, timeHorizon, consensus, frameworks } = demoForecastDetail;

  return (
    <Section id="forecast-detail" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-10 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Forecast Detail Preview
          </Text>
          <Badge variant="neutral">Demo Analysis</Badge>
        </div>
        <Heading as="h2" size="h2" className="max-w-2xl">
          See how a MoonX forecast comes together
        </Heading>
      </div>

      <Card padding="lg" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12">
        <div className="flex flex-col gap-5">
          <Badge variant="outline" className="self-start">
            Demo Forecast
          </Badge>
          <Heading as="h3" size="h3">
            {asset} Forecast
          </Heading>

          <div className="flex flex-wrap gap-8">
            <div className="flex flex-col gap-1.5">
              <Text variant="caption" color="tertiary">
                Time Horizon
              </Text>
              <Text variant="body" weight="medium">
                {timeHorizon}
              </Text>
            </div>
            <div className="flex flex-col gap-1.5">
              <Text variant="caption" color="tertiary">
                Consensus
              </Text>
              <TrendBadge trend={consensus} />
            </div>
          </div>

          <Text variant="body-sm" color="secondary" className="max-w-sm">
            This is a demo analysis illustrating how MoonX combines multiple internal frameworks
            into one forecast. It does not represent real market analysis or investment advice.
          </Text>
        </div>

        <div className="flex flex-col gap-6">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Analysis Framework
          </Text>
          <div className="flex flex-col gap-5">
            {frameworks.map((framework) => (
              <Progress key={framework.name} label={framework.name} value={framework.score} />
            ))}
          </div>
        </div>
      </Card>
    </Section>
  );
}
