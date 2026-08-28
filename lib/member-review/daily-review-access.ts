import "server-only";

import { listDailyForecastRecords, listDailyReviews, listDailyVerificationResults } from "@/lib/data/moonx-data-store";
import { getWeeklySourceForMarketDate } from "@/lib/weekly-source/store";
import { buildMemberDailyReviewReports } from "@/lib/member-review/daily-review-report";
import { listStaticFocusEvidence } from "@/lib/data/conviction/access";
import { focusDailyQuoteCapability } from "@/lib/data/conviction/focus-daily-generation-core";
import { STATIC_MEMBER_AUTOMATION_FOCUS } from "@/lib/data/conviction/focus-registry-core";
import type { DailyForecastRecord } from "@/types/daily-accuracy";

const CORE_SOURCE_MARKET: Readonly<Record<string, string>> = Object.freeze({
  BTC: "BTC",
  ETH: "ETH",
  SPX: "SPX",
  NDX: "NDX",
  SSEC: "SHCOMP",
  HSTECH: "HSTECH",
  GOLD: "GOLD",
  GLD: "GOLD",
  SILVER: "SILVER",
  WTI: "WTI",
});

export type MemberReviewCoverageItem = {
  assetId: string;
  assetName: string;
  symbol: string;
  status: "AUTO" | "SYNCING" | "NEEDS_SOURCE" | "MANUAL_ACTUAL";
  label: string;
  detail: string;
};

const NO_CANONICAL_ACTUAL = new Set(["asteroid", "spcx"]);
const CORE_FOCUS_RECORD_SYMBOL: Readonly<Record<string, string>> = Object.freeze({
  btc: "BTC",
  eth: "ETH",
  gold: "GOLD",
  silver: "SILVER",
  "wti-crude": "WTI",
});

function currentFormalSource(
  forecasts: Awaited<ReturnType<typeof listStaticFocusEvidence>>[number]["forecasts"],
  today: string,
  nowMs: number
) {
  return forecasts
    .filter((forecast) => forecast.status === "published")
    .filter((forecast) => Date.parse(forecast.publishedAt) <= nowMs && Date.parse(forecast.lockedAt) <= nowMs)
    .filter((forecast) => forecast.periodStart <= today && today <= forecast.periodEnd)
    .sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt))[0] ?? null;
}

async function buildCoverage(forecasts: DailyForecastRecord[], now: Date): Promise<MemberReviewCoverageItem[]> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
  const evidence = await listStaticFocusEvidence().catch(() => []);
  return evidence.map((asset): MemberReviewCoverageItem => {
    const definition = STATIC_MEMBER_AUTOMATION_FOCUS[asset.assetId as keyof typeof STATIC_MEMBER_AUTOMATION_FOCUS];
    const displayName = definition?.displayName ?? asset.symbol;
    const source = currentFormalSource(asset.forecasts, today, now.getTime());
    if (!source) {
      return {
        assetId: asset.assetId,
        assetName: displayName,
        symbol: asset.symbol,
        status: "NEEDS_SOURCE",
        label: "待补正式周期依据",
        detail: "请补当前或下一周期完整周卦；没有周卦时不从年卦、月卦硬拆日方向。",
      };
    }
    const quote = focusDailyQuoteCapability({ symbol: asset.symbol, assetType: asset.assetType, exchange: asset.exchange });
    if (NO_CANONICAL_ACTUAL.has(asset.assetId) || !quote.available || !quote.quoteSymbol) {
      return {
        assetId: asset.assetId,
        assetName: displayName,
        symbol: asset.symbol,
        status: "MANUAL_ACTUAL",
        label: "实际走势需人工复核",
        detail: "暂时没有可确认的同标的公开日线，不能拿名称相似的行情代替并自动打分。",
      };
    }
    const recordSymbol = CORE_FOCUS_RECORD_SYMBOL[asset.assetId] ?? asset.symbol.trim().toUpperCase();
    const synced = forecasts.some((forecast) =>
      (CORE_FOCUS_RECORD_SYMBOL[asset.assetId] ? forecast.visibility !== "MEMBER" : forecast.visibility === "MEMBER") &&
      forecast.symbol.trim().toUpperCase() === recordSymbol &&
      forecast.forecastDate >= source.periodStart &&
      forecast.forecastDate <= source.periodEnd
    );
    return synced
      ? { assetId: asset.assetId, assetName: displayName, symbol: asset.symbol, status: "AUTO", label: "自动复盘已接通", detail: "收盘后自动验证并进入会员复盘。" }
      : { assetId: asset.assetId, assetName: displayName, symbol: asset.symbol, status: "SYNCING", label: "等待首轮同步", detail: "正式周卦已具备，自动验证将在后续小时轮次接入。" };
  });
}

async function enrichCoreSource(forecast: DailyForecastRecord): Promise<DailyForecastRecord> {
  if (forecast.sourcePrimaryHexagram) return forecast;
  const marketCode = CORE_SOURCE_MARKET[forecast.symbol.trim().toUpperCase()];
  if (!marketCode) return forecast;
  const source = await getWeeklySourceForMarketDate(marketCode, forecast.forecastDate).catch(() => null);
  if (!source) return forecast;
  if (forecast.sourceForecastId && source.id !== forecast.sourceForecastId) return forecast;
  const sourceLockedAt = Date.parse(source.lockedAt ?? source.publishedAt ?? source.createdAt);
  const forecastPublishedAt = Date.parse(forecast.publishedAt);
  if (Number.isFinite(sourceLockedAt) && Number.isFinite(forecastPublishedAt) && sourceLockedAt > forecastPublishedAt) {
    return forecast;
  }
  return {
    ...forecast,
    sourceForecastId: source.id,
    sourcePeriodStart: source.periodStart,
    sourcePeriodEnd: source.periodEnd,
    sourcePrimaryHexagram: source.primaryHexagram,
    sourceChangedHexagram: source.changedHexagram,
    sourceInterpretation: source.interpretation,
    sourceWeeklyDirection: source.weeklyDirection,
  };
}

export async function getMemberDailyReviewReports(now = new Date()) {
  const [forecasts, results, reviews] = await Promise.all([
    listDailyForecastRecords(),
    listDailyVerificationResults(),
    listDailyReviews(),
  ]);
  const enriched = await Promise.all(forecasts.map(enrichCoreSource));
  const [reports, coverage] = await Promise.all([
    Promise.resolve(buildMemberDailyReviewReports({ forecasts: enriched, results, reviews, now, maxDays: 14 })),
    buildCoverage(enriched, now),
  ]);
  return { reports, coverage };
}
