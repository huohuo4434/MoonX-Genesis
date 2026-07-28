/**
 * Hard-wipe payment order Storage files and assert empty.
 * Runs after cleanup to defeat races with concurrent live API writes.
 * Also clears huohuo4434 pending_payment metadata.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const BUCKET = "moonx-data";
const FILES = ["payments/orders.json", "payment-orders.json"];
const HUOHUO = "huohuo4434@gmail.com";
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

  const empty = {
    version: 1 as const,
    updatedAt: new Date().toISOString(),
    orders: [] as unknown[],
  };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    for (const file of FILES) {
      const { error } = await admin.storage.from(BUCKET).upload(file, JSON.stringify(empty, null, 2), {
        contentType: "application/json",
        upsert: true,
      });
      if (error) throw new Error(`wipe ${file}: ${error.message}`);
    }
    await new Promise((r) => setTimeout(r, 500));
    let total = 0;
    for (const file of FILES) {
      const { data } = await admin.storage.from(BUCKET).download(file);
      if (!data) continue;
      try {
        const parsed = JSON.parse(await data.text()) as { orders?: unknown[] };
        total += (parsed.orders ?? []).length;
      } catch {
        /* ignore */
      }
    }
    if (total === 0) {
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
          meta.payment_notification_status != null ||
          (Array.isArray(meta.payment_history) && meta.payment_history.length > 0) ||
          email === HUOHUO;
        if (!needsClear) continue;
        meta.role = "user";
        meta.pending_payment = null;
        meta.payment_order = null;
        meta.payment_notification_status = null;
        meta.payment_history = null;
        if (email === HUOHUO) {
          meta.membership_status = "inactive";
          meta.membership_plan = null;
          meta.membership_started_at = null;
          meta.membership_expires_at = null;
        }
        await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
        cleared.push(email);
      }
      console.log(
        JSON.stringify({ ok: true, attempts: attempt, total: 0, files: FILES, clearedMeta: cleared })
      );
      return;
    }
    console.warn(JSON.stringify({ ok: false, attempt, total, retrying: true }));
  }
  throw new Error("payment orders wipe failed — storage still non-empty");
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
