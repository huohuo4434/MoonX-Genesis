import "server-only";

import {
  CHANGXIN_DAILY_FORECASTS,
  CHANGXIN_STOCK,
  CHANGXIN_WEEKLY_ANALYSES,
} from "@/lib/data/member-stocks/changxin-688825";
import {
  applyStockDailyPriceOverlay,
  applyStockWeeklyPriceOverlay,
} from "@/lib/data/apply-price-overlays";
import { getAdminClient } from "@/lib/supabase/admin";
import { capIpoConfidence } from "@/lib/data/member-stocks/ipo-rules";
import {
  validateMemberStockDailyPublish,
  validateMemberStockWeeklyPublish,
} from "@/lib/data/member-stocks/publish-rules";
import type {
  MemberBenefitStock,
  MemberStockDailyForecast,
  MemberStockDailyMemberView,
  MemberStockVerificationResult,
  MemberStockWeeklyAnalysis,
  MemberStockWeeklyMemberView,
} from "@/types/member-stock";

export { isIpoHighVolatilityDate, capIpoConfidence } from "@/lib/data/member-stocks/ipo-rules";
export {
  validateMemberStockDailyPublish,
  validateMemberStockWeeklyPublish,
} from "@/lib/data/member-stocks/publish-rules";

const BUCKET = "moonx-data";
const DAILY_FILE = "member-stock-daily.json";
const WEEKLY_FILE = "member-stock-weekly.json";
const VERIFY_FILE = "member-stock-verifications.json";

type Store<T> = { version: 1; updatedAt: string; records: T[] };

function beijingParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

async function readStore<T>(file: string): Promise<T[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data } = await admin.storage.from(BUCKET).download(file);
  if (!data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as Store<T>;
    return parsed.records ?? [];
  } catch {
    return [];
  }
}

async function writeStore<T>(file: string, records: T[]): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
  }
  const body: Store<T> = { version: 1, updatedAt: new Date().toISOString(), records };
  await admin.storage.from(BUCKET).upload(file, JSON.stringify(body, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
}

function mergeById<T extends { id: string }>(seed: T[], stored: T[]): T[] {
  const map = new Map<string, T>();
  // Seed wins over stale storage for the same id (published catalog is source of truth).
  for (const r of stored) map.set(r.id, r);
  for (const r of seed) map.set(r.id, r);
  return [...map.values()];
}

export function listBenefitStocks(): MemberBenefitStock[] {
  return [CHANGXIN_STOCK].filter((s) => s.status === "online");
}

export function getBenefitStock(stockId: string): MemberBenefitStock | null {
  return listBenefitStocks().find((s) => s.stockId === stockId) ?? null;
}

export async function listAllDailyForecasts(): Promise<MemberStockDailyForecast[]> {
  const stored = await readStore<MemberStockDailyForecast>(DAILY_FILE);
  return mergeById(CHANGXIN_DAILY_FORECASTS, stored).map(applyStockDailyPriceOverlay);
}

export async function listAllWeeklyAnalyses(): Promise<MemberStockWeeklyAnalysis[]> {
  const stored = await readStore<MemberStockWeeklyAnalysis>(WEEKLY_FILE);
  return mergeById(CHANGXIN_WEEKLY_ANALYSES, stored).map(applyStockWeeklyPriceOverlay);
}

export async function listStockVerifications(
  stockId?: string
): Promise<MemberStockVerificationResult[]> {
  const all = await readStore<MemberStockVerificationResult>(VERIFY_FILE);
  const filtered = stockId ? all.filter((r) => r.stockId === stockId) : all;
  return filtered.sort((a, b) => b.forecastDate.localeCompare(a.forecastDate));
}

export async function upsertDailyForecast(record: MemberStockDailyForecast): Promise<void> {
  const capped = {
    ...record,
    confidence: capIpoConfidence(record.stockId, record.forecastDate, record.confidence),
  };
  const publishErrors = validateMemberStockDailyPublish(capped);
  if (publishErrors.length) {
    throw new Error(`禁止发布：${publishErrors.join("；")}`);
  }
  const all = await listAllDailyForecasts();
  const next = [capped, ...all.filter((r) => r.id !== capped.id)];
  // Persist only non-seed overrides + all records for simplicity
  await writeStore(DAILY_FILE, next);
}

export async function upsertWeeklyAnalysis(record: MemberStockWeeklyAnalysis): Promise<void> {
  const capped = {
    ...record,
    confidence: capIpoConfidence(record.stockId, record.weekStart, record.confidence),
  };
  const publishErrors = validateMemberStockWeeklyPublish(capped);
  if (publishErrors.length) {
    throw new Error(`禁止发布：${publishErrors.join("；")}`);
  }
  const all = await listAllWeeklyAnalyses();
  await writeStore(
    WEEKLY_FILE,
    [capped, ...all.filter((r) => r.id !== capped.id)]
  );
}

export async function upsertStockVerification(
  result: MemberStockVerificationResult
): Promise<void> {
  const all = await listStockVerifications();
  await writeStore(VERIFY_FILE, [result, ...all.filter((r) => r.forecastId !== result.forecastId)]);
}

export function toDailyMemberView(r: MemberStockDailyForecast): MemberStockDailyMemberView {
  return {
    id: r.id,
    stockId: r.stockId,
    forecastDate: r.forecastDate,
    role: r.role,
    direction: r.direction,
    primaryDirection: r.primaryDirection,
    closingBias: r.closingBias,
    pathDirection: r.pathDirection,
    probabilities: r.probabilities,
    headline: r.headline,
    expectedPath: r.expectedPath,
    keySupport: r.keySupport,
    keyResistance: r.keyResistance,
    invalidation: r.invalidation,
    confirmation: r.confirmation,
    riskNote: r.riskNote,
    riskLevel: r.riskLevel,
    confidence: r.confidence,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    status: r.status,
    visibility: r.visibility,
    accuracyEligible: r.accuracyEligible,
    verificationStatus: r.verificationStatus,
    publicSourceLabel: r.publicSourceLabel,
    priceSnapshot: r.priceSnapshot,
    priceDataSourceLabel: r.priceDataSourceLabel,
    priceSnapshotAtLabel: r.priceSnapshotAtLabel,
  };
}

export function toWeeklyMemberView(r: MemberStockWeeklyAnalysis): MemberStockWeeklyMemberView {
  return {
    id: r.id,
    stockId: r.stockId,
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    overallDirection: r.overallDirection,
    primaryDirection: r.primaryDirection,
    closingBias: r.closingBias,
    pathDirection: r.pathDirection,
    weeklyPath: r.weeklyPath,
    headline: r.headline,
    probabilities: r.probabilities,
    strongWindow: r.strongWindow,
    weakWindow: r.weakWindow,
    keySupport: r.keySupport,
    keyResistance: r.keyResistance,
    invalidation: r.invalidation,
    confirmation: r.confirmation,
    riskNote: r.riskNote,
    riskLevel: r.riskLevel,
    confidence: r.confidence,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    status: r.status,
    visibility: r.visibility,
    publicSourceLabel: r.publicSourceLabel,
    priceSnapshot: r.priceSnapshot,
    priceDataSourceLabel: r.priceDataSourceLabel,
    priceSnapshotAtLabel: r.priceSnapshotAtLabel,
  };
}

/** Resolve published "today" forecast for BJ calendar date (role promotion after 08:00). */
export async function getPublishedTodayForecast(
  stockId: string,
  now = new Date()
): Promise<MemberStockDailyForecast | null> {
  const { date, hour } = beijingParts(now);
  const all = (await listAllDailyForecasts()).filter(
    (r) => r.stockId === stockId && r.status === "published"
  );

  const explicitToday = all.find((r) => r.forecastDate === date && r.role === "today");
  if (explicitToday) return explicitToday;

  // After 08:00 BJ, yesterday's "tomorrow" becomes today's view if dates match
  if (hour >= 8) {
    const promoted = all.find((r) => r.forecastDate === date && r.role === "tomorrow");
    if (promoted) return promoted;
  }

  return all.find((r) => r.forecastDate === date) ?? null;
}

export async function getPublishedTomorrowForecast(
  stockId: string,
  now = new Date()
): Promise<MemberStockDailyForecast | null> {
  const { date, hour } = beijingParts(now);
  const all = (await listAllDailyForecasts()).filter(
    (r) => r.stockId === stockId && r.status === "published" && r.role === "tomorrow"
  );

  // Prefer next-session forecast dated after today, or today's tomorrow before promotion window ends
  const future = all
    .filter((r) => r.forecastDate > date || (r.forecastDate === date && hour < 8))
    .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));
  if (future[0]) return future[0];

  // Also show tomorrow role even if date is next calendar day
  const upcoming = all
    .filter((r) => r.forecastDate >= date)
    .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));
  return upcoming[0] ?? null;
}

export async function getPublishedWeeklyAnalysis(
  stockId: string,
  now = new Date()
): Promise<MemberStockWeeklyAnalysis | null> {
  const { date } = beijingParts(now);
  const all = (await listAllWeeklyAnalyses())
    .filter((r) => r.stockId === stockId && r.status === "published")
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  const covering = all.find((r) => r.weekStart <= date && r.weekEnd >= date);
  return covering ?? all[0] ?? null;
}

export async function stockHasAnyPublishedContent(stockId: string): Promise<boolean> {
  const [today, tomorrow, weekly] = await Promise.all([
    getPublishedTodayForecast(stockId),
    getPublishedTomorrowForecast(stockId),
    getPublishedWeeklyAnalysis(stockId),
  ]);
  return Boolean(today || tomorrow || weekly);
}

export async function listOnlineBenefitStocksWithContent(): Promise<MemberBenefitStock[]> {
  const stocks = listBenefitStocks();
  const out: MemberBenefitStock[] = [];
  for (const s of stocks) {
    if (await stockHasAnyPublishedContent(s.stockId)) out.push(s);
  }
  return out;
}

export function lastUpdatedIso(
  today: MemberStockDailyForecast | null,
  tomorrow: MemberStockDailyForecast | null,
  weekly: MemberStockWeeklyAnalysis | null
): string | null {
  const stamps = [today?.updatedAt, tomorrow?.updatedAt, weekly?.updatedAt].filter(
    Boolean
  ) as string[];
  if (!stamps.length) return null;
  return stamps.sort().at(-1)!;
}
