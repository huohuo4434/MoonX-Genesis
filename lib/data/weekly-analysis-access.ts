/**
 * Server-only gate for weekly analysis.
 * Non-members / non-admins never receive direction / path / levels / probabilities / sourceIds.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import {
  buildWeeklyMarketSlots,
  buildWeeklyPublicSummary,
} from "@/lib/data/weekly-analysis";
import { getWeeklyForecastAccessDecision } from "@/lib/prediction-access-server";
import type {
  WeeklyAnalysisPublicSummary,
  WeeklyMarketSlot,
} from "@/types/weekly-analysis";

export type WeeklySectionPayload =
  | {
      mode: "locked";
      summary: WeeklyAnalysisPublicSummary;
      memberHref: string;
      pricingHref: string;
      accessReason: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED" | "DEVICE_REQUIRED";
    }
  | {
      mode: "member";
      summary: WeeklyAnalysisPublicSummary;
      slots: WeeklyMarketSlot[];
      detailHref: string;
      accessReason: "ADMIN" | "ACTIVE_MEMBER";
    };

export async function getWeeklySectionPayload(now = new Date()): Promise<WeeklySectionPayload> {
  noStore();
  const decision = await getWeeklyForecastAccessDecision();
  const summary = buildWeeklyPublicSummary(now);
  const slots = buildWeeklyMarketSlots(now);

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
    slots,
    detailHref: "/member/weekly",
    accessReason: decision.access.reason,
  };
}

export type MemberWeeklyPagePayload =
  | {
      mode: "locked";
      summary: WeeklyAnalysisPublicSummary;
      accessReason: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED" | "DEVICE_REQUIRED";
    }
  | {
      mode: "member";
      slots: WeeklyMarketSlot[];
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
    slots: payload.slots,
    summary: payload.summary,
    accessReason: payload.accessReason,
  };
}
