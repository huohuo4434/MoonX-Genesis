import { normalizePlainDirection, type PlainDirection } from "@/lib/forecasts/plain-direction";
import { deriveWeeklyDailyCards, type WeeklyPeriodInput } from "@/lib/forecasts/watchlist-weekly-derived";

export type ReflectedForecast = {
  asset: string;
  assetName: string;
  targetDate: string;
  direction: PlainDirection;
  source: string;
  lockedAt?: string;
  publishedAt?: string;
};

const CORE = new Map<string, string>([
  ["BTC", "比特币"], ["ETH", "以太坊"], ["SPX", "标普500"], ["NDX", "纳斯达克100"],
  ["SHCOMP", "上证指数"], ["SSEC", "上证指数"], ["000001.SS", "上证指数"],
  ["HSTECH", "恒生科技"], ["GOLD", "国际金价"], ["GLD", "国际金价"], ["GC", "国际金价"],
  ["SILVER", "国际银价"], ["SI", "国际银价"], ["WTI", "WTI原油"], ["CL", "WTI原油"],
]);

function first(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (obj[key] != null) return obj[key];
  return undefined;
}

function dateOf(value: unknown): string {
  const match = String(value ?? "").match(/20\d{2}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

function canonicalAsset(value: unknown): { asset: string; assetName: string } | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/USDT$|USD$/, "");
  for (const [key, name] of CORE) {
    if (upper === key || raw.toUpperCase() === key) return { asset: key === "SSEC" || key === "000001.SS" ? "SHCOMP" : key === "GLD" || key === "GC" ? "GOLD" : key === "SI" ? "SILVER" : key === "CL" ? "WTI" : key, assetName: name };
  }
  const nameMatch = [...CORE.entries()].find(([, name]) => raw.includes(name));
  if (nameMatch) return canonicalAsset(nameMatch[0]);
  return null;
}

function statusAllows(obj: Record<string, unknown>): boolean {
  const status = String(first(obj, ["status", "publishStatus", "state", "lifecycle"]) ?? "").toUpperCase();
  if (/DRAFT|UNPUBLISHED|CANCEL|ARCHIVE|DELETED/.test(status)) return false;
  if (/PUBLISHED|LOCKED|ACTIVE|VERIFIED/.test(status)) return true;
  return Boolean(first(obj, ["lockedAt", "publishedAt", "version", "sourceVersion", "periodStart"]));
}

function flatten(value: unknown, out: Record<string, unknown>[], seen: WeakSet<object>, depth = 0): void {
  if (depth > 6 || value == null || typeof value !== "object") return;
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

export function collectReflectedForecasts(sources: unknown[], targetDate: string): ReflectedForecast[] {
  const objects: Record<string, unknown>[] = [];
  for (const source of sources) flatten(source, objects, new WeakSet<object>());
  const direct: ReflectedForecast[] = [];
  const weekly: Array<{ asset: string; assetName: string; period: WeeklyPeriodInput }> = [];
  for (const obj of objects) {
    if (!statusAllows(obj)) continue;
    const assetInfo = canonicalAsset(first(obj, ["assetId", "symbol", "ticker", "asset", "slug", "assetName", "name"]));
    if (!assetInfo) continue;
    const rawDirection = first(obj, ["formalDirection", "direction", "finalDirection", "directionZh", "verdict", "conclusion", "summary"]);
    const direction = normalizePlainDirection(rawDirection);
    if (!direction) continue;
    const exactDate = dateOf(first(obj, ["forecastDate", "targetDate", "targetSession", "date"]));
    if (exactDate === targetDate) {
      direct.push({
        ...assetInfo,
        targetDate,
        direction,
        source: "LOCKED_DAILY",
        lockedAt: String(obj.lockedAt ?? "") || undefined,
        publishedAt: String(obj.publishedAt ?? "") || undefined,
      });
      continue;
    }
    const periodStart = dateOf(first(obj, ["periodStart", "startDate", "validFrom", "windowStart"]));
    const periodEnd = dateOf(first(obj, ["periodEnd", "endDate", "validTo", "windowEnd"]));
    if (periodStart && periodEnd && periodStart <= targetDate && periodEnd >= targetDate) {
      weekly.push({ ...assetInfo, period: { periodStart, periodEnd, direction, sourceVersion: String(obj.version ?? obj.sourceVersion ?? "") || undefined } });
    }
  }
  const byAsset = new Map<string, ReflectedForecast>();
  for (const item of direct) byAsset.set(item.asset, item);
  for (const item of weekly) {
    if (byAsset.has(item.asset)) continue;
    const day = deriveWeeklyDailyCards({ slug: item.asset.toLowerCase(), period: item.period }).find((card) => card.date === targetDate);
    if (!day) continue;
    byAsset.set(item.asset, { asset: item.asset, assetName: item.assetName, targetDate, direction: day.direction, source: "WEEKLY_DERIVED_FALLBACK" });
  }
  return [...byAsset.values()].sort((a, b) => a.asset.localeCompare(b.asset));
}
