/** Match the actual Beijing calendar day, never the array's first/last row. */
export function memberTradesToday(rows: ReadonlyArray<{ date: string; trades: number }>, now: number): number | null {
  if (!Number.isFinite(now)) return null;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  const row = rows.find(item => item.date === day);
  return row && Number.isFinite(row.trades) && row.trades >= 0 ? row.trades : null;
}
