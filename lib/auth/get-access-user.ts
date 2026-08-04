/**
 * Single SSR access snapshot for prediction / membership pages.
 * Uses the fresh auth snapshot from getCurrentUser and avoids duplicate admin lookups.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { isAdminUser } from "@/lib/auth/is-admin";
import {
  getCurrentUser,
  updateUserAppMetadata,
  type MembershipPlan,
  type MembershipStatus,
} from "@/lib/auth/permissions";
import {
  checkTodayPredictionAccess,
  checkTomorrowPredictionAccess,
  checkWeeklyPredictionAccess,
  isActiveMembershipForPredictionAccess,
  type PredictionAccessUser,
} from "@/lib/prediction-access";

export type AccessUserSnapshot = {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
  membershipExpiresAt: Date | null;
  membershipStatus: MembershipStatus | null;
  membershipPlan: MembershipPlan | null;
  isActiveMember: boolean;
  isAdmin: boolean;
  canAccessToday: boolean;
  canAccessTomorrow: boolean;
  canAccessWeekly: boolean;
  serverNowIso: string;
  accessUser: PredictionAccessUser | null;
};

function parseExpiry(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Load the current request's access user from cookies + fresh DB metadata.
 */
export async function getAccessUser(now = new Date()): Promise<AccessUserSnapshot> {
  noStore();

  const empty: AccessUserSnapshot = {
    authenticated: false,
    userId: null,
    email: null,
    role: null,
    membershipExpiresAt: null,
    membershipStatus: null,
    membershipPlan: null,
    isActiveMember: false,
    isAdmin: false,
    canAccessToday: false,
    canAccessTomorrow: false,
    canAccessWeekly: false,
    serverNowIso: now.toISOString(),
    accessUser: null,
  };

  const session = await getCurrentUser();
  if (!session) return empty;

  const email = session.email;
  let role: string = session.app_metadata.role ?? "user";
  const membershipExpiresAtRaw = session.app_metadata.membership_expires_at ?? null;
  const membershipStatus = (session.app_metadata.membership_status ?? "inactive") as MembershipStatus;
  const membershipPlan = session.app_metadata.membership_plan ?? null;

  // getCurrentUser already refreshes app_metadata through the admin API when it is
  // available. Do not query the same user a second time in the same request.
  if (isAdminUser({ email, role }) && role !== "admin") {
    try {
      await updateUserAppMetadata(session.id, { role: "admin" });
      role = "admin";
    } catch {
      // Email-based admin fallback still grants access.
    }
  }

  const membershipExpiresAt = parseExpiry(membershipExpiresAtRaw);
  const isAdmin = isAdminUser({ email, role, isAdmin: role === "admin" });

  const accessUser: PredictionAccessUser = {
    email,
    role,
    isAdmin,
    membershipExpiresAt: membershipExpiresAtRaw,
    membershipStatus,
  };

  const isActiveMember =
    !isAdmin && isActiveMembershipForPredictionAccess(accessUser, now);

  const today = checkTodayPredictionAccess({ user: accessUser, now });
  const tomorrow = checkTomorrowPredictionAccess({ user: accessUser, now });
  const weekly = checkWeeklyPredictionAccess({ user: accessUser, now });

  return {
    authenticated: true,
    userId: session.id,
    email,
    role: isAdmin ? "admin" : role,
    membershipExpiresAt,
    membershipStatus,
    membershipPlan,
    isActiveMember: isAdmin || isActiveMember,
    isAdmin,
    canAccessToday: today.allowed,
    canAccessTomorrow: tomorrow.allowed,
    canAccessWeekly: weekly.allowed,
    serverNowIso: now.toISOString(),
    accessUser,
  };
}
