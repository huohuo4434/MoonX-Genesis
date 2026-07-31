/**
 * Server-only gate for tomorrow forecasts.
 * The autonomous engine publishes continuously. Membership controls visibility,
 * but administrator action and a fixed clock time are never publication dependencies.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import {
  getMemberUserContext,
  type MemberUserContext,
} from "@/lib/access/member-preview";
import { getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import {
  buildTomorrowPublicSummary,
  isHumanPublishedForecast,
  toTeaser,
} from "@/lib/data/daily-forecasts";
import {
  getTomorrowForecastAccessPayload,
  loadTomorrowForecastRows,
} from "@/lib/prediction-access-server";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type { DailyForecast, DailyForecastTeaser, TomorrowForecastPublicSummary } from "@/types/daily-forecast";

export type TomorrowSectionPayload =
  | { mode: "hidden"; publishedBatchExists: boolean; nextDateIso?: string; lastUpdatedLabel?: string }
  | {
      mode: "member";
      summary: TomorrowForecastPublicSummary;
      forecasts: DailyForecast[];
      isPreviewGate: boolean;
      detailHref: string;
      accessReason: "ADMIN" | "ACTIVE_MEMBER";
    };

function buildSummary(ready: DailyForecast[], now: Date): TomorrowForecastPublicSummary {
  const summary = buildTomorrowPublicSummary(now);
  summary.publishedCount = ready.length;
  summary.draftCount = 0;
  summary.allDraft = ready.length === 0;
  summary.assetNames = ready.map((f) => f.assetName);
  summary.teasers = ready.map(toTeaser);
  summary.nextDateLabel = ready[0]
    ? formatDateChina(ready[0].forecastForDate)
    : formatDateChina(getBeijingTomorrowKey(now));
  summary.nextDateIso = ready[0]?.forecastForDate ?? getBeijingTomorrowKey(now);
  summary.lastUpdatedLabel = ready[0]
    ? formatDateTimeChina(
        [...ready].map((f) => f.updatedAt || f.publishedAt).filter(Boolean).sort().at(-1)
      )
    : "—";
  return summary;
}

export async function getTomorrowSectionPayload(now = new Date()): Promise<TomorrowSectionPayload> {
  noStore();
  const [payload, nextBatch] = await Promise.all([
    getTomorrowForecastAccessPayload(now),
    loadTomorrowForecastRows(now),
  ]);
  const readyMeta = nextBatch.filter(isHumanPublishedForecast);
  const summary = buildSummary(readyMeta, now);

  if (!payload.allowed) {
    return {
      mode: "hidden",
      publishedBatchExists: readyMeta.length > 0,
      nextDateIso: summary.nextDateIso,
      lastUpdatedLabel: summary.lastUpdatedLabel,
    };
  }

  const ready = payload.forecasts.filter(isHumanPublishedForecast);
  if (ready.length === 0) {
    return {
      mode: "hidden",
      publishedBatchExists: false,
      nextDateIso: summary.nextDateIso,
      lastUpdatedLabel: summary.lastUpdatedLabel,
    };
  }

  return {
    mode: "member",
    summary: buildSummary(ready, now),
    forecasts: ready,
    isPreviewGate: false,
    detailHref: "/member/tomorrow",
    accessReason: payload.access.reason,
  };
}

export type MemberTomorrowPagePayload =
  | { mode: "hidden"; isAdmin: boolean; adminHint?: string }
  | {
      mode: "member";
      forecasts: DailyForecast[];
      teasers: DailyForecastTeaser[];
      user: MemberUserContext;
      accessReason: "ADMIN" | "ACTIVE_MEMBER";
      batchId: string;
      targetDate: string;
    };

export async function getMemberTomorrowPagePayload(now = new Date()): Promise<MemberTomorrowPagePayload> {
  noStore();
  const [user, section, access] = await Promise.all([
    getMemberUserContext(),
    getTomorrowSectionPayload(now),
    getTomorrowForecastAccessPayload(now),
  ]);

  if (section.mode === "hidden") {
    return {
      mode: "hidden",
      isAdmin: Boolean(user.isAdmin),
      adminHint: user.isAdmin
        ? "自动预测批次暂未生成。系统会在下一轮定时任务继续重试；管理员也可在预测后台手动触发。"
        : undefined,
    };
  }

  if (!access.allowed) {
    return { mode: "hidden", isAdmin: Boolean(user.isAdmin) };
  }

  const ready = section.forecasts.filter(isHumanPublishedForecast);
  if (ready.length === 0) {
    return {
      mode: "hidden",
      isAdmin: Boolean(user.isAdmin),
      adminHint: user.isAdmin ? "自动预测批次为空，请检查周度来源与生成任务。" : undefined,
    };
  }

  const targetDate = ready[0]?.forecastForDate ?? getBeijingTomorrowKey(now);
  const batchId =
    ready
      .map((f) => f.id)
      .sort()
      .join("|")
      .slice(0, 120) || `TOMORROW-${targetDate}`;

  return {
    mode: "member",
    forecasts: ready,
    teasers: ready.map(toTeaser),
    user,
    accessReason: section.accessReason,
    batchId,
    targetDate,
  };
}

/** Public today cards — gated by checkTodayPredictionAccess (fresh membership). */
export async function getTodayPublicForecastPayload(now = new Date()): Promise<{
  forecasts: DailyForecast[];
  verifying: boolean;
  accessAllowed: boolean;
  accessReason: string;
}> {
  const { getTodayForecastAccessPayload } = await import("@/lib/prediction-access-server");
  const payload = await getTodayForecastAccessPayload(now);
  return {
    forecasts: payload.allowed ? payload.forecasts : [],
    verifying: payload.allowed ? payload.verifying : false,
    accessAllowed: payload.allowed,
    accessReason: payload.access.reason,
  };
}
