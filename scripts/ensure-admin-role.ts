/**
 * Ensure jackzwin999@gmail.com (or ADMIN_EMAIL) has app_metadata.role = admin.
 * Uses Supabase Auth admin API (no Prisma User model).
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

function adminEmails(): string[] {
  const primary =
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
    process.env.MOONX_ADMIN_EMAIL?.trim().toLowerCase() ||
    "jackzwin999@gmail.com";
  const extras = (process.env.MOONX_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([primary, ...extras]));
}

async function main() {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  )?.trim();
  if (!url || !serviceKey || serviceKey === "[SENSITIVE]" || url.includes("[SENSITIVE]")) {
    console.log(
      JSON.stringify({
        ok: false,
        skipped: true,
        reason: "Supabase admin credentials unavailable or masked in this environment",
        adminEmails: adminEmails(),
      })
    );
    process.exit(0);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const targets = adminEmails();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data?.users) {
    console.log(JSON.stringify({ ok: false, error: error?.message ?? "listUsers failed" }));
    process.exit(1);
  }

  const results: Array<Record<string, unknown>> = [];
  for (const user of data.users) {
    const email = (user.email ?? "").toLowerCase();
    if (!targets.includes(email)) continue;
    const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const beforeRole = meta.role ?? null;
    if (beforeRole === "admin") {
      results.push({ email, updated: false, role: "admin", note: "already_admin" });
      continue;
    }
    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...meta,
        role: "admin",
        membership_status: "active",
        membership_plan: null,
        membership_expires_at: null,
        pending_payment: null,
      },
    });
    results.push({
      email,
      updated: !updateErr,
      beforeRole,
      role: updateErr ? beforeRole : "admin",
      error: updateErr?.message,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        targets,
        results,
        found: results.length,
        note: "Access also allows admin email even if role sync is delayed",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
