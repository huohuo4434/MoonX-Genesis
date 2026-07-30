/**
 * Pure market session readiness — no I/O.
 */
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";

/** Whether the forecast session day is finished enough to verify (Beijing clock). */
export function isSessionReadyToVerify(
  market: DailyAccuracyMarket,
  forecastDate: string,
  now = new Date()
): boolean {
  const bjParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const y = bjParts.find((p) => p.type === "year")?.value;
  const m = bjParts.find((p) => p.type === "month")?.value;
  const d = bjParts.find((p) => p.type === "day")?.value;
  const hour = Number(bjParts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(bjParts.find((p) => p.type === "minute")?.value ?? "0");
  const bjDate = `${y}-${m}-${d}`;
  const total = hour * 60 + minute;

  if (market === "CRYPTO") {
    if (bjDate <= forecastDate) return false;
    const gate = new Date(`${forecastDate}T00:10:00+08:00`);
    gate.setDate(gate.getDate() + 1);
    return now.getTime() >= gate.getTime();
  }

  if (market === "CN") {
    if (bjDate < forecastDate) return false;
    if (bjDate === forecastDate) return total >= 15 * 60 + 10;
    return true;
  }

  if (market === "HK") {
    if (bjDate < forecastDate) return false;
    if (bjDate === forecastDate) return total >= 16 * 60 + 10;
    return true;
  }

  if (market === "US" || market === "US_FUTURES") {
    if (bjDate <= forecastDate) return false;
    const nextBj = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(new Date(`${forecastDate}T12:00:00+08:00`).getTime() + 24 * 60 * 60 * 1000));
    if (bjDate > nextBj) return true;
    if (bjDate === nextBj && total >= 5 * 60) return true;
    return false;
  }

  return bjDate > forecastDate;
}
