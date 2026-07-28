/**
 * Unified China timezone datetime formatting.
 * Never concatenate bare month+day (avoids "2026年728日").
 */

const TZ = "Asia/Shanghai";

export function formatDateTimeChina(iso: string | undefined | null): string {
  if (!iso) return "—";
  // If a pre-formatted label is passed, never append a second timezone suffix.
  if (/北京时间/.test(iso) || /北京時間/.test(iso)) {
    return iso.replace(/（北京时间）+/g, "（北京时间）").replace(/（北京時間）+/g, "（北京時間）");
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const m = Number(get("month"));
  const day = Number(get("day"));
  const h = get("hour").padStart(2, "0");
  const min = get("minute").padStart(2, "0");
  return `${y}年${m}月${day}日 ${h}:${min}（北京时间）`;
}

/** @deprecated Prefer formatDateTimeChina */
export function formatBeijingDateTime(iso: string | undefined | null): string {
  return formatDateTimeChina(iso);
}

export function formatDateChina(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${y}年${m}月${d}日`;
}
