const SHANGHAI_TZ = "Asia/Shanghai";

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getShanghaiNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const year = Number(getPart(parts, "year"));
  const month = Number(getPart(parts, "month"));
  const day = Number(getPart(parts, "day"));
  const hour = Number(getPart(parts, "hour"));
  const minute = Number(getPart(parts, "minute"));
  const second = Number(getPart(parts, "second"));

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    totalMinutes: hour * 60 + minute,
  };
}

export function toShanghaiReleaseIso(dateKey: string, hour: number, minute = 0): string {
  return new Date(
    `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`
  ).toISOString();
}

export function shiftShanghaiDate(dateKey: string, dayDelta: number): string {
  const dt = new Date(`${dateKey}T12:00:00+08:00`);
  dt.setUTCDate(dt.getUTCDate() + dayDelta);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt);
  return `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(parts, "day")}`;
}

export function formatShanghaiReleaseLabel(iso: string): string {
  const dt = new Date(iso);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(dt);
  return `${getPart(parts, "year")}年${getPart(parts, "month")}月${getPart(parts, "day")}日 ${getPart(parts, "hour")}:${getPart(parts, "minute")}（上海时间）`;
}

export function resolveCoreDailyAvailabilityForDate(forecastDate: string) {
  return {
    memberAvailableAt: toShanghaiReleaseIso(shiftShanghaiDate(forecastDate, -1), 12, 0),
    publicAvailableAt: toShanghaiReleaseIso(forecastDate, 12, 0),
  };
}

export function getCoreDailyAccessMode(input: {
  forecastDate: string;
  isMember: boolean;
  isAdmin: boolean;
  now?: Date;
}): "public_locked" | "public_open" | "member_early" | "admin" {
  if (input.isAdmin) return "admin";
  const nowIso = (input.now ?? new Date()).getTime();
  const { memberAvailableAt, publicAvailableAt } = resolveCoreDailyAvailabilityForDate(input.forecastDate);
  if (input.isMember && nowIso >= new Date(memberAvailableAt).getTime()) return "member_early";
  if (nowIso >= new Date(publicAvailableAt).getTime()) return "public_open";
  return "public_locked";
}
