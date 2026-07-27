import { Badge, Card, Heading, Text } from "@/components/ui";
import type { LongRangeTimelinePeriod } from "@/lib/data/intelligence-snapshot-types";

export interface LongRangeTimelineProps {
  periods: LongRangeTimelinePeriod[];
}

/** 纳斯达克长期 Oracle 情景 — 低置信度长期推测，非保证预测。 */
export function LongRangeTimeline({ periods }: LongRangeTimelineProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Heading as="h2" size="h2" className="max-w-2xl">
            纳斯达克长期 Oracle 情景
          </Heading>
          <Badge variant="outline">低置信度长期情景</Badge>
        </div>
        <Text variant="body-sm" color="tertiary" className="max-w-2xl">
          长期替代模型情景，不构成保证性预测。
        </Text>
      </div>

      <div className="relative flex flex-col gap-3 border-l border-border/[0.12] pl-6">
        {periods.map((period) => (
          <Card key={period.id} padding="md" className="relative flex flex-col gap-1 border-dashed opacity-80 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span
              aria-hidden="true"
              className="absolute -left-[29px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-dashed border-foreground-tertiary/50 bg-background"
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
