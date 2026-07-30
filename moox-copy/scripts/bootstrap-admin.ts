/**
 * Bootstrap admin + initialize MoonX storage collections.
 * Works with SUPABASE_SERVICE_ROLE_KEY only (no manual SQL).
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const email = (process.argv[2] ?? process.env.MOONX_ADMIN_EMAIL ?? "jackzwin999@gmail.com")
  .trim()
  .toLowerCase();

async function ensureBucket(admin: ReturnType<typeof createClient>) {
  const bucket = "moonx_mvp";
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === bucket)) {
    await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
  }
  for (const name of ["memberships", "payments", "predictions", "research_articles"]) {
    const path = `${name}.json`;
    const { error } = await admin.storage.from(bucket).download(path);
    if (error) {
      const blob = new Blob([JSON.stringify([], null, 2)], { type: "application/json" });
      await admin.storage.from(bucket).upload(path, blob, { upsert: true, contentType: "application/json" });
    }
  }
}

async function main() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  const password = process.env.MOONX_ADMIN_INITIAL_PASSWORD?.trim();

  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  if (!password || password.length < 8) {
    throw new Error("MOONX_ADMIN_INITIAL_PASSWORD must be set (min 8 chars)");
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await ensureBucket(admin);

  let userId: string;
  let created = false;
  let updated = false;

  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(listErr.message);

  const existing = listData.users.find((u) => u.email?.toLowerCase() === email);

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
        display_name: email.split("@")[0],
      },
    });
    if (updateErr) throw new Error(updateErr.message);
    updated = true;
  } else {
    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: "admin",
        membership_status: "active",
        membership_started_at: new Date().toISOString(),
        membership_expires_at: null,
        display_name: email.split("@")[0],
      },
    });
    if (createErr) throw new Error(createErr.message);
    userId = createData.user.id;
    created = true;
  }

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const role = (userData.user?.app_metadata as { role?: string } | undefined)?.role ?? "admin";

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId,
        email,
        role,
        created,
        updated,
        storeInitialized: true,
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
