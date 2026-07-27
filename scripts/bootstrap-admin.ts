/**
 * Bootstrap admin account: jackzwin999@gmail.com
 * Usage: SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npx tsx scripts/bootstrap-admin.ts
 */
import { bootstrapAdminAccount } from "../lib/auth/admin-bootstrap.ts";

const email = process.argv[2] ?? "jackzwin999@gmail.com";

try {
  const result = await bootstrapAdminAccount(email);
  console.log(JSON.stringify({ ok: true, email, ...result }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
}
