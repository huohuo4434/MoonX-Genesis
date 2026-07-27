import "server-only";

import { cookies } from "next/headers";

export type AccessLevel = "public" | "member";
export const MEMBER_PREVIEW_COOKIE = "moonx_member_preview";

export async function getAccessLevel(): Promise<AccessLevel> {
  const configuredKey = process.env.MOONX_MEMBER_PREVIEW_KEY;
  if (!configuredKey) return "public";
  const cookieStore = await cookies();
  return cookieStore.get(MEMBER_PREVIEW_COOKIE)?.value === configuredKey ? "member" : "public";
}

export function canViewDelayedPublic(memberAvailableAt: string, now = new Date()): boolean {
  return now.getTime() >= new Date(memberAvailableAt).getTime() + 24 * 60 * 60 * 1000;
}
