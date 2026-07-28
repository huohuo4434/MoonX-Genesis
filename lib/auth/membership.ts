import "server-only";

import type { ForecastAccessLevel } from "@/types/daily-forecast";
import type { MembershipStatus, Profile, ProfileRole } from "@/types/membership";
import {
  canAccessMemberContent as canAccess,
  getCurrentUser as getAuthUser,
  isActiveMember as checkActiveMember,
  isAdmin as checkIsAdmin,
  listAllAuthUsers,
  readAppMetadata,
  requireAdmin as requireAdminUser,
  type AuthUserView,
} from "@/lib/auth/permissions";
import { getAdminClient } from "@/lib/supabase/admin";

export const MEMBER_PREVIEW_COOKIE = "moonx_member_preview";

export type MemberAccessLevel = "public" | "member" | "premium";

export interface AuthUser {
  id: string;
  email: string;
}

export interface MemberUserContext {
  plan: MemberAccessLevel;
  isMember: boolean;
  isPremium: boolean;
  isPreviewGate: boolean;
  isAdmin: boolean;
  userId?: string;
  email?: string;
  membershipStatus?: MembershipStatus;
  membershipExpiresAt?: string | null;
}

export interface MembershipStatusResult {
  isActive: boolean;
  status: MembershipStatus;
  expiresAt: string | null;
  accessLevel: "member" | "premium";
  role: ProfileRole;
}

function viewToProfile(user: AuthUserView): Profile {
  const meta = user.app_metadata;
  const role: ProfileRole = meta.role === "admin" ? "admin" : meta.membership_status === "active" ? "member" : "user";
  return {
    id: user.id,
    email: user.email,
    display_name: meta.display_name ?? user.email.split("@")[0] ?? null,
    role,
    membership_status: (meta.membership_status ?? "inactive") as MembershipStatus,
    membership_started_at: meta.membership_started_at ?? null,
    membership_expires_at: meta.membership_expires_at ?? null,
    created_at: user.created_at,
    updated_at: user.created_at,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return { id: user.id, email: user.email };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return viewToProfile(user);
}

export async function isAdmin(): Promise<boolean> {
  return checkIsAdmin(await getAuthUser());
}

export async function isActiveMember(): Promise<boolean> {
  return checkActiveMember(await getAuthUser());
}

export async function canAccessMemberForecast(): Promise<boolean> {
  return canAccess(await getAuthUser());
}

export async function canAccessMemberContent(): Promise<boolean> {
  return canAccessMemberForecast();
}

export async function getMembershipStatus(userId: string): Promise<MembershipStatusResult> {
  const fallback: MembershipStatusResult = {
    isActive: false,
    status: "inactive",
    expiresAt: null,
    accessLevel: "member",
    role: "user",
  };
  const admin = getAdminClient();
  if (!admin) return fallback;
  const { data } = await admin.auth.admin.getUserById(userId);
  if (!data.user) return fallback;
  const view = {
    id: data.user.id,
    email: data.user.email ?? "",
    created_at: data.user.created_at,
    app_metadata: readAppMetadata(data.user),
  };
  if (checkIsAdmin(view)) {
    return { isActive: true, status: "active", expiresAt: null, accessLevel: "premium", role: "admin" };
  }
  const active = checkActiveMember(view);
  return {
    isActive: active,
    status: (view.app_metadata.membership_status ?? "inactive") as MembershipStatus,
    expiresAt: view.app_metadata.membership_expires_at ?? null,
    accessLevel: "member",
    role: active ? "member" : "user",
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const admin = getAdminClient();
  if (!admin) return null;
  const { data } = await admin.auth.admin.getUserById(userId);
  if (!data.user?.email) return null;
  return viewToProfile({
    id: data.user.id,
    email: data.user.email,
    created_at: data.user.created_at,
    app_metadata: readAppMetadata(data.user),
  });
}

export async function requireAdmin(): Promise<Profile | null> {
  const user = await requireAdminUser();
  if (!user) return null;
  return viewToProfile(user);
}

export async function getMemberUserContext(): Promise<MemberUserContext> {
  const { getAccessUser } = await import("@/lib/auth/get-access-user");
  const snap = await getAccessUser();
  if (!snap.authenticated) {
    return { plan: "public", isMember: false, isPremium: false, isPreviewGate: false, isAdmin: false };
  }
  const adminUser = snap.isAdmin;
  const member = snap.isActiveMember || adminUser;
  return {
    plan: adminUser ? "premium" : member ? "member" : "public",
    isMember: member,
    isPremium: adminUser,
    isPreviewGate: false,
    isAdmin: adminUser,
    userId: snap.userId ?? undefined,
    email: snap.email ?? undefined,
    membershipStatus: (snap.membershipStatus ?? "inactive") as MembershipStatus,
    membershipExpiresAt: adminUser
      ? null
      : snap.membershipExpiresAt
        ? snap.membershipExpiresAt.toISOString()
        : null,
  };
}

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
  if (user.isAdmin) return true;
  if (accessLevel === "member") return user.isMember || user.isPremium;
  if (accessLevel === "premium") return user.isPremium;
  return false;
}

export function canViewDelayedPublic(memberAvailableAt: string, now = new Date()): boolean {
  return now.getTime() >= new Date(memberAvailableAt).getTime() + 24 * 60 * 60 * 1000;
}

export async function listAllProfiles(): Promise<Profile[]> {
  const users = await listAllAuthUsers();
  return users.map(viewToProfile);
}
