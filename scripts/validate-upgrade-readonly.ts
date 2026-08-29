/**
 * Post-deploy, read-only production acceptance.
 *
 * It performs only HTTP GETs and Supabase Storage upsert of the resulting
 * health report. It never creates users, submits payments, changes membership,
 * publishes forecasts, sends email or touches trading state.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const siteArgIndex = process.argv.indexOf("--site");
const rawSite = siteArgIndex >= 0 ? process.argv[siteArgIndex + 1] : process.env.NEXT_PUBLIC_SITE_URL;
const site = new URL(rawSite || "https://mooxintel.com").origin;
const reportAt = new Date().toISOString();

type Check = { key: string; ok: boolean; status: number | null; detail: string };

async function get(path: string): Promise<{ response: Response; text: string }> {
  const response = await fetch(`${site}${path}`, {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "MOOX-Readonly-Release-Acceptance/1.0" },
  });
  return { response, text: await response.text() };
}

function pageCheck(key: string, status: number, text: string, required: RegExp): Check {
  return {
    key,
    ok: status >= 200 && status < 400 && required.test(text),
    status,
    detail: status >= 200 && status < 400 ? "reachable with expected public content" : `HTTP ${status}`,
  };
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  for (const item of [
    { key: "home", path: "/", required: /MOOX|易老师/u },
    { key: "pricing", path: "/pricing", required: /会员|订阅|MONTHLY|月/u },
    { key: "login", path: "/login", required: /登录|邮箱|email/iu },
  ]) {
    try {
      const { response, text } = await get(item.path);
      checks.push(pageCheck(item.key, response.status, text, item.required));
    } catch (error) {
      checks.push({ key: item.key, ok: false, status: null, detail: error instanceof Error ? error.message : String(error) });
    }
  }

  try {
    const { response, text } = await get("/member/key-dates");
    const gated = /登录|会员|解锁|公开预览/u.test(text);
    const leaked = /完整日度审计|forecast_version|invalidation:/u.test(text);
    checks.push({
      key: "anonymous-member-gate",
      ok: response.ok && gated && !leaked,
      status: response.status,
      detail: response.ok && gated && !leaked ? "anonymous request is gated without private research leak" : "member gate or leak check failed",
    });
  } catch (error) {
    checks.push({ key: "anonymous-member-gate", ok: false, status: null, detail: error instanceof Error ? error.message : String(error) });
  }

  try {
    const { response, text } = await get("/api/health/auth");
    const health = JSON.parse(text) as { supabaseConfigured?: boolean; authReachable?: boolean };
    checks.push({
      key: "auth-health",
      ok: response.ok && health.supabaseConfigured === true && health.authReachable === true,
      status: response.status,
      detail: response.ok ? "public auth health is reachable" : `HTTP ${response.status}`,
    });
  } catch (error) {
    checks.push({ key: "auth-health", ok: false, status: null, detail: error instanceof Error ? error.message : String(error) });
  }

  const ok = checks.every((check) => check.ok);
  const report = { at: reportAt, site, mode: "READ_ONLY_POST_DEPLOY", ok, checks };

  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  let stored = false;
  let storageNote = "Vercel does not export secret values to the local validator; the timestamped console report remains authoritative.";
  if (supabaseUrl && serviceKey) {
    try {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const buckets = await admin.storage.listBuckets();
      if (buckets.error) throw buckets.error;
      if (!buckets.data.some((bucket) => bucket.name === "moonx_mvp")) {
        throw new Error("moonx_mvp storage bucket is missing; read-only acceptance will not create infrastructure");
      }
      const upload = await admin.storage.from("moonx_mvp").upload(
        "acceptance-latest.json",
        new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
        { upsert: true, contentType: "application/json" },
      );
      if (upload.error) throw upload.error;
      stored = true;
      storageNote = "fresh report stored in moonx_mvp/acceptance-latest.json";
    } catch (error) {
      storageNote = `optional health-report storage failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  console.log(JSON.stringify({ ...report, stored, storageNote }, null, 2));
  if (!ok) process.exit(1);
  console.log("UPGRADE VALIDATION PASSED");
}

main().catch((error) => {
  console.error(JSON.stringify({ at: reportAt, site, ok: false, error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
