export type PublicVerificationPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

export const DAILY_PUBLIC_DETAIL_LIMIT = 12;

export function selectPublicVerificationDetails<T extends { date: string; period: PublicVerificationPeriod }>(
  rows: readonly T[],
  period: PublicVerificationPeriod,
): { visible: T[]; archivedCount: number } {
  const matching = rows
    .filter((row) => row.period === period)
    .sort((a, b) => b.date.localeCompare(a.date));
  const limit = period === "DAILY" ? DAILY_PUBLIC_DETAIL_LIMIT : matching.length;
  return {
    visible: matching.slice(0, limit),
    archivedCount: Math.max(0, matching.length - limit),
  };
}
