/**
 * After Beijing midnight, curated forecast dates must track the live calendar.
 * If published content lags behind Beijing today, shift the newest published day onto today.
 */
import type { DailyForecast } from "@/types/daily-forecast";
import { getBeijingTodayKey, getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";

function parseKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function addDaysToKey(key: string, days: number): string {
  const ms = parseKey(key) + days * 86_400_000;
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetweenKeys(from: string, to: string): number {
  return Math.round((parseKey(to) - parseKey(from)) / 86_400_000);
}

function isPublishedRow(f: DailyForecast): boolean {
  return (
    f.status === "published" ||
    f.status === "revised" ||
    f.status === "expired" ||
    f.status === "verified"
  );
}

/**
 * Ensure display dates follow Beijing calendar after 00:00.
 * Newest published cohort → Beijing today; second-newest → Beijing yesterday (unchanged relative).
 * Draft pending rows already use getBeijingTomorrowKey and are left alone.
 */
export function applyBeijingForecastDateRoll(
  forecasts: DailyForecast[],
  now = new Date()
): DailyForecast[] {
  const today = getBeijingTodayKey(now);
  const tomorrow = getBeijingTomorrowKey(now);

  const publishedDates = [
    ...new Set(forecasts.filter(isPublishedRow).map((f) => f.forecastForDate)),
  ].sort();

  if (publishedDates.length === 0) return forecasts;
  if (publishedDates.includes(today)) return forecasts;

  const latest = publishedDates[publishedDates.length - 1]!;
  if (latest > today) return forecasts;

  const shift = daysBetweenKeys(latest, today);
  if (shift <= 0) return forecasts;

  return forecasts.map((f) => {
    // Keep draft placeholders on the live tomorrow key (already correct).
    if (f.status === "draft" || f.id.startsWith("NEXT-")) {
      return { ...f, forecastForDate: tomorrow };
    }
    if (!isPublishedRow(f)) return f;

    const rolledDate = addDaysToKey(f.forecastForDate, shift);
    return {
      ...f,
      forecastForDate: rolledDate,
    };
  });
}
