/**
 * Apply Prisma wave migration when DATABASE_URL (or SUPABASE_DB_URL) is available.
 */
import { execSync } from "child_process";
import { loadProductionEnv } from "./load-env";

loadProductionEnv();

const url = (process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL)?.trim();
if (!url) {
  console.log(
    JSON.stringify({
      ok: false,
      skipped: true,
      reason: "Set DATABASE_URL or SUPABASE_DB_URL to run prisma migrate deploy",
    })
  );
  process.exit(0);
}

process.env.DATABASE_URL = url;
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
console.log(JSON.stringify({ ok: true, migrated: true }));
