import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import {
  hasVerifiedMonthlyCycleEvidence,
  hasVerifiedWeeklyCycleEvidence,
} from "@/lib/data/cycle-evidence-coverage";
import { listMonthlyMarketCycles } from "@/lib/data/monthly-market-outlook";
import {
  listAllPublishedWeeklyAnalyses,
  resolveWeeklyDisplayWindow,
  WEEKLY_CORE_MARKETS,
} from "@/lib/data/weekly-analysis";
import type { ConsultationKind, ConsultationStatus } from "@/types/member-consultation";

type ConsultationQueueRow = {
  kind: ConsultationKind | string;
  status: ConsultationStatus | string;
};

export type ConsultationQueueSummary = {
  total: number;
  liuyao: number;
  bazi: number;
  awaitingDraft: number;
  awaitingReview: number;
  needsInfo: number;
  failed: number;
};

export type AdminCycleGapItem = {
  assetId: string;
  assetName: string;
  weeklyMissing: boolean;
  monthlyState: "MISSING" | "INCOMPLETE" | null;
};

export type AdminCycleGapSummary = {
  weeklyStart: string;
  weeklyEnd: string;
  monthlyId: string;
  monthlyLabel: string;
  taskCount: number;
  blockingTaskCount: number;
  actionTaskCount: number;
  preparationTaskCount: number;
  urgency: AdminCycleGapUrgency | null;
  items: AdminCycleGapItem[];
};

export type AdminCycleGapUrgency = "PREPARATION" | "ACTION" | "BLOCKER";

const AWAITING_DRAFT = new Set<ConsultationStatus>(["SUBMITTED", "AI_DRAFTING"]);
const AWAITING_REVIEW = new Set<ConsultationStatus>(["DRAFT_READY", "HUMAN_REVIEW"]);

function addUtcDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function utcDayNumber(iso: string): number {
  return Date.parse(`${iso}T12:00:00Z`) / 86_400_000;
}

export function classifyCycleGapUrgency(input: {
  today: string;
  periodStart: string;
}): AdminCycleGapUrgency {
  const daysUntilStart = Math.round(utcDayNumber(input.periodStart) - utcDayNumber(input.today));
  if (daysUntilStart <= 3) return "BLOCKER";
  if (daysUntilStart <= 7) return "ACTION";
  return "PREPARATION";
}

function nextMonthId(now: Date): string {
  const today = getBeijingTodayKey(now);
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year!, month!, 1)).toISOString().slice(0, 7);
}

export function summarizeConsultationQueue(rows: ConsultationQueueRow[]): ConsultationQueueSummary {
  const actionable = rows.filter((row) =>
    AWAITING_DRAFT.has(row.status as ConsultationStatus) ||
    AWAITING_REVIEW.has(row.status as ConsultationStatus) ||
    row.status === "NEEDS_INFO" ||
    row.status === "SYSTEM_FAILED"
  );

  return {
    total: actionable.length,
    liuyao: actionable.filter((row) => row.kind === "LIUYAO").length,
    bazi: actionable.filter((row) => row.kind === "BAZI").length,
    awaitingDraft: actionable.filter((row) => AWAITING_DRAFT.has(row.status as ConsultationStatus)).length,
    awaitingReview: actionable.filter((row) => AWAITING_REVIEW.has(row.status as ConsultationStatus)).length,
    needsInfo: actionable.filter((row) => row.status === "NEEDS_INFO").length,
    failed: actionable.filter((row) => row.status === "SYSTEM_FAILED").length,
  };
}

/**
 * Admin preparation window: one complete week beyond the week currently shown
 * to members, plus the next calendar month. This gives the editor a full week
 * of lead time without treating old forecasts as current content.
 */
export function buildAdminCycleGapSummary(now = new Date()): AdminCycleGapSummary {
  const today = getBeijingTodayKey(now);
  const memberWindow = resolveWeeklyDisplayWindow(now);
  const weeklyStart = addUtcDays(memberWindow.weekStart, 7);
  const weeklyEnd = addUtcDays(weeklyStart, 6);
  const publishedWeekly = listAllPublishedWeeklyAnalyses();
  const monthlyId = nextMonthId(now);
  const monthlyCycle = listMonthlyMarketCycles().find((cycle) => cycle.id === monthlyId);
  const monthlyByAsset = new Map((monthlyCycle?.items ?? []).map((item) => [item.assetId, item]));

  const items = WEEKLY_CORE_MARKETS.map((market): AdminCycleGapItem => {
    const hasPublishedWeekly = publishedWeekly.some(
      (record) =>
        record.assetId === market.assetId &&
        record.weekStart === weeklyStart &&
        record.weekEnd === weeklyEnd
    );
    const weeklyMissing = !hasPublishedWeekly && !hasVerifiedWeeklyCycleEvidence(
      market.assetId,
      weeklyStart,
      weeklyEnd,
    );
    const monthly = monthlyByAsset.get(market.assetId);
    const hasMonthlyEvidence = hasVerifiedMonthlyCycleEvidence(market.assetId, monthlyId);
    const monthlyState = monthly == null
      ? (hasMonthlyEvidence ? null : "MISSING")
      : (monthly.sourceComplete || hasMonthlyEvidence ? null : "INCOMPLETE");

    return {
      assetId: market.assetId,
      assetName: market.assetName,
      weeklyMissing,
      monthlyState,
    };
  }).filter((item) => item.weeklyMissing || item.monthlyState !== null);

  const [monthlyYear, monthlyMonth] = monthlyId.split("-");
  const weeklyUrgency = classifyCycleGapUrgency({ today, periodStart: weeklyStart });
  const monthlyStart = `${monthlyId}-01`;
  const monthlyUrgency = classifyCycleGapUrgency({ today, periodStart: monthlyStart });
  const urgencyCounts = items.reduce(
    (counts, item) => {
      if (item.weeklyMissing) counts[weeklyUrgency] += 1;
      if (item.monthlyState !== null) counts[monthlyUrgency] += 1;
      return counts;
    },
    { PREPARATION: 0, ACTION: 0, BLOCKER: 0 } as Record<AdminCycleGapUrgency, number>,
  );
  const urgency: AdminCycleGapUrgency | null = urgencyCounts.BLOCKER > 0
    ? "BLOCKER"
    : urgencyCounts.ACTION > 0
      ? "ACTION"
      : urgencyCounts.PREPARATION > 0
        ? "PREPARATION"
        : null;
  return {
    weeklyStart,
    weeklyEnd,
    monthlyId,
    monthlyLabel: `${monthlyYear}年${Number(monthlyMonth)}月`,
    taskCount: items.reduce(
      (total, item) => total + Number(item.weeklyMissing) + Number(item.monthlyState !== null),
      0
    ),
    blockingTaskCount: urgencyCounts.BLOCKER,
    actionTaskCount: urgencyCounts.ACTION,
    preparationTaskCount: urgencyCounts.PREPARATION,
    urgency,
    items,
  };
}
