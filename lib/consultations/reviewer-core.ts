import { CONSULTATION_REVIEWER_DISPLAY_NAME } from "@/types/member-consultation";

export function authorizePrimaryReviewer(input: { userId: string | null; email: string | null; isAdmin: boolean; env?: NodeJS.ProcessEnv }) {
  const env = input.env ?? process.env;
  const trustedId = env.MOOX_PRIMARY_REVIEWER_USER_ID?.trim();
  const trustedEmail = env.MOOX_PRIMARY_REVIEWER_EMAIL?.trim().toLowerCase();
  const ok = Boolean(input.isAdmin && trustedId && input.userId === trustedId && (!trustedEmail || input.email?.toLowerCase() === trustedEmail));
  return { ok, displayName: ok ? CONSULTATION_REVIEWER_DISPLAY_NAME : null } as const;
}
