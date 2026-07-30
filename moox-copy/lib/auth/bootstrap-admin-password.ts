import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAuthProfile } from "@/lib/auth/profile-store";
import { ensureStoreInitialized } from "@/lib/data/moonx-store";

export interface BootstrapAdminResult {
  userId: string;
  email: string;
  role: string;
  created: boolean;
  updated: boolean;
  storeInitialized: boolean;
}

/** Create/update admin via Auth Admin API + initialize Storage collections (no SQL). */
export async function bootstrapAdminAccount(email: string): Promise<BootstrapAdminResult> {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");

  const password = process.env.MOONX_ADMIN_INITIAL_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("MOONX_ADMIN_INITIAL_PASSWORD must be set (min 8 chars) in environment");
  }

  const store = await ensureStoreInitialized();
  const normalized = email.trim().toLowerCase();
  let userId: string;
  let created = false;
  let updated = false;

  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(listErr.message);

  const existing = listData.users.find((u) => u.email?.toLowerCase() === normalized);

  if (existing) {
    userId = existing.id;
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      app_metadata: {
        ...(existing.app_metadata ?? {}),
        role: "admin",
        membership_status: "active",
        membership_started_at: new Date().toISOString(),
        membership_expires_at: null,
        display_name: normalized.split("@")[0],
      },
    });
    if (updateErr) throw new Error(updateErr.message);
    updated = true;
  } else {
    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
      app_metadata: {
        role: "admin",
        membership_status: "active",
        membership_started_at: new Date().toISOString(),
        membership_expires_at: null,
        display_name: normalized.split("@")[0],
      },
    });
    if (createErr) throw new Error(createErr.message);
    userId = createData.user.id;
    created = true;
  }

  const profile = await ensureAuthProfile(userId, normalized);

  return {
    userId,
    email: normalized,
    role: profile.role,
    created,
    updated,
    storeInitialized: store.bucketReady,
  };
}
