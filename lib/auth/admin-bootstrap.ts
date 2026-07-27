import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/admin-emails";

export { getAdminEmails, isAdminEmail };

/** Upsert profile after auth; promote MOONX_ADMIN_EMAILS to admin on server only. */
export async function ensureProfileForUser(userId: string, email: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const normalizedEmail = email.trim().toLowerCase();
  const shouldBeAdmin = isAdminEmail(normalizedEmail);

  const { data: existing } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (!existing) {
    await admin.from("profiles").insert({
      id: userId,
      email: normalizedEmail,
      role: shouldBeAdmin ? "admin" : "user",
      membership_status: shouldBeAdmin ? "active" : "inactive",
      membership_started_at: shouldBeAdmin ? new Date().toISOString() : null,
      membership_expires_at: null,
      display_name: normalizedEmail.split("@")[0],
    });
    return;
  }

  if (shouldBeAdmin) {
    await admin
      .from("profiles")
      .update({
        role: "admin",
        membership_status: "active",
        membership_started_at: existing.membership_started_at ?? new Date().toISOString(),
        membership_expires_at: null,
      })
      .eq("id", userId);
  }
}

/** Invite or locate admin user via service role (run from scripts or protected cron). */
export async function bootstrapAdminAccount(email: string): Promise<{ userId: string; created: boolean }> {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");

  const normalized = email.trim().toLowerCase();

  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(listErr.message);

  let userId: string | undefined;
  let created = false;
  const existing = listData.users.find((u) => u.email?.toLowerCase() === normalized);

  if (existing) {
    userId = existing.id;
  } else {
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(normalized, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://moon-x-genesis.vercel.app"}/auth/callback?next=/admin`,
    });
    if (inviteErr) throw new Error(inviteErr.message);
    userId = inviteData.user.id;
    created = true;
  }

  await ensureProfileForUser(userId!, normalized);
  return { userId: userId!, created };
}
