/**
 * One-shot: confirm email for existing unconfirmed non-admin users.
 * Does not change passwords. Does not print secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

async function main() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!url || !service || service.length < 40) {
    throw new Error("missing supabase admin env");
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminEmail = (process.env.MOONX_ADMIN_EMAIL ?? "jackzwin999@gmail.com").trim().toLowerCase();

  let page = 1;
  let confirmed = 0;
  let skippedAdmin = 0;
  let already = 0;
  let scanned = 0;
  const targetSample = "huohuo4434@gmail.com";
  let targetHandled = false;
  let targetConfirmedAt: string | null = null;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    if (!users.length) break;

    for (const user of users) {
      scanned += 1;
      const email = (user.email ?? "").toLowerCase();
      const isAdmin =
        email === adminEmail || (user.app_metadata as { role?: string } | undefined)?.role === "admin";
      if (isAdmin) {
        skippedAdmin += 1;
        if (email === targetSample) {
          targetHandled = true;
          targetConfirmedAt = user.email_confirmed_at ?? null;
        }
        continue;
      }
      const meta = { ...(user.app_metadata ?? {}) } as Record<string, unknown>;
      if (!meta.role) meta.role = "user";
      if (!meta.membership_status) meta.membership_status = "inactive";

      if (user.email_confirmed_at) {
        already += 1;
        if (email === targetSample) {
          targetHandled = true;
          targetConfirmedAt = user.email_confirmed_at;
        }
        if (!(user.app_metadata as { role?: string } | undefined)?.role) {
          await admin.auth.admin.updateUserById(user.id, { app_metadata: meta });
        }
        continue;
      }

      const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        app_metadata: meta,
      });
      if (updErr) {
        console.error("confirm_failed", user.id, updErr.message);
        continue;
      }
      confirmed += 1;
      if (email === targetSample) {
        targetHandled = true;
        targetConfirmedAt = new Date().toISOString();
      }
    }

    if (users.length < 200) break;
    page += 1;
  }

  console.log(
    JSON.stringify({
      ok: true,
      scanned,
      confirmed,
      alreadyConfirmed: already,
      skippedAdmin,
      targetSample,
      targetHandled,
      targetHasConfirmedAt: Boolean(targetConfirmedAt),
    })
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
