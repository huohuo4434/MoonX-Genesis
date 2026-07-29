/**
 * Server-only access gate for member benefit stocks.
 * Non-members never receive direction / path / levels / probabilities / sourceIds.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { getMemberUserContext } from "@/lib/access/member-preview";
import { hasConvictionFullAccess } from "@/lib/data/conviction/access-mode";
import {
  getBenefitStock,
  getPublishedTodayForecast,
  getPublishedTomorrowForecast,
  getPublishedWeeklyAnalysis,
  lastUpdatedIso,
  listOnlineBenefitStocksWithContent,
  listStockVerifications,
  toDailyMemberView,
  toWeeklyMemberView,
} from "@/lib/data/member-stocks/store";
import { isIpoHighVolatilityDate } from "@/lib/data/member-stocks/ipo-rules";
import type {
  MemberBenefitStock,
  MemberStockDailyMemberView,
  MemberStockLockedCard,
  MemberStockVerificationResult,
  MemberStockWeeklyMemberView,
} from "@/types/member-stock";

function toLockedCard(stock: MemberBenefitStock): MemberStockLockedCard {
  return {
    stockId: stock.stockId,
    name: stock.name,
    symbol: stock.symbol,
    marketLabel: stock.marketLabel,
    tags: stock.tags,
    analysisReady: true,
    locked: true,
  };
}

export type MemberStocksListPayload =
  | { mode: "locked"; stocks: MemberStockLockedCard[] }
  | {
      mode: "member";
      stocks: Array<{
        stock: MemberBenefitStock;
        todayDirection?: string;
        todayHeadline?: string;
        updatedAt?: string | null;
      }>;
    };

export async function getMemberStocksListPayload(): Promise<MemberStocksListPayload> {
  noStore();
  const access = await getAccessUser();
  const stocks = await listOnlineBenefitStocksWithContent();
  // Admin / active member only — do NOT reuse canAccessTomorrow (registered@08:00 ≠ member).
  if (!hasConvictionFullAccess(access)) {
    return { mode: "locked", stocks: stocks.map(toLockedCard) };
  }

  const rows = [];
  for (const stock of stocks) {
    const today = await getPublishedTodayForecast(stock.stockId);
    const tomorrow = await getPublishedTomorrowForecast(stock.stockId);
    const weekly = await getPublishedWeeklyAnalysis(stock.stockId);
    rows.push({
      stock,
      todayDirection: today?.direction,
      todayHeadline: today?.headline,
      updatedAt: lastUpdatedIso(today, tomorrow, weekly),
    });
  }
  return { mode: "member", stocks: rows };
}

export type MemberStockDetailPayload =
  | {
      mode: "locked";
      card: MemberStockLockedCard;
      hasToday: boolean;
      hasTomorrow: boolean;
      hasWeekly: boolean;
    }
  | {
      mode: "member";
      stock: MemberBenefitStock;
      today: MemberStockDailyMemberView | null;
      tomorrow: MemberStockDailyMemberView | null;
      weekly: MemberStockWeeklyMemberView | null;
      updatedAt: string | null;
      riskLevel: string | null;
      ipoHighVolWarning: boolean;
      isAdmin: boolean;
      sourceIds?: string[];
    };

export async function getMemberStockDetailPayload(
  stockId: string
): Promise<MemberStockDetailPayload | null> {
  noStore();
  const stock = getBenefitStock(stockId);
  if (!stock) return null;
  const [today, tomorrow, weekly] = await Promise.all([
    getPublishedTodayForecast(stockId),
    getPublishedTomorrowForecast(stockId),
    getPublishedWeeklyAnalysis(stockId),
  ]);
  if (!today && !tomorrow && !weekly) return null;

  const access = await getAccessUser();
  const user = await getMemberUserContext();
  const updatedAt = lastUpdatedIso(today, tomorrow, weekly);
  const riskLevel = today?.riskLevel ?? tomorrow?.riskLevel ?? weekly?.riskLevel ?? null;
  const ipoHighVolWarning = Boolean(
    (today && isIpoHighVolatilityDate(stockId, today.forecastDate)) ||
      (tomorrow && isIpoHighVolatilityDate(stockId, tomorrow.forecastDate)) ||
      (weekly && isIpoHighVolatilityDate(stockId, weekly.weekStart))
  );

  if (!hasConvictionFullAccess(access)) {
    return {
      mode: "locked",
      card: toLockedCard(stock),
      hasToday: Boolean(today),
      hasTomorrow: Boolean(tomorrow),
      hasWeekly: Boolean(weekly),
    };
  }

  const sourceIds = access.isAdmin
    ? [
        ...(today?.sourceIds ?? []),
        ...(tomorrow?.sourceIds ?? []),
        ...(weekly?.sourceIds ?? []),
      ]
    : undefined;

  return {
    mode: "member",
    stock,
    today: today ? toDailyMemberView(today) : null,
    tomorrow: tomorrow ? toDailyMemberView(tomorrow) : null,
    weekly: weekly ? toWeeklyMemberView(weekly) : null,
    updatedAt,
    riskLevel,
    ipoHighVolWarning,
    isAdmin: access.isAdmin || user.isAdmin,
    sourceIds: sourceIds?.length ? [...new Set(sourceIds)] : undefined,
  };
}

export type MemberStockHistoryPayload =
  | { mode: "locked"; card: MemberStockLockedCard }
  | {
      mode: "member";
      stock: MemberBenefitStock;
      results: MemberStockVerificationResult[];
      sampleNote: string | null;
      hitRate: number | null;
    };

export async function getMemberStockHistoryPayload(
  stockId: string
): Promise<MemberStockHistoryPayload | null> {
  noStore();
  const stock = getBenefitStock(stockId);
  if (!stock) return null;
  const access = await getAccessUser();
  if (!hasConvictionFullAccess(access)) {
    return { mode: "locked", card: toLockedCard(stock) };
  }
  const results = await listStockVerifications(stockId);
  const scored = results.filter((r) => r.verdict === "hit" || r.verdict === "miss");
  const hitRate =
    scored.length >= 5 ? scored.filter((r) => r.verdict === "hit").length / scored.length : null;
  return {
    mode: "member",
    stock,
    results,
    sampleNote:
      scored.length < 5 ? "样本数量较少，暂不展示稳定准确率。" : null,
    hitRate,
  };
}

export async function getHomeMemberStockPayload(): Promise<{
  visible: boolean;
  mode: "locked" | "member";
  name: string;
  symbol: string;
  stockId: string;
  todayDirection?: string;
  todayHeadline?: string;
  updatedAt?: string | null;
} | null> {
  noStore();
  const stocks = await listOnlineBenefitStocksWithContent();
  const stock = stocks[0];
  if (!stock) return null;
  const access = await getAccessUser();
  const today = await getPublishedTodayForecast(stock.stockId);
  const tomorrow = await getPublishedTomorrowForecast(stock.stockId);
  const weekly = await getPublishedWeeklyAnalysis(stock.stockId);
  if (!hasConvictionFullAccess(access)) {
    return {
      visible: true,
      mode: "locked",
      name: stock.name,
      symbol: stock.symbol,
      stockId: stock.stockId,
    };
  }
  return {
    visible: true,
    mode: "member",
    name: stock.name,
    symbol: stock.symbol,
    stockId: stock.stockId,
    todayDirection: today?.direction,
    todayHeadline: today?.headline,
    updatedAt: lastUpdatedIso(today, tomorrow, weekly),
  };
}
