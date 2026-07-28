/**
 * Beijing calendar helpers for daily forecast routing.
 */
export function getBeijingDateParts(now = new Date()): { y: number; m: number; d: number; key: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const key = fmt.format(now); // YYYY-MM-DD
  const [y, m, d] = key.split("-").map(Number);
  return { y: y!, m: m!, d: d!, key };
}

export function getBeijingTodayKey(now = new Date()): string {
  return getBeijingDateParts(now).key;
}

export function getBeijingTomorrowKey(now = new Date()): string {
  const { y, m, d } = getBeijingDateParts(now);
  const utc = Date.UTC(y, m - 1, d + 1);
  const next = new Date(utc);
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function formatBeijingDateZh(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}
