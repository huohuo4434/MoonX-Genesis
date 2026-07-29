/**
 * Server-only gate for tomorrow forecasts.
 * Never falls back to Wave / analyst intelligence data.
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
import { getTomorrowForecastAccessPayload } from "@/lib/prediction-access-server";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type { DailyForecast, DailyForecastTeaser, TomorrowForecastPublicSummary } from "@/types/daily-forecast";

export type TomorrowSectionPayload =
  | {
      mode: "locked";
      summary: TomorrowForecastPublicSummary;
      memberHref: string;
      pricingHref: string;
      accessReason: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED";
    }
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
  const payload = await getTomorrowForecastAccessPayload(now);
  const ready = payload.allowed ? payload.forecasts.filter(isHumanPublishedForecast) : [];
  const summary = buildSummary(ready, now);

  if (!payload.allowed) {
    return {
      mode: "locked",
      summary,
      memberHref: "/member/tomorrow",
      pricingHref: "/pricing",
      accessReason: payload.access.reason,
    };
  }

  return {
    mode: "member",
    summary,
    forecasts: ready,
    isPreviewGate: false,
    detailHref: "/member/tomorrow",
    accessReason: payload.access.reason,
  };
}

export type MemberTomorrowPagePayload =
  | {
      mode: "locked";
      summary: TomorrowForecastPublicSummary;
      accessReason: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED";
    }
  | {
      mode: "empty";
      targetDate: string;
      accessReason: "ADMIN" | "ACTIVE_MEMBER";
      isAdmin: boolean;
    }
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
  const [user, section] = await Promise.all([
    getMemberUserContext(),
    getTomorrowSectionPayload(now),
  ]);

  if (section.mode === "locked") {
    return {
      mode: "locked",
      summary: section.summary,
      accessReason: section.accessReason,
    };
  }

  const ready = section.forecasts.filter(isHumanPublishedForecast);
  const targetDate = ready[0]?.forecastForDate ?? getBeijingTomorrowKey(now);

  if (ready.length === 0) {
    return {
      mode: "empty",
      targetDate,
      accessReason: section.accessReason,
      isAdmin: Boolean(user.isAdmin),
    };
  }

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
