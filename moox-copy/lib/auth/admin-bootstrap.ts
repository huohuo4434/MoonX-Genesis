import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { AppMetadata } from "@/lib/auth/permissions";
import { isAdminUser } from "@/lib/auth/is-admin";

export { getAdminEmails, isAdminEmail } from "@/lib/auth/admin-emails";

/** Ensure users have baseline app_metadata; promote configured admin emails to role=admin. */
export async function ensureProfileForUser(userId: string, email: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return;

  const meta = (data.user.app_metadata ?? {}) as AppMetadata;
  const normalizedEmail = email.trim().toLowerCase();
  const shouldBeAdmin = isAdminUser({
    email: normalizedEmail,
    role: meta.role,
    isAdmin: meta.role === "admin",
  });

  if (shouldBeAdmin) {
    if (meta.role === "admin" && meta.membership_status === "active") return;
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...meta,
        role: "admin",
        membership_status: "active",
        membership_plan: null,
        membership_started_at: meta.membership_started_at ?? new Date().toISOString(),
        membership_expires_at: null,
        pending_payment: null,
        display_name: meta.display_name ?? normalizedEmail.split("@")[0],
      },
    });
    return;
  }

  if (meta.role === "admin") return;
  // Only seed defaults when role is missing
  if (meta.role) return;

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...meta,
      role: "user",
      membership_status: meta.membership_status ?? "inactive",
      membership_plan: meta.membership_plan ?? null,
      membership_started_at: meta.membership_started_at ?? null,
      membership_expires_at: meta.membership_expires_at ?? null,
      pending_payment: meta.pending_payment ?? null,
      display_name: meta.display_name ?? email.split("@")[0],
    },
  });
}
