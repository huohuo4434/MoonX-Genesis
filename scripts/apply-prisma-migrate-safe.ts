/**
 * Non-fatal Prisma migrate for Vercel builds.
 * Runtime traffic keeps DATABASE_URL (Supavisor transaction pooler / 6543).
 * Migrations use DIRECT_URL or MIGRATION_DATABASE_URL only.
 * Existing production databases may return P3005; builds continue safely and the
 * idempotent member-device security bootstrap is applied separately.
 */
import { execSync } from "node:child_process";
import { loadProductionEnv } from "./load-env";
import { bootstrapDeviceSecurity } from "./bootstrap-device-security";

loadProductionEnv();

async function main(): Promise<void> {
  const strict = process.argv.includes("--strict");
  const runtimeUrl = (process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL)?.trim();
  const migrationUrl = (
    process.env.DIRECT_URL ?? process.env.MIGRATION_DATABASE_URL
  )?.trim();

  if (!runtimeUrl) {
    console.log(JSON.stringify({ ok: false, skipped: true, reason: "no DATABASE_URL" }));
    return;
  }

  if (!migrationUrl) {
    console.warn(
      JSON.stringify({
        ok: false,
        skipped: true,
        reason: "no DIRECT_URL or MIGRATION_DATABASE_URL",
        note: "Runtime DATABASE_URL remains configured; Prisma migration is skipped.",
      })
    );
  } else {
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
    } catch (error) {
      console.warn(
        JSON.stringify({
          ok: false,
          continued: true,
          error: error instanceof Error ? error.message : String(error),
          note: "Migration failed or timed out; build continues without resetting data.",
        })
      );
      if (strict) throw error;
    }
  }

  try {
    const result = await bootstrapDeviceSecurity();
    console.log(JSON.stringify({ deviceSecurityBootstrap: result }));
  } catch (error) {
    console.warn(
      JSON.stringify({
        deviceSecurityBootstrap: {
          ok: false,
          continued: true,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    );
    if (strict) throw error;
  }
}

main()
  .catch((error) => {
    console.warn(
      JSON.stringify({
        ok: false,
        continued: true,
        stage: "apply-prisma-migrate-safe",
        error: error instanceof Error ? error.message : String(error),
      })
    );
    process.exitCode = 1;
  });
