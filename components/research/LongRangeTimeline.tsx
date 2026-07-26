import { Badge, Card, Heading, Text } from "@/components/ui";
import type { LongRangeTimelinePeriod } from "@/lib/data/intelligence-snapshot-types";

export interface LongRangeTimelineProps {
  periods: LongRangeTimelinePeriod[];
}

/** "Nasdaq Long-Range Oracle" — a multi-year alternative-model scenario, clearly labeled as non-binding. */
export function LongRangeTimeline({ periods }: LongRangeTimelineProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Heading as="h2" size="h2" className="max-w-2xl">
            Nasdaq Long-Range Oracle
          </Heading>
          <Badge variant="outline">Alternative Model</Badge>
        </div>
        <Text variant="body-sm" color="tertiary" className="max-w-2xl">
          Long-range alternative-model scenario. Not a guaranteed forecast.
        </Text>
      </div>

      <div className="relative flex flex-col gap-3 border-l border-border/[0.12] pl-6">
        {periods.map((period) => (
          <Card key={period.id} padding="md" className="relative flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span
              aria-hidden="true"
              className="absolute -left-[29px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-primary/40 bg-background"
            />
            <Text variant="body-sm" weight="semibold" className="shrink-0 text-foreground sm:w-56">
              {period.period}
            </Text>
            <Text variant="body-sm" color="secondary">
              {period.outlook}
            </Text>
          </Card>
        ))}
      </div>
    </div>
  );
}
