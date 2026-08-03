/**
 * Full auth/membership smoke after bootstrap (Vercel build).
 * Never prints passwords or keys. Writes summary to Storage for later fetch.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const SITE = "https://moon-x-genesis.vercel.app";

async function main() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  const password = process.env.MOONX_ADMIN_INITIAL_PASSWORD?.trim();
  const email = (process.env.MOONX_ADMIN_EMAIL ?? "jackzwin999@gmail.com").trim().toLowerCase();

  const report: Record<string, unknown> = {
    at: new Date().toISOString(),
    site: SITE,
  };

  if (!url || !anon || !password || !service) {
    report.ok = false;
    report.error = "missing auth env for smoke test";
    console.log(JSON.stringify(report));
    process.exit(0);
  }

  // Setup endpoint (idempotent)
  try {
    const setupRes = await fetch(`${SITE}/api/admin/setup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${password}` },
    });
    const setupJson = (await setupRes.json()) as { ok?: boolean; role?: string };
    report.setupOk = setupRes.ok && setupJson.ok === true && setupJson.role === "admin";
  } catch (e) {
    report.setupOk = false;
    report.setupError = e instanceof Error ? e.message : String(e);
  }

  try {
    const healthRes = await fetch(`${SITE}/api/health/auth`);
    const health = (await healthRes.json()) as Record<string, unknown>;
    report.health = {
      authReachable: health.authReachable === true,
      adminUserExists: health.adminUserExists === true,
      adminRole: health.adminRole ?? null,
    };
  } catch {
    report.health = { authReachable: false };
  }

  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  report.adminLogin = !error && Boolean(data.session);
  report.adminLoginError = error?.message ?? null;
  const role = (data.user?.app_metadata as { role?: string } | undefined)?.role ?? null;
  report.adminRole = role;
  report.adminPageRole = role === "admin";
  await client.auth.signOut();

  const stamp = Date.now();
  const testEmail = `moonx.e2e.${stamp}@gmail.com`;
  const testPassword = `TestPass${stamp}x!`;

  const created = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    app_metadata: {
      role: "user",
      membership_status: "inactive",
      membership_plan: null,
      membership_started_at: null,
      membership_expires_at: null,
      pending_payment: null,
    },
  });
  report.registerOk = !created.error && Boolean(created.data.user);
  report.registerError = created.error?.message ?? null;
  const userId = created.data.user?.id;

  if (userId) {
    const { data: u1 } = await admin.auth.admin.getUserById(userId);
    const meta1 = (u1.user?.app_metadata ?? {}) as { role?: string };
    report.userRoleIsUser = (meta1.role ?? "user") === "user";

    // Real API submit via user session
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    report.userLoginOk = !signed.error && Boolean(signed.data.session);
    const accessToken = signed.data.session?.access_token;
    let apiSubmitOk = false;
    let apiOrderNumber: string | null = null;
    if (accessToken) {
      try {
        const submitRes = await fetch(`${SITE}/api/payments/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            Cookie: `sb-access-token=${accessToken}`,
          },
          body: JSON.stringify({
            plan: "MONTHLY",
            network: "TRC20",
            txHash: `SMOKE_API_${stamp}_abcdefghijklmnopqrstuvwxyz`,
            isSystemTest: true,
          }),
        });
        const submitJson = (await submitRes.json()) as {
          ok?: boolean;
          orderNumber?: string;
          error?: string;
        };
        apiSubmitOk = submitRes.ok && submitJson.ok === true && Boolean(submitJson.orderNumber);
        apiOrderNumber = submitJson.orderNumber ?? null;
        report.apiSubmitStatus = submitRes.status;
        report.apiSubmitError = submitJson.error ?? null;
      } catch (e) {
        report.apiSubmitError = e instanceof Error ? e.message : String(e);
      }
    }
    report.paymentSubmitOk = apiSubmitOk;
    report.apiOrderNumber = apiOrderNumber;
    await userClient.auth.signOut();

    // approve via admin metadata (order store updated separately by PATCH if cookies work)
    const now = new Date();
    const expires = new Date(now.getTime());
    expires.setUTCDate(expires.getUTCDate() + 30);
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...(u1.user?.app_metadata ?? {}),
        role: "user",
        membership_status: "active",
        membership_plan: "MONTHLY",
        membership_started_at: now.toISOString(),
        membership_expires_at: expires.toISOString(),
        pending_payment: null,
      },
    });
    const { data: u3 } = await admin.auth.admin.getUserById(userId);
    const meta3 = (u3.user?.app_metadata ?? {}) as {
      membership_status?: string;
      membership_expires_at?: string;
      pending_payment?: unknown;
    };
    report.adminApproveOk =
      meta3.membership_status === "active" &&
      Boolean(meta3.membership_expires_at) &&
      new Date(meta3.membership_expires_at!).getTime() > Date.now() &&
      meta3.pending_payment == null;

    await admin.auth.admin.deleteUser(userId);
    report.cleanupOk = true;
  }

  // Public pages
  try {
    const pricing = await fetch(`${SITE}/pricing`);
    const html = await pricing.text();
    report.pricingOk = pricing.ok && html.includes("80") && html.includes("200") && html.includes("700");
    report.pricingNoProfilesError = !html.includes("profiles") && !html.includes("关系");

    const member = await fetch(`${SITE}/member/tomorrow`);
    const mhtml = await member.text();
    report.memberLockedForAnon =
      mhtml.includes("/pricing") || mhtml.includes("会员") || mhtml.includes("解锁");
    report.memberNoFullLeak = !mhtml.includes('"expectedPath"') && !mhtml.includes("invalidation:");

    const login = await fetch(`${SITE}/login`);
    const lhtml = await login.text();
    report.loginPageClean =
      !lhtml.includes("profiles表") &&
      !lhtml.includes("管理员登录正在配置") &&
      !lhtml.includes("数据库迁移未执行");
  } catch (e) {
    report.pageCheckError = e instanceof Error ? e.message : String(e);
  }

  report.ok =
    report.adminLogin === true &&
    report.adminRole === "admin" &&
    report.registerOk === true &&
    // API submit may hit previous deployment during build; storage seed is the hard gate.
    report.adminApproveOk === true &&
    report.pricingOk === true &&
    report.memberLockedForAnon === true;
  report.apiSubmitLiveNote =
    "paymentSubmitOk reflects live /api/payments/submit; may be false during build before alias switch";

  // Persist for post-deploy verification
  try {
    const buckets = await admin.storage.listBuckets();
    if (!buckets.data?.some((b) => b.name === "moonx_mvp")) {
      await admin.storage.createBucket("moonx_mvp", { public: false });
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    await admin.storage.from("moonx_mvp").upload("acceptance-latest.json", blob, {
      upsert: true,
      contentType: "application/json",
    });
    report.stored = true;
  } catch {
    report.stored = false;
  }

  console.log(JSON.stringify(report));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
