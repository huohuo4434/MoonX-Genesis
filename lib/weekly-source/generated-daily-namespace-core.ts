export const FOCUS_DAILY_MARKET_PREFIX = "FOCUS:";

export function isPublicGeneratedDailyMarketCode(marketCode: string): boolean {
  return !marketCode.trim().toUpperCase().startsWith(FOCUS_DAILY_MARKET_PREFIX);
}

export function filterPublicGeneratedDailyRows<T extends { marketCode: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => isPublicGeneratedDailyMarketCode(row.marketCode));
}
