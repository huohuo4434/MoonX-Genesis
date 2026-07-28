/**
 * Server-only gate for weekly analysis.
 * Non-members / non-admins never receive direction / path / levels / probabilities / sourceIds.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import {
  buildWeeklyPublicSummary,
  listPublishedWeeklyAnalyses,
  toWeeklyMemberView,
} from "@/lib/data/weekly-analysis";
import { getWeeklyForecastAccessDecision } from "@/lib/prediction-access-server";
import type {
  WeeklyAnalysisMemberView,
  WeeklyAnalysisPublicSummary,
} from "@/types/weekly-analysis";

export type WeeklySectionPayload =
  | {
      mode: "locked";
      summary: WeeklyAnalysisPublicSummary;
      memberHref: string;
      pricingHref: string;
      accessReason: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED";
    }
  | {
      mode: "member";
      summary: WeeklyAnalysisPublicSummary;
      analyses: WeeklyAnalysisMemberView[];
      detailHref: string;
      accessReason: "ADMIN" | "ACTIVE_MEMBER";
    };

export async function getWeeklySectionPayload(): Promise<WeeklySectionPayload> {
  noStore();
  const decision = await getWeeklyForecastAccessDecision();
  const summary = buildWeeklyPublicSummary();
  const published = listPublishedWeeklyAnalyses().map(toWeeklyMemberView);

  if (!decision.allowed) {
    return {
      mode: "locked",
      summary,
      memberHref: "/member/weekly",
      pricingHref: "/pricing",
      accessReason: decision.access.reason,
    };
  }

  return {
    mode: "member",
    summary,
    analyses: published,
    detailHref: "/member/weekly",
    accessReason: decision.access.reason,
  };
}

export type MemberWeeklyPagePayload =
  | {
      mode: "locked";
      summary: WeeklyAnalysisPublicSummary;
      accessReason: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED";
    }
  | {
      mode: "member";
      analyses: WeeklyAnalysisMemberView[];
      summary: WeeklyAnalysisPublicSummary;
      accessReason: "ADMIN" | "ACTIVE_MEMBER";
    };

export async function getMemberWeeklyPagePayload(): Promise<MemberWeeklyPagePayload> {
  noStore();
  const payload = await getWeeklySectionPayload();
  if (payload.mode === "locked") {
    return {
      mode: "locked",
      summary: payload.summary,
      accessReason: payload.accessReason,
    };
  }
  return {
    mode: "member",
    analyses: payload.analyses,
    summary: payload.summary,
    accessReason: payload.accessReason,
  };
}
