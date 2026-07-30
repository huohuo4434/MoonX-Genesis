/**
 * Apply supabase/migrations/*.sql when database URL is available.
 * Supports SUPABASE_DB_URL, DATABASE_URL, or SUPABASE_DB_PASSWORD + service role JWT ref.
 */
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

function projectRefFromJwt(key: string | undefined): string | undefined {
  if (!key) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1]!, "base64url").toString("utf8")) as {
      ref?: string;
    };
    return payload.ref;
  } catch {
    return undefined;
  }
}

function resolveDbUrl(): string | undefined {
  const direct = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (direct) return direct.trim();

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) return undefined;

  const ref =
    projectRefFromJwt(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY) ??
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!ref) return undefined;

  const host = process.env.SUPABASE_DB_HOST ?? `aws-0-us-east-1.pooler.supabase.com`;
  const port = process.env.SUPABASE_DB_PORT ?? "6543";
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
}

async function main() {
  const dbUrl = resolveDbUrl();
  if (!dbUrl) {
    console.log(
      JSON.stringify({
        ok: false,
        skipped: true,
        reason: "Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD for automatic migrations",
      })
    );
    process.exit(0);
  }

  const { default: postgres } = await import("postgres");
  const sql = postgres(dbUrl, { max: 1 });
  const dir = resolve(process.cwd(), "supabase/migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const body = readFileSync(resolve(dir, file), "utf8");
    console.log(`[migrate] applying ${file}`);
    await sql.unsafe(body);
  }

  await sql.end();
  console.log(JSON.stringify({ ok: true, applied: files }));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
