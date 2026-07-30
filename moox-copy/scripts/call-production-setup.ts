/** Call production setup API using MOONX_ADMIN_INITIAL_PASSWORD from pulled env. */
import { loadProductionEnv } from "./load-env";

async function main() {
  loadProductionEnv();
  const token = process.env.MOONX_ADMIN_INITIAL_PASSWORD?.trim();
  if (!token) {
    console.error(JSON.stringify({ ok: false, error: "MOONX_ADMIN_INITIAL_PASSWORD missing" }));
    process.exit(1);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moon-x-genesis.vercel.app";
  const res = await fetch(`${base}/api/admin/setup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.text();
  console.log(JSON.stringify({ status: res.status, body: body.slice(0, 500) }));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
