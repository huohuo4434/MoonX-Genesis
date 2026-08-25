export const ACCEPTANCE_MAX_AGE_SECONDS = 24 * 60 * 60;
export const ACCEPTANCE_FUTURE_TOLERANCE_SECONDS = 5 * 60;

export function acceptanceReportFreshness(input: {
  reportAt: unknown;
  servedAt: Date;
}): { reportGeneratedAt: string | null; reportAgeSeconds: number | null; stale: boolean; current: boolean } {
  const reportAt = typeof input.reportAt === "string" ? new Date(input.reportAt) : null;
  const valid = reportAt != null && Number.isFinite(reportAt.getTime());
  const reportAgeSeconds = valid
    ? Math.round((input.servedAt.getTime() - reportAt.getTime()) / 1_000)
    : null;
  const stale = reportAgeSeconds == null
    || reportAgeSeconds > ACCEPTANCE_MAX_AGE_SECONDS
    || reportAgeSeconds < -ACCEPTANCE_FUTURE_TOLERANCE_SECONDS;
  return {
    reportGeneratedAt: valid ? reportAt.toISOString() : null,
    reportAgeSeconds,
    stale,
    current: !stale,
  };
}
