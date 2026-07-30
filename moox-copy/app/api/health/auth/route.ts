import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags, isSupabaseAuthConfigured, isSupabaseServiceConfigured } from "@/lib/feature-flags";
import { readAppMetadata } from "@/lib/auth/permissions";

export async function GET() {
  const flags = getFeatureFlags();
  const supabaseConfigured = isSupabaseAuthConfigured();
  const serviceRoleConfigured = isSupabaseServiceConfigured();

  let authReachable = false;
  let adminUserExists = false;
  let adminRole: string | null = null;

  const admin = getAdminClient();
  if (admin) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authReachable = !error && Boolean(data);
    const email = (process.env.MOONX_ADMIN_EMAIL ?? "jackzwin999@gmail.com").trim().toLowerCase();
    const user = data?.users.find((u) => u.email?.toLowerCase() === email);
    adminUserExists = Boolean(user);
    if (user) {
      adminRole = readAppMetadata(user).role ?? null;
    }
  }

  return NextResponse.json({
    supabaseConfigured,
    serviceRoleConfigured,
    authReachable,
    adminEnabled: flags.adminEnabled,
    publicSignupEnabled: flags.publicSignupEnabled,
    adminUserExists,
    adminRole,
  });
}
