/**
 * Optionally wipe TEST payment order files only.
 * NEVER clears membership_expires_at for any user.
 * Production / Vercel Production must not call this unless explicitly allowed.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

if (
  (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") &&
  process.env.ALLOW_DESTRUCTIVE_PAYMENT_CLEANUP !== "true"
) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "wipe-payment-orders is disabled in production to protect memberships",
    })
  );
  process.exit(1);
}

const BUCKET = "moonx-data";
const FILES = ["payments/orders.json", "payment-orders.json"];
const ADMIN = "jackzwin999@gmail.com";

async function main() {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ""
  ).trim();
  if (!url || !key || key.length < 40) throw new Error("missing supabase admin env");
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Keep approved / real orders — only strip system-test pending orders.
  for (const file of FILES) {
    const { data } = await admin.storage.from(BUCKET).download(file);
    let orders: Array<Record<string, unknown>> = [];
    if (data) {
      try {
        const parsed = JSON.parse(await data.text()) as { orders?: Array<Record<string, unknown>> };
        orders = (parsed.orders ?? []).filter((o) => {
          const isTest = Boolean(o.isTest ?? o.is_system_test);
          const status = String(o.status ?? "");
          // Preserve all approved and non-test orders forever.
          if (status === "approved") return true;
          if (!isTest) return true;
          return false;
        });
      } catch {
        orders = [];
      }
    }
    const body = { version: 1 as const, updatedAt: new Date().toISOString(), orders };
    const { error } = await admin.storage.from(BUCKET).upload(file, JSON.stringify(body, null, 2), {
      contentType: "application/json",
      upsert: true,
    });
    if (error) throw new Error(`wipe ${file}: ${error.message}`);
  }

  // Clear pending payment *metadata* only — NEVER membership fields.
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const cleared: string[] = [];
  for (const u of listed?.users ?? []) {
    const email = (u.email ?? "").toLowerCase();
    if (!email || email === ADMIN) continue;
    const meta = { ...(u.app_metadata ?? {}) } as Record<string, unknown>;
    if (meta.role === "admin") continue;
    const needsClear =
      meta.pending_payment != null ||
      meta.payment_order != null ||
      meta.payment_notification_status != null;
    if (!needsClear) continue;
    // Preserve membership_* and payment_history (audit trail).
    meta.pending_payment = null;
    meta.payment_order = null;
    meta.payment_notification_status = null;
    await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
    cleared.push(email);
  }

  console.log(
    JSON.stringify({
      ok: true,
      preservedMemberships: true,
      clearedPendingOnly: cleared,
      note: "membership_expires_at was not modified",
    })
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
