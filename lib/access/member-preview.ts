/**
 * Back-compat re-exports — prefer @/lib/auth/membership for new code.
 */
export {
  MEMBER_PREVIEW_COOKIE,
  canAccessForecast,
  canViewDelayedPublic,
  getAccessLevel,
  getMemberUserContext,
  getCurrentUser,
  getMembershipStatus,
  type MemberUserContext,
  type MemberAccessLevel,
} from "@/lib/auth/membership";
