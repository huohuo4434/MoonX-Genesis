import "server-only";

import type { ForecastAccessLevel } from "@/types/daily-forecast";
import type { MembershipStatus, Profile, ProfileRole } from "@/types/membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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

function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getProfile(user.id);
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === "admin";
}

export async function isActiveMember(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const membership = await getMembershipStatus(user.id);
  return membership.isActive;
}

export async function canAccessMemberForecast(): Promise<boolean> {
  const ctx = await getMemberUserContext();
  return ctx.isMember || ctx.isAdmin;
}

export async function getMembershipStatus(userId: string): Promise<MembershipStatusResult> {
  const admin = createSupabaseAdminClient();
  const fallback: MembershipStatusResult = {
    isActive: false,
    status: "inactive",
    expiresAt: null,
    accessLevel: "member",
    role: "user",
  };
  if (!admin) return fallback;

  const { data: profile } = await admin
    .from("profiles")
    .select("role, membership_status, membership_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return fallback;

  const role = profile.role as ProfileRole;
  const expiresAt = profile.membership_expires_at as string | null;

  if (role === "admin") {
    return {
      isActive: true,
      status: "active",
      expiresAt: null,
      accessLevel: "premium",
      role: "admin",
    };
  }

  const now = Date.now();
  const active =
    profile.membership_status === "active" &&
    profile.membership_expires_at &&
    new Date(profile.membership_expires_at).getTime() > now;

  const accessLevel: "member" | "premium" =
    profile.role === "premium" ? "premium" : "member";

  return {
    isActive: Boolean(active),
    status: profile.membership_status as MembershipStatus,
    expiresAt,
    accessLevel,
    role,
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile) ?? null;
}

export async function requireAdmin(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") return null;
  return profile;
}

async function previewGateContext(): Promise<MemberUserContext | null> {
  if (isProduction()) return null;
  if (process.env.MOONX_MEMBER_PREVIEW === "true") {
    return { plan: "member", isMember: true, isPremium: false, isPreviewGate: true, isAdmin: false };
  }
  const configuredKey = process.env.MOONX_MEMBER_PREVIEW_KEY;
  if (!configuredKey) return null;
  const cookieStore = await cookies();
  if (cookieStore.get(MEMBER_PREVIEW_COOKIE)?.value !== configuredKey) return null;
  return { plan: "member", isMember: true, isPremium: false, isPreviewGate: true, isAdmin: false };
}

/** Server-side membership gate — never trust client role. */
export async function getMemberUserContext(): Promise<MemberUserContext> {
  const base: MemberUserContext = {
    plan: "public",
    isMember: false,
    isPremium: false,
    isPreviewGate: false,
    isAdmin: false,
  };

  const user = await getCurrentUser();
  if (user) {
    const membership = await getMembershipStatus(user.id);
    const profile = await getProfile(user.id);
    const isAdminUser = profile?.role === "admin";
    if (membership.isActive || isAdminUser) {
      const isPremium = membership.accessLevel === "premium" || isAdminUser;
      return {
        plan: isPremium ? "premium" : "member",
        isMember: true,
        isPremium,
        isPreviewGate: false,
        isAdmin: isAdminUser,
        userId: user.id,
        email: user.email,
        membershipStatus: isAdminUser ? "active" : membership.status,
        membershipExpiresAt: isAdminUser ? null : membership.expiresAt,
      };
    }
    return {
      ...base,
      userId: user.id,
      email: user.email,
      membershipStatus: membership.status,
      membershipExpiresAt: membership.expiresAt,
      isAdmin: isAdminUser,
    };
  }

  const preview = await previewGateContext();
  return preview ?? base;
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
