/**
 * Non-fatal Prisma migrate for Vercel builds.
 * Never resets / truncates data. Logs and continues if migrate history conflicts.
 */
import { execSync } from "child_process";
import { loadProductionEnv } from "./load-env";

loadProductionEnv();

const url = (process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL)?.trim();
if (!url) {
  console.log(JSON.stringify({ ok: false, skipped: true, reason: "no DATABASE_URL" }));
  process.exit(0);
}

process.env.DATABASE_URL = url;
try {
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
  console.log(JSON.stringify({ ok: true, migrated: true }));
} catch (err) {
  console.warn(
    JSON.stringify({
      ok: false,
      continued: true,
      error: err instanceof Error ? err.message : String(err),
      note: "Build continues; weekly seed uses upsert / curated fallback",
    })
  );
}
process.exit(0);
