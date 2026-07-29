/**
 * Backup membership / payment / invite data before reconcile or deploy.
 * Writes JSON under data/backups/membership-<stamp>/
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

async function main() {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ""
  ).trim();
  if (!url || !key) throw new Error("missing supabase admin env");
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(process.cwd(), "data", "backups", `membership-${stamp}`);
  mkdirSync(dir, { recursive: true });

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = (listed?.users ?? []).map((u) => {
    const meta = (u.app_metadata ?? {}) as Record<string, unknown>;
    return {
      userId: u.id,
      email: u.email,
      role: meta.role ?? "user",
      membership_status: meta.membership_status ?? null,
      membership_plan: meta.membership_plan ?? null,
      membership_started_at: meta.membership_started_at ?? null,
      membership_expires_at: meta.membership_expires_at ?? null,
      payment_history: meta.payment_history ?? null,
      referral_code: meta.referral_code ?? null,
    };
  });
  writeFileSync(resolve(dir, "users-membership.json"), JSON.stringify(users, null, 2));

  for (const file of [
    "payments/orders.json",
    "membership/events.json",
    "referral/store.json",
  ]) {
    const { data } = await admin.storage.from("moonx-data").download(file);
    if (data) {
      const name = file.replace(/\//g, "__");
      writeFileSync(resolve(dir, name), await data.text());
    }
  }

  // Also upload a copy into Storage backups/
  const summary = {
    at: new Date().toISOString(),
    userCount: users.length,
    activeMembers: users.filter((u) => {
      const exp = u.membership_expires_at
        ? new Date(String(u.membership_expires_at)).getTime()
        : 0;
      return exp > Date.now() || u.role === "admin";
    }).length,
  };
  writeFileSync(resolve(dir, "summary.json"), JSON.stringify(summary, null, 2));
  await admin.storage.from("moonx-data").upload(
    `backups/membership-${stamp}/summary.json`,
    JSON.stringify({ ...summary, users }, null, 2),
    { contentType: "application/json", upsert: true }
  );

  console.log(JSON.stringify({ ok: true, dir, ...summary }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
