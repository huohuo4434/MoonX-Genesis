export type ForecastFreshnessStatus = "CURRENT" | "UPCOMING" | "EXPIRED" | "MISSING";

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
