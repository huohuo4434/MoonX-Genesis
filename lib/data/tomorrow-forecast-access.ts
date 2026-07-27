/**
 * Server-only gate for tomorrow forecasts.
 * Non-members never receive full DailyForecast objects in RSC props.
 */
import "server-only";

import {
  canAccessForecast,
  getMemberUserContext,
  type MemberUserContext,
} from "@/lib/access/member-preview";
import {
  buildTomorrowPublicSummary,
  getAllMemberForecasts,
  getMemberTomorrowForecasts,
  getPublicTodayForecasts,
  isHumanPublishedForecast,
  toTeaser,
} from "@/lib/data/daily-forecasts";
import type { DailyForecast, DailyForecastTeaser, TomorrowForecastPublicSummary } from "@/types/daily-forecast";

export type TomorrowSectionPayload =
  | {
      mode: "locked";
      summary: TomorrowForecastPublicSummary;
      memberHref: string;
      pricingHref: string;
    }
  | {
      mode: "member";
      summary: TomorrowForecastPublicSummary;
      forecasts: DailyForecast[];
      isPreviewGate: boolean;
      detailHref: string;
    };

export async function getTomorrowSectionPayload(now = new Date()): Promise<TomorrowSectionPayload> {
  const user = await getMemberUserContext();
  const summary = buildTomorrowPublicSummary(now);

  if (!user.isMember) {
    return {
      mode: "locked",
      summary,
      memberHref: "/member/tomorrow",
      pricingHref: "/pricing",
    };
  }

  // Only serialize full records for members. Drafts stay visible as "研究尚未完成".
  const forecasts = getMemberTomorrowForecasts(now).filter(
    (f) => canAccessForecast(user, f.accessLevel) || f.status === "draft"
  );

  return {
    mode: "member",
    summary,
    forecasts,
    isPreviewGate: user.isPreviewGate,
    detailHref: "/member/tomorrow",
  };
}

export type MemberTomorrowPagePayload =
  | { mode: "locked"; summary: TomorrowForecastPublicSummary }
  | {
      mode: "member";
      forecasts: DailyForecast[];
      teasers: DailyForecastTeaser[];
      user: MemberUserContext;
    };

export async function getMemberTomorrowPagePayload(now = new Date()): Promise<MemberTomorrowPagePayload> {
  const user = await getMemberUserContext();
  const summary = buildTomorrowPublicSummary(now);

  if (!user.isMember) {
    return { mode: "locked", summary };
  }

  const forecasts = getAllMemberForecasts(now).filter((f) => {
    if (f.status === "draft") return true;
    return canAccessForecast(user, f.accessLevel);
  });

  return {
    mode: "member",
    forecasts,
    teasers: forecasts.map(toTeaser),
    user,
  };
}

/** Public today cards — full public fields only (already accessLevel public). */
export async function getTodayPublicForecastPayload(now = new Date()): Promise<{
  forecasts: DailyForecast[];
  verifying: boolean;
}> {
  const forecasts = getPublicTodayForecasts(now);
  return {
    forecasts,
    verifying: forecasts.some((f) => !isHumanPublishedForecast(f) || f.status === "published"),
  };
}
