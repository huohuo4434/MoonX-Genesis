/**
 * Formal publish schedule — single daily batch at Beijing 20:00.
 * All markets share one next-trading-day formal forecast batch.
 * Legacy asia/us/wti helpers remain as aliases pointing at the formal window
 * for older automation callers; UI must not show split times.
 */

export const FORMAL_PUBLISH_HOUR_BJ = 20;
export const FORMAL_PUBLISH_MINUTE_BJ = 0;
export const FORMAL_PUBLISH_LABEL = "每天北京时间 20:00";

/** @deprecated Use FORMAL — kept for type compatibility only. */
export const ASIA_BATCH_KEYS = ["BTC", "SSE", "HSTECH"] as const;
export const WTI_BATCH_KEYS = ["WTI"] as const;
export const US_BATCH_KEYS = ["SPX", "NDX", "GLD"] as const;

export type PublishBatch = "formal" | "asia" | "us" | "wti";

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

/** Formal next-trading-day batch unlocks for members at 20:00 Beijing. */
export function formalBatchReady(now = new Date()): boolean {
  return isAfterBeijingTime(FORMAL_PUBLISH_HOUR_BJ, FORMAL_PUBLISH_MINUTE_BJ, now);
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

/** Planned publish instant for a calendar Beijing date (YYYY-MM-DD). */
export function plannedPublishAtIso(beijingDate: string): string {
  return new Date(
    `${beijingDate}T${String(FORMAL_PUBLISH_HOUR_BJ).padStart(2, "0")}:${String(FORMAL_PUBLISH_MINUTE_BJ).padStart(2, "0")}:00+08:00`
  ).toISOString();
}

/**
 * After 20:00 Beijing with no next-batch published → delayed.
 * Before 20:00 with no batch → not yet published (waiting for tonight).
 */
export function tomorrowPublishState(
  hasPublishedNextBatch: boolean,
  now = new Date()
): "published" | "waiting" | "delayed" {
  if (hasPublishedNextBatch) return "published";
  return formalBatchReady(now) ? "delayed" : "waiting";
}

/** @deprecated alias → formal 20:00 */
export function asiaBatchReady(now = new Date()): boolean {
  return formalBatchReady(now);
}
/** @deprecated alias → formal 20:00 */
export function usBatchReady(now = new Date()): boolean {
  return formalBatchReady(now);
}
/** @deprecated alias → formal 20:00 */
export function wtiBatchReady(now = new Date()): boolean {
  return formalBatchReady(now);
}

export function sessionLabelForBatch(): string {
  return "下一实际交易日正式预测批次（全市场统一）";
}

export function batchForAssetKey(): PublishBatch {
  return "formal";
}

export function nextUpdateLabelForSymbol(): string {
  return FORMAL_PUBLISH_LABEL;
}

export const TOMORROW_SCHEDULE_COPY = {
  title: "下一交易日完整预测",
  fixedPublish: FORMAL_PUBLISH_LABEL,
  description:
    "MOOX每天北京时间20:00发布下一实际交易日预测。遇休市日，相应市场的目标日期自动顺延至下一交易日。",
  delayedTitle: "下一交易日预测延迟发布",
  delayedBody: "预测尚未完成锁定，发布后会员将立即可见。",
  waitingTitle: "下一交易日预测尚未发布",
  waitingBody: "预测生成并锁定后将在此处开放，会员可第一时间查看。",
} as const;
