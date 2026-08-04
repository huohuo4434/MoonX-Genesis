/**
 * Non-fatal Prisma migrate for Vercel builds.
 * Runtime traffic keeps DATABASE_URL (Supavisor transaction pooler / 6543).
 * Migrations use DIRECT_URL or MIGRATION_DATABASE_URL only.
 * If no migration URL is configured, migrations are skipped so builds cannot hang.
 */
import { execSync } from "child_process";
import { loadProductionEnv } from "./load-env";

loadProductionEnv();

const runtimeUrl = (process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL)?.trim();
const migrationUrl = (
  process.env.DIRECT_URL ?? process.env.MIGRATION_DATABASE_URL
)?.trim();

if (!runtimeUrl) {
  console.log(JSON.stringify({ ok: false, skipped: true, reason: "no DATABASE_URL" }));
  process.exit(0);
}

if (!migrationUrl) {
  console.warn(
    JSON.stringify({
      ok: false,
      skipped: true,
      reason: "no DIRECT_URL or MIGRATION_DATABASE_URL",
      note: "Runtime DATABASE_URL remains configured; migration is skipped to prevent transaction-pooler build hangs.",
    })
  );
  process.exit(0);
}

try {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: migrationUrl,
    },
  });
  console.log(JSON.stringify({ ok: true, migrated: true }));
} catch (err) {
  console.warn(
    JSON.stringify({
      ok: false,
      continued: true,
      error: err instanceof Error ? err.message : String(err),
      note: "Migration failed or timed out; build continues without resetting or truncating data.",
    })
  );
}

process.exit(0);
