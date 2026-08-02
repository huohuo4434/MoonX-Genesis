import { NextResponse } from "next/server";
import { requireAdmin, readAppMetadata } from "@/lib/auth/permissions";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  getFeatureFlags,
  isSupabaseAuthConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/feature-flags";

export async function GET() {
  const flags = getFeatureFlags();
  const supabaseConfigured = isSupabaseAuthConfigured();
  const serviceRoleConfigured = isSupabaseServiceConfigured();
  const requesterIsAdmin = Boolean(await requireAdmin());

  let authReachable = false;
  let adminUserExists = false;
  let adminRole: string | null = null;

  const admin = getAdminClient();
  if (admin) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authReachable = !error && Boolean(data);
    if (requesterIsAdmin) {
      const email = (process.env.MOONX_ADMIN_EMAIL ?? "jackzwin999@gmail.com")
        .trim()
        .toLowerCase();
      const user = data?.users.find((item) => item.email?.toLowerCase() === email);
      adminUserExists = Boolean(user);
      if (user) adminRole = readAppMetadata(user).role ?? null;
    }
  }

  const publicStatus = {
    supabaseConfigured,
    authReachable,
    adminEnabled: flags.adminEnabled,
    publicSignupEnabled: flags.publicSignupEnabled,
  };

  return NextResponse.json(
    requesterIsAdmin
      ? { ...publicStatus, serviceRoleConfigured, adminUserExists, adminRole }
      : publicStatus,
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
