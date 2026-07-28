import "server-only";

import type { MembershipStatus, Profile, ProfileRole } from "@/types/membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface MoonxAppMeta {
  role?: ProfileRole;
  membership_status?: MembershipStatus;
  membership_started_at?: string | null;
  membership_expires_at?: string | null;
  display_name?: string | null;
}

function metaFromUser(user: {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): Profile {
  const app = (user.app_metadata ?? {}) as MoonxAppMeta;
  const email = (user.email ?? "").toLowerCase();
  const role: ProfileRole = app.role === "admin" ? "admin" : "user";
  return {
    id: user.id,
    email,
    display_name: app.display_name ?? email.split("@")[0] ?? null,
    role,
    membership_status: role === "admin" ? "active" : (app.membership_status ?? "inactive"),
    membership_started_at: role === "admin" ? (app.membership_started_at ?? user.created_at ?? null) : (app.membership_started_at ?? null),
    membership_expires_at: role === "admin" ? null : (app.membership_expires_at ?? null),
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: user.updated_at ?? new Date().toISOString(),
  };
}

export async function listAllProfiles(): Promise<Profile[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data?.users) return [];
  return data.users
    .filter((u) => Boolean(u.email))
    .map((u) => metaFromUser(u))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return metaFromUser(data.user);
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const normalized = email.trim().toLowerCase();
  const profiles = await listAllProfiles();
  return profiles.find((p) => p.email === normalized) ?? null;
}

export async function ensureAuthProfile(userId: string, email: string): Promise<Profile> {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error(error?.message ?? "User not found");

  const existing = metaFromUser({ ...data.user, email: data.user.email ?? email });
  const isAdminUser = existing.role === "admin";

  const next: MoonxAppMeta = {
    role: isAdminUser ? "admin" : "user",
    membership_status: isAdminUser ? "active" : existing.membership_status ?? "inactive",
    membership_started_at: isAdminUser
      ? existing.membership_started_at ?? new Date().toISOString()
      : existing.membership_started_at,
    membership_expires_at: isAdminUser ? null : existing.membership_expires_at,
    display_name: existing.display_name,
  };

  const needsUpdate =
    existing.role !== next.role ||
    existing.membership_status !== next.membership_status ||
    existing.membership_expires_at !== next.membership_expires_at;

  if (needsUpdate || !data.user.app_metadata?.role) {
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...(data.user.app_metadata ?? {}),
        ...next,
      },
    });
    if (updateErr) throw new Error(updateErr.message);
  }

  return (await getProfileById(userId))!;
}

export async function updateMembership(
  userId: string,
  patch: {
    role?: ProfileRole;
    membership_status: MembershipStatus;
    membership_started_at?: string | null;
    membership_expires_at?: string | null;
  }
): Promise<Profile> {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error(error?.message ?? "User not found");
  if ((data.user.app_metadata as MoonxAppMeta)?.role === "admin") {
    throw new Error("不能修改管理员账户会员状态");
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(data.user.app_metadata ?? {}),
      role: "user",
      membership_status: patch.membership_status,
      membership_started_at: patch.membership_started_at ?? new Date().toISOString(),
      membership_expires_at: patch.membership_expires_at ?? null,
    },
  });
  if (updateErr) throw new Error(updateErr.message);
  return (await getProfileById(userId))!;
}
