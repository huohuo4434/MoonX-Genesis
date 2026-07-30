import "server-only";

import { getFeatureFlags, type FeatureFlags } from "@/lib/feature-flags";
import {
  getAllMemberForecasts,
  getPublicTodayForecasts,
  getTomorrowCoreForecasts,
  isHumanPublishedForecast,
} from "@/lib/data/daily-forecasts";
import { listResearchRecords } from "@/lib/data/research-records";
import { resolveResearchVisibility } from "@/lib/research/visibility";
import { isActiveMember, isAdmin, listAllAuthUsers } from "@/lib/auth/permissions";
import { countPendingPaymentOrders } from "@/lib/payments/payment-orders-store";

export interface AdminDashboardStats {
  todayForecastStatus: string;
  tomorrowForecastStatus: string;
  pendingResearchCount: number;
  recentResearch: Array<{ id: string; title: string; publishedAt: string; visibility: string }>;
  featureFlags: FeatureFlags;
  pendingForecasts: number;
  pendingPayments: number;
  manualReviewOrders: number;
  activeMembers: number;
  expiringSoon: number;
  recentPaid: Array<{
    orderNumber: string;
    paidAmount: number | null;
    chain: string;
    paidAt: string | null;
    txHash: string | null;
  }>;
}

function forecastStatusLabel(count: number, pending: number): string {
  if (count === 0) return "尚未发布";
  if (pending > 0) return `已发布 ${count} 条 · ${pending} 条待审核`;
  return `已发布 ${count} 条`;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const now = new Date();
  const flags = getFeatureFlags();
  const todayPublished = getPublicTodayForecasts(now);
  const tomorrowSlots = getTomorrowCoreForecasts(now);
  const tomorrowPublished = tomorrowSlots.filter(isHumanPublishedForecast);
  const tomorrowPending = tomorrowSlots.filter((f) => !isHumanPublishedForecast(f)).length;

  const allRecords = await listResearchRecords();
  const pendingResearchCount = allRecords.filter(
    (r) =>
      resolveResearchVisibility(r) !== "public" ||
      r.humanReviewStatus === "pending-review" ||
      r.status === "pending"
  ).length;
  const recentResearch = [...allRecords]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: r.title.zhCN ?? r.id,
      publishedAt: r.publishedAt,
      visibility: resolveResearchVisibility(r),
    }));

  const forecasts = getAllMemberForecasts();
  const pendingForecasts = forecasts.filter((f) => f.status === "draft" || f.status === "reviewed").length;

  const users = await listAllAuthUsers();
  const pendingPayments = await countPendingPaymentOrders();
  const activeMembers = users.filter((u) => isActiveMember(u) && !isAdmin(u)).length;
  const soon = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const expiringSoon = users.filter((u) => {
    if (isAdmin(u) || !isActiveMember(u)) return false;
    const exp = u.app_metadata.membership_expires_at;
    if (!exp) return false;
    const t = new Date(exp).getTime();
    return t > now.getTime() && t <= soon;
  }).length;

  return {
    todayForecastStatus: forecastStatusLabel(todayPublished.length, 0),
    tomorrowForecastStatus: forecastStatusLabel(tomorrowPublished.length, tomorrowPending),
    pendingResearchCount,
    recentResearch,
    featureFlags: flags,
    pendingForecasts,
    pendingPayments,
    manualReviewOrders: pendingPayments,
    activeMembers,
    expiringSoon,
    recentPaid: [],
  };
}
