export type ForecastFreshnessStatus = "CURRENT" | "UPCOMING" | "EXPIRED" | "MISSING";

const PERIOD_PRIORITY: Record<ForecastFreshnessStatus, number> = {
  CURRENT: 0,
  UPCOMING: 1,
  MISSING: 2,
  EXPIRED: 3,
};

/**
 * Put the period that contains the Beijing calendar date first. This only
 * changes presentation order; it never edits or replaces a locked forecast.
 */
export function prioritizeCurrentPeriods<
  T extends { type: string },
  S extends { type: string; freshnessStatus: ForecastFreshnessStatus },
>(items: readonly T[], slots: readonly S[]): T[] {
  const statusByType = new Map(slots.map((slot) => [slot.type, slot.freshnessStatus]));
  return items
    .map((item, index) => ({ item, index, status: statusByType.get(item.type) ?? "MISSING" }))
    .sort((a, b) => PERIOD_PRIORITY[a.status] - PERIOD_PRIORITY[b.status] || a.index - b.index)
    .map(({ item }) => item);
}

export type DailyPathTemporalStatus = "TODAY" | "FUTURE" | "PAST";

export function dailyPathTemporalStatus(date: string, asOfDate: string): DailyPathTemporalStatus {
  if (date === asOfDate) return "TODAY";
  return date > asOfDate ? "FUTURE" : "PAST";
}

/** Current day first, then future days, then the most recent historical day. */
export function prioritizeDailyPath<T extends { date: string }>(
  days: readonly T[],
  asOfDate: string
): T[] {
  const priority: Record<DailyPathTemporalStatus, number> = { TODAY: 0, FUTURE: 1, PAST: 2 };
  return days.slice().sort((a, b) => {
    const aStatus = dailyPathTemporalStatus(a.date, asOfDate);
    const bStatus = dailyPathTemporalStatus(b.date, asOfDate);
    const bucket = priority[aStatus] - priority[bStatus];
    if (bucket) return bucket;
    return aStatus === "PAST" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
  });
}

export type ForecastFreshnessSummary = {
  asOfDate: string;
  currentCount: number;
  upcomingCount: number;
  expiredCount: number;
  missingCount: number;
  needsUpdate: boolean;
  label: string;
};

export function forecastFreshnessStatus(
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
  asOfDate: string
): ForecastFreshnessStatus {
  if (!periodStart || !periodEnd) return "MISSING";
  if (periodStart > asOfDate) return "UPCOMING";
  if (periodEnd < asOfDate) return "EXPIRED";
  return "CURRENT";
}

export function summarizeForecastFreshness(
  statuses: ForecastFreshnessStatus[],
  asOfDate: string
): ForecastFreshnessSummary {
  const currentCount = statuses.filter((item) => item === "CURRENT").length;
  const upcomingCount = statuses.filter((item) => item === "UPCOMING").length;
  const expiredCount = statuses.filter((item) => item === "EXPIRED").length;
  const missingCount = statuses.filter((item) => item === "MISSING").length;
  const needsUpdate = currentCount === 0 && (expiredCount > 0 || missingCount > 0);
  return {
    asOfDate,
    currentCount,
    upcomingCount,
    expiredCount,
    missingCount,
    needsUpdate,
    label: needsUpdate
      ? `当前周期待更新；${expiredCount}条已结束内容已归入历史`
      : `${currentCount}条当前有效，${expiredCount}条历史周期`,
  };
}
