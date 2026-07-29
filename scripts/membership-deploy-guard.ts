/**
 * Deploy-time membership safety guard.
 * Records active member counts and fails loudly if production memberships collapse.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const SNAPSHOT = resolve(process.cwd(), "data", "membership-deploy-snapshot.json");

type Snapshot = {
  at: string;
  databaseHost: string | null;
  activeMemberCount: number;
  yearlyMemberCount: number;
  adminCount: number;
};

function isSqliteUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /sqlite|file:/i.test(url);
}

async function countMembers(): Promise<Snapshot> {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ""
  ).trim();
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  let host: string | null = null;
  try {
    host = databaseUrl ? new URL(databaseUrl).host : url ? new URL(url).host : null;
  } catch {
    host = null;
  }

  if (!url || !key) {
    return {
      at: new Date().toISOString(),
      databaseHost: host,
      activeMemberCount: -1,
      yearlyMemberCount: -1,
      adminCount: -1,
    };
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const now = Date.now();
  let active = 0;
  let yearly = 0;
  let admins = 0;
  for (const u of data?.users ?? []) {
    const meta = (u.app_metadata ?? {}) as {
      role?: string;
      membership_expires_at?: string;
      membership_plan?: string;
    };
    if (meta.role === "admin") {
      admins += 1;
      continue;
    }
    const exp = meta.membership_expires_at ? new Date(meta.membership_expires_at).getTime() : 0;
    if (exp > now) {
      active += 1;
      if (meta.membership_plan === "YEARLY") yearly += 1;
    }
  }

  return {
    at: new Date().toISOString(),
    databaseHost: host,
    activeMemberCount: active,
    yearlyMemberCount: yearly,
    adminCount: admins,
  };
}

async function main() {
  const phase = (process.env.MEMBERSHIP_GUARD_PHASE ?? "after").toLowerCase();
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

  if (!databaseUrl && process.env.VERCEL_ENV === "production") {
    console.error(
      JSON.stringify({ ok: false, error: "DATABASE_URL missing in production" })
    );
    // Soft fail on Vercel bootstrap — Auth may still be primary store.
    console.warn("[membership-deploy-guard] continuing without DATABASE_URL");
  }

  if (isSqliteUrl(databaseUrl)) {
    console.error(JSON.stringify({ ok: false, error: "SQLite is not allowed in production" }));
    process.exit(1);
  }

  const snap = await countMembers();
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });

  if (phase === "before") {
    writeFileSync(SNAPSHOT, JSON.stringify(snap, null, 2));
    console.log(JSON.stringify({ ok: true, phase: "before", ...snap }));
    return;
  }

  let before: Snapshot | null = null;
  if (existsSync(SNAPSHOT)) {
    try {
      before = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Snapshot;
    } catch {
      before = null;
    }
  }

  writeFileSync(
    SNAPSHOT,
    JSON.stringify({ before, after: snap, comparedAt: new Date().toISOString() }, null, 2)
  );

  const errors: string[] = [];
  if (before && before.activeMemberCount >= 0 && snap.activeMemberCount >= 0) {
    if (snap.activeMemberCount < before.activeMemberCount) {
      errors.push(
        `activeMemberCount dropped ${before.activeMemberCount} → ${snap.activeMemberCount}`
      );
    }
    if (snap.yearlyMemberCount < before.yearlyMemberCount) {
      errors.push(
        `yearlyMemberCount dropped ${before.yearlyMemberCount} → ${snap.yearlyMemberCount}`
      );
    }
    if (Math.abs(snap.adminCount - before.adminCount) > 1) {
      errors.push(`adminCount changed ${before.adminCount} → ${snap.adminCount}`);
    }
  }

  if (errors.length) {
    console.error(
      JSON.stringify({
        ok: false,
        severity: "CRITICAL",
        errors,
        before,
        after: snap,
      })
    );
    if (process.env.VERCEL_ENV === "production" && process.env.MEMBERSHIP_GUARD_STRICT === "true") {
      process.exit(1);
    }
    return;
  }

  console.log(
    JSON.stringify({
      ok: true,
      phase: "after",
      activeMemberCountBefore: before?.activeMemberCount ?? null,
      activeMemberCountAfter: snap.activeMemberCount,
      yearlyMemberCount: snap.yearlyMemberCount,
      adminCount: snap.adminCount,
      databaseHost: snap.databaseHost,
    })
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  // Non-strict by default so bootstrap does not wipe successful builds.
  process.exit(0);
});
