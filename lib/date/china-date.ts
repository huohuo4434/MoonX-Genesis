/**
 * Beijing (Asia/Shanghai) calendar date key — YYYY-MM-DD.
 * Prefer this for public accuracy / history filters.
 */
export function getChinaDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Alias used across forecast routing. */
export { getChinaDateKey as getBeijingTodayKey };

export function getChinaDateParts(now = new Date()): {
  y: number;
  m: number;
  d: number;
  key: string;
} {
  const key = getChinaDateKey(now);
  const [y, m, d] = key.split("-").map(Number);
  return { y: y!, m: m!, d: d!, key };
}
