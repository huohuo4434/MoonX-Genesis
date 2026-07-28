/**
 * Publish windows in Asia/Shanghai.
 * Asia batch (BTC / SSE / HSTECH): 18:30 → next calendar trading day
 * WTI batch: 05:30 → same calendar day (next WTI session)
 * US batch (SPX / NDX / GLD): 06:30 → same calendar day
 * Public flip: 08:00 on forecastDate
 */

export const ASIA_BATCH_KEYS = ["BTC", "SSE", "HSTECH"] as const;
export const WTI_BATCH_KEYS = ["WTI"] as const;
export const US_BATCH_KEYS = ["SPX", "NDX", "GLD"] as const;

export type PublishBatch = "asia" | "us" | "wti";

export function getBeijingClock(now = new Date()): {
  date: string;
  hour: number;
  minute: number;
  totalMinutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return {
    date: `${y}-${m}-${d}`,
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
  };
}

/** True once Beijing clock reaches HH:MM on calendar day of `now`. */
export function isAfterBeijingTime(hour: number, minute: number, now = new Date()): boolean {
  const clock = getBeijingClock(now);
  return clock.totalMinutes >= hour * 60 + minute;
}

/** Public today views unlock at 08:00 Beijing on the forecast date. */
export function isPublicTodayUnlocked(forecastDate: string, now = new Date()): boolean {
  const clock = getBeijingClock(now);
  if (clock.date > forecastDate) return true;
  if (clock.date < forecastDate) return false;
  return clock.totalMinutes >= 8 * 60;
}

export function publicAtIso(forecastDate: string): string {
  return new Date(`${forecastDate}T08:00:00+08:00`).toISOString();
}

export function asiaBatchReady(now = new Date()): boolean {
  return isAfterBeijingTime(18, 30, now);
}

export function usBatchReady(now = new Date()): boolean {
  return isAfterBeijingTime(6, 30, now);
}

export function wtiBatchReady(now = new Date()): boolean {
  return isAfterBeijingTime(5, 30, now);
}

export function sessionLabelForBatch(batch: PublishBatch): string {
  if (batch === "asia") return "亚太交易时段（BTC / A股 / 港股）";
  if (batch === "wti") return "NYMEX WTI近月连续合约交易日";
  return "美股交易时段（标普 / 纳指 / GLD）";
}

export function batchForAssetKey(key: string): PublishBatch {
  if ((WTI_BATCH_KEYS as readonly string[]).includes(key)) return "wti";
  if ((US_BATCH_KEYS as readonly string[]).includes(key)) return "us";
  return "asia";
}

export function nextUpdateLabelForSymbol(symbol: string): string {
  if (symbol === "WTI" || symbol === "CL=F") return "每天北京时间 05:30";
  if (symbol === "SPX" || symbol === "NDX" || symbol === "GLD" || symbol === "^GSPC") {
    return "每天北京时间 06:30";
  }
  return "每天北京时间 18:30";
}
