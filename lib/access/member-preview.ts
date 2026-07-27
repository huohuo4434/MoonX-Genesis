/**
 * Member access for daily forecasts.
 * Real login/payment not wired — reuses MOONX_MEMBER_PREVIEW cookie / env gate.
 *
 * NOTE: Full payment and account systems still need to be connected later.
 */
import "server-only";

import { cookies } from "next/headers";
import type { ForecastAccessLevel } from "@/types/daily-forecast";

export type MemberAccessLevel = "public" | "member" | "premium";

export const MEMBER_PREVIEW_COOKIE = "moonx_member_preview";

export interface MemberUserContext {
  /** Effective plan for gating. */
  plan: MemberAccessLevel;
  /** True when preview cookie or MOONX_MEMBER_PREVIEW=true. */
  isMember: boolean;
  isPremium: boolean;
  /** Development / closed-beta preview only. */
  isPreviewGate: boolean;
}

export async function getMemberUserContext(): Promise<MemberUserContext> {
  // Always read cookies so routes that gate on membership stay dynamic
  // and are never statically prerendered with the wrong access level.
  const cookieStore = await cookies();

  // Explicit env unlock for local/staging preview (no real payment).
  if (process.env.MOONX_MEMBER_PREVIEW === "true") {
    return { plan: "member", isMember: true, isPremium: false, isPreviewGate: true };
  }

  const configuredKey = process.env.MOONX_MEMBER_PREVIEW_KEY;
  if (!configuredKey) {
    return { plan: "public", isMember: false, isPremium: false, isPreviewGate: false };
  }

  const unlocked = cookieStore.get(MEMBER_PREVIEW_COOKIE)?.value === configuredKey;
  if (unlocked) {
    return { plan: "member", isMember: true, isPremium: false, isPreviewGate: true };
  }

  return { plan: "public", isMember: false, isPremium: false, isPreviewGate: false };
}

/** Back-compat for technical page / existing callers. */
export async function getAccessLevel(): Promise<"public" | "member"> {
  const ctx = await getMemberUserContext();
  return ctx.isMember ? "member" : "public";
}

export function canAccessForecast(
  user: MemberUserContext | null | undefined,
  accessLevel: ForecastAccessLevel
): boolean {
  if (accessLevel === "public") return true;
  if (!user) return false;
  if (accessLevel === "member") return user.isMember || user.isPremium;
  if (accessLevel === "premium") return user.isPremium;
  return false;
}

export function canViewDelayedPublic(memberAvailableAt: string, now = new Date()): boolean {
  return now.getTime() >= new Date(memberAvailableAt).getTime() + 24 * 60 * 60 * 1000;
}
