export const FOCUS_DAILY_MARKET_PREFIX = "FOCUS:";

export function isPublicGeneratedDailyMarketCode(marketCode: string): boolean {
  return !marketCode.trim().toUpperCase().startsWith(FOCUS_DAILY_MARKET_PREFIX);
}

export function filterPublicGeneratedDailyRows<T extends { marketCode: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => isPublicGeneratedDailyMarketCode(row.marketCode));
}

export function selectFocusGeneratedDailyAuditRows<T extends {
  id: string; marketCode: string; sourceWeeklyForecastId: string; forecastDate: string; version: number; publishedAt: string | null;
}>(rows: readonly T[], input: { marketCode: string; sourceWeeklyForecastId: string; periodStart: string; periodEnd: string }): T[] {
  if (!input.marketCode.startsWith(FOCUS_DAILY_MARKET_PREFIX)) return [];
  return rows.filter((row) => row.marketCode === input.marketCode && row.sourceWeeklyForecastId === input.sourceWeeklyForecastId && row.forecastDate >= input.periodStart && row.forecastDate <= input.periodEnd)
    .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate) || b.version - a.version || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || b.id.localeCompare(a.id));
}
