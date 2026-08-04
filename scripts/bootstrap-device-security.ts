/**
 * Idempotent bootstrap for the optional member-device security tables.
 *
 * The production database predates Prisma Migrate history, so `prisma migrate deploy`
 * can return P3005 even when the application schema is healthy. These three tables use
 * CREATE TABLE / INDEX IF NOT EXISTS and can be installed independently without
 * resetting, truncating, or baselining the existing database.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

export async function bootstrapDeviceSecurity(): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
}> {
  const url = (
    process.env.DIRECT_URL ??
    process.env.MIGRATION_DATABASE_URL ??
    process.env.DATABASE_URL
  )?.trim();

  if (!url) {
    return { ok: false, skipped: true, reason: "no database URL" };
  }

  const migrationPath = resolve(
    process.cwd(),
    "prisma/migrations/20260803010000_member_device_security/migration.sql"
  );
  const migrationSql = await readFile(migrationPath, "utf8");
  const statements = migrationSql
    .split(/;\s*(?:\r?\n|$)/g)
    .map((statement) => statement.trim())
    .filter(Boolean);

  const sql = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 12,
    idle_timeout: 5,
  });

  try {
    await sql.begin(async (transaction) => {
      for (const statement of statements) {
        await transaction.unsafe(statement);
      }
    });
    return { ok: true };
  } finally {
    await sql.end({ timeout: 3 });
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  bootstrapDeviceSecurity()
    .then((result) => {
      console.log(JSON.stringify({ deviceSecurityBootstrap: result }));
      process.exit(0);
    })
    .catch((error) => {
      console.warn(
        JSON.stringify({
          deviceSecurityBootstrap: {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      );
      process.exit(0);
    });
}
