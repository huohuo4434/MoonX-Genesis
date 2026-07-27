"use client";

import { useMemo, useState } from "react";
import { Badge, Card, EmptyState, Text } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { cn, formatLocalizedDateRange } from "@/lib/utils";
import type { TimelineCategory, TimelineEvent, TimelineVerificationState } from "@/types/research";

type FilterId = "all" | TimelineCategory | TimelineVerificationState;

const FILTERS: { id: FilterId; labelKey: string }[] = [
  { id: "all", labelKey: "timeline.filterAll" },
  { id: "crypto", labelKey: "timeline.filterCrypto" },
  { id: "us-equity", labelKey: "timeline.filterUsEquity" },
  { id: "china-equity", labelKey: "timeline.filterChinaEquity" },
  { id: "hong-kong-equity", labelKey: "timeline.filterHongKong" },
  { id: "semiconductor", labelKey: "timeline.filterSemiconductor" },
  { id: "commodity", labelKey: "timeline.filterCommodity" },
  { id: "oracle", labelKey: "timeline.filterOracle" },
  { id: "qimen", labelKey: "timeline.filterQimen" },
  { id: "cycle", labelKey: "timeline.filterCycle" },
  { id: "verified", labelKey: "timeline.filterVerified" },
  { id: "pending", labelKey: "timeline.filterPending" },
];

const CATEGORY_LABEL_KEY: Record<TimelineCategory, string> = {
  crypto: "timeline.filterCrypto",
  "us-equity": "timeline.filterUsEquity",
  "china-equity": "timeline.filterChinaEquity",
  "hong-kong-equity": "timeline.filterHongKong",
  semiconductor: "timeline.filterSemiconductor",
  commodity: "timeline.filterCommodity",
  oracle: "timeline.filterOracle",
  qimen: "timeline.filterQimen",
  cycle: "timeline.filterCycle",
};

const VERIFICATION_LABEL_KEY: Record<TimelineVerificationState, string> = {
  verified: "timeline.filterVerified",
  pending: "timeline.filterPending",
};

function matchesFilter(event: TimelineEvent, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "verified" || filter === "pending") return event.verification === filter;
  return event.categories.includes(filter);
}

export function TimelineExplorer({ events }: { events: TimelineEvent[] }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const [filter, setFilter] = useState<FilterId>("all");

  const filteredEvents = useMemo(() => events.filter((event) => matchesFilter(event, filter)), [events, filter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("common.filters")}>
        {FILTERS.map((option) => {
          const active = option.id === filter;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption font-medium transition-colors focus-ring",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/[0.1] bg-surface text-foreground-secondary hover:text-foreground"
              )}
            >
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState icon={<SearchIcon size={18} />} title={t("common.empty")} description={t("timeline.noEvents")} />
      ) : (
        <div className="relative flex flex-col gap-3 border-l border-border/[0.12] pl-6">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              padding="md"
              className={cn(
                "relative flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4",
                event.isLongRange && "border-dashed bg-card/60 opacity-80"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -left-[29px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border bg-background",
                  event.isLongRange ? "border-dashed border-foreground-tertiary/50" : "border-primary/40"
                )}
              />
              <div className="flex shrink-0 flex-col gap-0.5 sm:w-56">
                <Text variant="body-sm" weight="semibold" className="text-foreground">
                  {event.date
                    ? formatLocalizedDateRange(event.date, event.date, locale)
                    : formatLocalizedDateRange(event.start ?? "", event.end ?? "", locale)}
                </Text>
                {event.isLongRange && (
                  <Badge variant="outline" className="w-fit border-dashed text-foreground-tertiary">
                    {t("timeline.longRangeLabel")}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Text variant="body-sm" weight="medium" className="text-foreground">
                  {pickLocalized(event.title, locale)}
                </Text>
                {event.description && (
                  <Text variant="caption" color="secondary">
                    {pickLocalized(event.description, locale)}
                  </Text>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {event.categories.map((category) => (
                    <Badge key={category} variant="neutral" className="text-[10px]">
                      {t(CATEGORY_LABEL_KEY[category])}
                    </Badge>
                  ))}
                  <Badge variant={event.verification === "verified" ? "success" : "warning"} className="text-[10px]">
                    {t(VERIFICATION_LABEL_KEY[event.verification])}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
