/**
 * Date freshness for “今日观点”.
 * NEVER shift an older cohort onto Beijing today.
 * If today’s batch is missing, return empty — UI shows “今日预测尚未发布”.
 */
import type { DailyForecast } from "@/types/daily-forecast";
import { getBeijingTodayKey, getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";

/**
 * Identity / no-op kept for call-site compatibility.
 * Historical “roll yesterday onto today” behavior is intentionally removed.
 */
export function applyBeijingForecastDateRoll(
  forecasts: DailyForecast[],
  // retained for call-site compatibility; freshness is strict equality elsewhere
  now = new Date()
): DailyForecast[] {
  void now;
  return forecasts;
}

/** Strict: only rows whose forecastForDate equals Beijing today. */
export function filterStrictBeijingToday(
  forecasts: DailyForecast[],
  now = new Date()
): DailyForecast[] {
  const today = getBeijingTodayKey(now);
  return forecasts.filter((f) => f.forecastForDate === today);
}

export function filterStrictBeijingTomorrow(
  forecasts: DailyForecast[],
  now = new Date()
): DailyForecast[] {
  const tomorrow = getBeijingTomorrowKey(now);
  return forecasts.filter((f) => f.forecastForDate === tomorrow);
}
