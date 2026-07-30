/**
 * Single SSR access snapshot for prediction / membership pages.
 * Always re-reads Auth admin metadata by user id — never trust session-only plan cache.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { isAdminUser } from "@/lib/auth/is-admin";
import {
  getCurrentUser,
  readAppMetadata,
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
import { getAdminClient } from "@/lib/supabase/admin";

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

  let email = session.email;
  let role: string = session.app_metadata.role ?? "user";
  let membershipExpiresAtRaw = session.app_metadata.membership_expires_at ?? null;
  let membershipStatus = (session.app_metadata.membership_status ?? "inactive") as MembershipStatus;
  let membershipPlan = session.app_metadata.membership_plan ?? null;

  const admin = getAdminClient();
  if (admin) {
    const { data } = await admin.auth.admin.getUserById(session.id);
    if (data.user) {
      const meta = readAppMetadata(data.user);
      email = (data.user.email ?? session.email).toLowerCase();
      role = meta.role ?? "user";
      membershipExpiresAtRaw = meta.membership_expires_at ?? null;
      membershipStatus = (meta.membership_status ?? "inactive") as MembershipStatus;
      membershipPlan = meta.membership_plan ?? null;

      if (isAdminUser({ email, role }) && role !== "admin") {
        try {
          await updateUserAppMetadata(session.id, { role: "admin" });
          role = "admin";
        } catch {
          /* email-admin fallback still works via isAdminUser */
        }
      }
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
