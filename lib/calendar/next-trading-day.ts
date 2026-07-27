/**
 * Next trading-day calculation.
 * Weekend exclusion + configurable holiday list (no full exchange calendar yet).
 */

import type { DailyForecastMarket } from "@/types/daily-forecast";

/** ISO dates YYYY-MM-DD — extend as holiday data is curated. */
export const marketHolidays: Record<Exclude<DailyForecastMarket, "crypto">, string[]> = {
  us: [
    // Placeholder US holidays 2026 — expand manually as needed
    "2026-01-01",
    "2026-01-19",
    "2026-02-16",
    "2026-05-25",
    "2026-07-03",
    "2026-09-07",
    "2026-11-26",
    "2026-12-25",
  ],
  commodity: [
    "2026-01-01",
    "2026-01-19",
    "2026-02-16",
    "2026-05-25",
    "2026-07-03",
    "2026-09-07",
    "2026-11-26",
    "2026-12-25",
  ],
  cn: [
    // A-share holidays 2026 — curated placeholders; refine against official calendar
    "2026-01-01",
    "2026-01-02",
    "2026-02-16",
    "2026-02-17",
    "2026-02-18",
    "2026-02-19",
    "2026-02-20",
    "2026-04-06",
    "2026-05-01",
    "2026-06-19",
    "2026-10-01",
    "2026-10-02",
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
  ],
  hk: [
    "2026-01-01",
    "2026-02-17",
    "2026-02-18",
    "2026-04-03",
    "2026-04-06",
    "2026-05-01",
    "2026-06-19",
    "2026-07-01",
    "2026-10-01",
    "2026-10-02",
    "2026-12-25",
  ],
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isHoliday(market: DailyForecastMarket, iso: string): boolean {
  if (market === "crypto") return false;
  return marketHolidays[market].includes(iso);
}

/** True if the date is a trading day for the market. */
export function isTradingDay(market: DailyForecastMarket, date: Date | string): boolean {
  const d = typeof date === "string" ? parseIsoDate(date) : date;
  const iso = toIsoDate(d);
  if (market === "crypto") return true;
  if (isWeekend(d)) return false;
  if (isHoliday(market, iso)) return false;
  return true;
}

/**
 * Next forecast target date for a market.
 * - crypto: next calendar day (includes weekends)
 * - cn / hk / us / commodity: next weekday that is not in marketHolidays
 */
export function getNextForecastDate(
  market: DailyForecastMarket,
  currentDate: Date | string = new Date()
): string {
  const base = typeof currentDate === "string" ? parseIsoDate(currentDate) : new Date(currentDate);
  // Normalize to local calendar day
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  if (market === "crypto") {
    return toIsoDate(addDays(start, 1));
  }

  let cursor = addDays(start, 1);
  for (let i = 0; i < 14; i += 1) {
    if (isTradingDay(market, cursor)) return toIsoDate(cursor);
    cursor = addDays(cursor, 1);
  }
  return toIsoDate(cursor);
}

/** Current market session date (today if trading; else previous trading day for equities). */
export function getCurrentSessionDate(
  market: DailyForecastMarket,
  currentDate: Date | string = new Date()
): string {
  const base = typeof currentDate === "string" ? parseIsoDate(currentDate) : new Date(currentDate);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (market === "crypto" || isTradingDay(market, start)) return toIsoDate(start);

  let cursor = addDays(start, -1);
  for (let i = 0; i < 14; i += 1) {
    if (isTradingDay(market, cursor)) return toIsoDate(cursor);
    cursor = addDays(cursor, -1);
  }
  return toIsoDate(start);
}

export function formatForecastDateZh(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export function formatForecastDateEn(iso: string): string {
  const d = parseIsoDate(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function sessionLabelForMarket(market: DailyForecastMarket): string {
  switch (market) {
    case "crypto":
      return "下一自然日";
    case "cn":
      return "下一A股交易日";
    case "hk":
      return "下一港股交易日";
    case "us":
      return "下一美股交易日";
    case "commodity":
      return "下一商品交易日";
    default:
      return "下一交易日";
  }
}
