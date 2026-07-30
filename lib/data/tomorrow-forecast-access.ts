/**
 * Server-only gate for tomorrow forecasts.
 * Before Beijing 20:00 or without PUBLISHED rows: hide the entire module (no shells).
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import {
  getMemberUserContext,
  type MemberUserContext,
} from "@/lib/access/member-preview";
import { getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import { formalBatchReady } from "@/lib/calendar/publish-windows";
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
  | { mode: "hidden" }
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

  // Public/member UI: never show shells before 20:00 or without a published batch.
  if (!formalBatchReady(now) || readyMeta.length === 0) {
    if (payload.allowed && payload.access.reason === "ADMIN") {
      // Admins still get rows (including drafts) only via admin pages — not this public module.
    }
    return { mode: "hidden" };
  }

  if (!payload.allowed) {
    return { mode: "hidden" };
  }

  const ready = payload.forecasts.filter(isHumanPublishedForecast);
  if (ready.length === 0) return { mode: "hidden" };

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
    const after = formalBatchReady(now);
    return {
      mode: "hidden",
      isAdmin: Boolean(user.isAdmin),
      adminHint: user.isAdmin
        ? after
          ? "下一交易日预测仍未正式发布或未通过技术价位校验（TECHNICAL_PRICE_DATA_UNAVAILABLE / 禁止表达）。"
          : "北京时间20:00前不向会员展示下一交易日模块；草稿仅在后台可见。"
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
      adminHint: user.isAdmin
        ? "正式批次为空：请检查生成任务与发布校验。"
        : undefined,
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
  if (!payload.allowed) {
    return {
      forecasts: [],
      verifying: false,
      accessAllowed: false,
      accessReason: payload.access.reason,
    };
  }
  return {
    forecasts: payload.forecasts,
    verifying: payload.verifying,
    accessAllowed: true,
    accessReason: payload.access.reason,
  };
}
