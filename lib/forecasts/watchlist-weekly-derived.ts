import { normalizePlainDirection, type PlainDirection } from "@/lib/forecasts/plain-direction";

export type WatchlistMarketKind = "CRYPTO_24X7" | "US_STOCK" | "CN_STOCK" | "HK_STOCK" | "OTHER";

export type WeeklyPeriodInput = {
  periodStart: string;
  periodEnd: string;
  direction: PlainDirection;
  path?: string;
  sourceVersion?: string;
};

export type WeeklyDerivedDailyCard = {
  date: string;
  direction: PlainDirection;
  path: string;
  execution: string;
  source: "MOOX_WEEK_DERIVED";
  sourceVersion?: string;
};

const FIVE: Record<PlainDirection, PlainDirection[]> = {
  上涨: ["震荡上涨", "上涨", "震荡上涨", "上涨", "震荡上涨"],
  震荡上涨: ["震荡", "先跌后涨", "震荡上涨", "上涨", "震荡"],
  先跌后涨: ["震荡下跌", "下跌", "先跌后涨", "震荡上涨", "上涨"],
  震荡: ["震荡", "震荡", "震荡", "震荡", "震荡"],
  先涨后跌: ["上涨", "震荡上涨", "先涨后跌", "震荡下跌", "下跌"],
  震荡下跌: ["震荡", "先涨后跌", "震荡下跌", "下跌", "震荡"],
  下跌: ["震荡下跌", "下跌", "震荡下跌", "下跌", "震荡下跌"],
};

const PATH: Record<PlainDirection, string> = {
  上涨: "方向向上；等待回踩确认后再执行，不追高。",
  震荡上涨: "震荡偏上；先看支撑是否有效，再等上行确认。",
  先跌后涨: "先释放压力，再观察低点抬高或收回关键位置。",
  震荡: "区间震荡；未离开区间前以等待为主。",
  先涨后跌: "先看反弹延续，随后防止冲高回落。",
  震荡下跌: "震荡偏下；反弹不等于反转，等待止跌。",
  下跌: "方向向下；不抢反弹，等待明确止跌结构。",
};

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function marketKindFromSlug(slugValue: unknown): WatchlistMarketKind {
  const slug = String(slugValue ?? "").toLowerCase();
  if (/^(btc|eth|hype|sol|asteroid|spcx-crypto|xaut|xag|wti-crypto)$/.test(slug)) return "CRYPTO_24X7";
  if (/^(cxmt|changxin|ganfeng|ganfeng-lithium|a-share)/.test(slug)) return "CN_STOCK";
  if (/^(hstech|hk|tencent|alibaba-hk)/.test(slug)) return "HK_STOCK";
  if (/^(spcx|googl|google|sndk|nbis|tsla|lite|mu|skhy|rklb|asts|qqq|spy)/.test(slug)) return "US_STOCK";
  return "OTHER";
}

export function deriveWeeklyDailyCards(input: {
  slug: string;
  period: WeeklyPeriodInput;
}): WeeklyDerivedDailyCard[] {
  const kind = marketKindFromSlug(input.slug);
  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(input.period.periodStart, i);
    if (date > input.period.periodEnd) break;
    const wd = weekday(date);
    if (kind !== "CRYPTO_24X7" && (wd === 0 || wd === 6)) continue;
    days.push(date);
  }
  const base = FIVE[input.period.direction];
  return days.map((date, index) => {
    const direction = kind === "CRYPTO_24X7"
      ? (base[Math.min(4, Math.floor(index * 5 / Math.max(1, days.length)))] ?? input.period.direction)
      : (base[index] ?? input.period.direction);
    return {
      date,
      direction,
      path: PATH[direction],
      execution: "周卦方向不变；等待缠论、支撑压力和成交结构确认。没有确认时暂不交易。",
      source: "MOOX_WEEK_DERIVED",
      sourceVersion: input.period.sourceVersion,
    };
  });
}

const START_KEYS = ["periodStart", "startDate", "start", "validFrom", "windowStart", "analysisStart"];
const END_KEYS = ["periodEnd", "endDate", "end", "validTo", "windowEnd", "analysisEnd"];
const DIRECTION_KEYS = ["formalDirection", "direction", "finalDirection", "directionZh", "verdict", "conclusion"];
const PATH_KEYS = ["pricePath", "path", "trajectory", "route", "summary", "conclusionZh"];
const VERSION_KEYS = ["version", "sourceVersion", "predictionVersion"];

function firstString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isoDate(value: string): string {
  const match = value.match(/20\d{2}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

function flatten(value: unknown, out: Record<string, unknown>[], seen: WeakSet<object>, depth = 0): void {
  if (depth > 5 || value == null || typeof value !== "object") return;
  if (seen.has(value as object)) return;
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out, seen, depth + 1);
    return;
  }
  const obj = value as Record<string, unknown>;
  out.push(obj);
  for (const child of Object.values(obj)) flatten(child, out, seen, depth + 1);
}

export function normalizeWeeklyPeriods(input: unknown): WeeklyPeriodInput[] {
  const objects: Record<string, unknown>[] = [];
  flatten(input, objects, new WeakSet<object>());
  const rows: WeeklyPeriodInput[] = [];
  for (const obj of objects) {
    const periodStart = isoDate(firstString(obj, START_KEYS));
    const periodEnd = isoDate(firstString(obj, END_KEYS));
    const rawDirection = firstString(obj, DIRECTION_KEYS) || firstString(obj, PATH_KEYS);
    const direction = normalizePlainDirection(rawDirection);
    if (!periodStart || !periodEnd || !direction) continue;
    rows.push({
      periodStart,
      periodEnd,
      direction,
      path: firstString(obj, PATH_KEYS),
      sourceVersion: firstString(obj, VERSION_KEYS) || undefined,
    });
  }
  const unique = new Map<string, WeeklyPeriodInput>();
  for (const row of rows) unique.set(`${row.periodStart}|${row.periodEnd}|${row.direction}`, row);
  return [...unique.values()].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}

function beijingDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function selectActiveOrNextPeriod(periods: WeeklyPeriodInput[], now = new Date()): WeeklyPeriodInput | null {
  if (!periods.length) return null;
  const today = beijingDateKey(now);
  const active = periods.filter((row) => row.periodStart <= today && row.periodEnd >= today);
  if (active.length) return active.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))[0]!;
  const future = periods.filter((row) => row.periodStart > today);
  if (future.length) return future.sort((a, b) => a.periodStart.localeCompare(b.periodStart))[0]!;
  return periods.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0]!;
}
