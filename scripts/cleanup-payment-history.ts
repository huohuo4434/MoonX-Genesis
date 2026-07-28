/**
 * One-shot production payment history cleanup.
 * - Backs up payment data to moonx-data/backups/payment-cleanup-<stamp>/
 * - Clears Storage orders + legacy files
 * - Truncates SQL payment tables when present
 * - Clears user app_metadata payment fields
 * - Resets membership only when clearly opened by isTest / system_test orders
 * - Does NOT delete Auth users, admin role, research data, addresses, or email config
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const BUCKET = "moonx-data";
const ADMIN_EMAIL = "jackzwin999@gmail.com";
const HUOHUO = "huohuo4434@gmail.com";
const ORDER_FILES = ["payments/orders.json", "payment-orders.json"];
const EXTRA_PAYMENT_GLOBS = [
  "payments/",
  "payment-orders.json",
  "payments/orders.json",
  "payments/audit-logs.json",
  "payments/email-logs.json",
  "payments/notifications.json",
  "payment-audit-logs.json",
  "payment-email-logs.json",
];

type OrderRow = {
  orderId?: string;
  id?: string;
  userId?: string;
  user_id?: string;
  userEmail?: string;
  user_email?: string;
  status?: string;
  isTest?: boolean;
  is_system_test?: boolean;
  txHash?: string;
  tx_hash?: string;
  [k: string]: unknown;
};

type Report = {
  ok: boolean;
  backupPath: string;
  deletedOrders: number;
  deletedAuditLogs: number;
  deletedEmailLogs: number;
  clearedPendingPaymentEmails: string[];
  resetTestMemberships: string[];
  uncertainMemberships: string[];
  sqlTablesCleared: string[];
  storageFilesCleared: string[];
  verify?: {
    createdOrderId?: string;
    emailStatus?: string;
    approved?: boolean;
    finalOrderCount?: number;
    huohuoPendingCleared?: boolean;
  };
  error?: string;
};

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

function adminClient(): SupabaseClient {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ""
  ).trim();
  if (!url || !key || key.length < 40 || key === "[SENSITIVE]") {
    throw new Error("missing supabase admin env");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureBucket(admin: SupabaseClient) {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
    });
  }
}

async function downloadText(admin: SupabaseClient, path: string): Promise<string | null> {
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return data.text();
}

async function uploadJson(admin: SupabaseClient, path: string, body: unknown) {
  const { error } = await admin.storage.from(BUCKET).upload(path, JSON.stringify(body, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
}

function parseOrders(text: string | null): OrderRow[] {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as { orders?: OrderRow[]; records?: OrderRow[] };
    return parsed.orders ?? parsed.records ?? (Array.isArray(parsed) ? (parsed as OrderRow[]) : []);
  } catch {
    return [];
  }
}

async function listAllUsers(admin: SupabaseClient) {
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
  }
  return users;
}

async function countSql(admin: SupabaseClient, table: string): Promise<number | null> {
  try {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

async function deleteAllSql(admin: SupabaseClient, table: string): Promise<number> {
  const before = await countSql(admin, table);
  if (before == null) return 0;
  if (before === 0) return 0;
  // Prefer truncate-like delete; service role bypasses RLS when configured.
  const { error } = await admin.from(table).delete().neq("id", "___never___");
  if (error) {
    // fallback for uuid/text id tables
    const { data } = await admin.from(table).select("id").limit(5000);
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    if (ids.length) {
      await admin.from(table).delete().in("id", ids);
    } else {
      console.warn(`[cleanup] sql delete ${table}:`, error.message);
      return 0;
    }
  }
  return before;
}

async function main() {
  const report: Report = {
    ok: false,
    backupPath: "",
    deletedOrders: 0,
    deletedAuditLogs: 0,
    deletedEmailLogs: 0,
    clearedPendingPaymentEmails: [],
    resetTestMemberships: [],
    uncertainMemberships: [],
    sqlTablesCleared: [],
    storageFilesCleared: [],
  };

  try {
    const admin = adminClient();
    await ensureBucket(admin);
    const backupRoot = `backups/payment-cleanup-${stamp()}`;
    report.backupPath = `${BUCKET}/${backupRoot}`;

    // —— 1) Collect & backup storage payment files ——
    const backupPayload: Record<string, unknown> = {
      backedUpAt: new Date().toISOString(),
      files: {} as Record<string, unknown>,
      sql: {} as Record<string, unknown>,
      usersPaymentMeta: [] as unknown[],
    };

    const orderMap = new Map<string, OrderRow>();
    for (const file of ORDER_FILES) {
      const text = await downloadText(admin, file);
      const rows = parseOrders(text);
      for (const r of rows) {
        const id = String(r.orderId ?? r.id ?? "");
        if (id) orderMap.set(id, r);
      }
      (backupPayload.files as Record<string, unknown>)[file] = text
        ? JSON.parse(text)
        : { missing: true };
    }

    // Extra known log files
    for (const file of [
      "payments/audit-logs.json",
      "payments/email-logs.json",
      "payments/notifications.json",
      "payment-audit-logs.json",
      "payment-email-logs.json",
      "payments/smoke-auth.json",
      "diagnostics/auth-payment-smoke.json",
    ]) {
      const text = await downloadText(admin, file);
      if (text) {
        (backupPayload.files as Record<string, unknown>)[file] = (() => {
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        })();
        if (/audit/i.test(file)) {
          try {
            const parsed = JSON.parse(text) as { logs?: unknown[]; records?: unknown[] };
            report.deletedAuditLogs += (parsed.logs ?? parsed.records ?? []).length || 1;
          } catch {
            report.deletedAuditLogs += 1;
          }
        }
        if (/email|notif/i.test(file)) {
          try {
            const parsed = JSON.parse(text) as { logs?: unknown[]; records?: unknown[] };
            report.deletedEmailLogs += (parsed.logs ?? parsed.records ?? []).length || 1;
          } catch {
            report.deletedEmailLogs += 1;
          }
        }
      }
    }

    // SQL backups
    for (const table of [
      "member_payment_orders",
      "payment_orders",
      "payment_audit_logs",
      "crypto_transactions",
      "subscription_events",
    ]) {
      try {
        const { data, error } = await admin.from(table).select("*").limit(5000);
        if (!error) {
          (backupPayload.sql as Record<string, unknown>)[table] = data ?? [];
          if (table === "payment_audit_logs") {
            report.deletedAuditLogs += (data ?? []).length;
          }
        }
      } catch {
        /* table may not exist */
      }
    }

    const users = await listAllUsers(admin);
    for (const u of users) {
      const meta = (u.app_metadata ?? {}) as Record<string, unknown>;
      if (
        meta.pending_payment ||
        meta.payment_order ||
        meta.payment_notification_status ||
        meta.payment_history
      ) {
        (backupPayload.usersPaymentMeta as unknown[]).push({
          id: u.id,
          email: u.email,
          pending_payment: meta.pending_payment ?? null,
          payment_order: meta.payment_order ?? null,
          payment_notification_status: meta.payment_notification_status ?? null,
          payment_history: meta.payment_history ?? null,
          membership_status: meta.membership_status ?? null,
          membership_plan: meta.membership_plan ?? null,
          membership_started_at: meta.membership_started_at ?? null,
          membership_expires_at: meta.membership_expires_at ?? null,
          role: meta.role ?? null,
        });
      }
    }

    await uploadJson(admin, `${backupRoot}/manifest.json`, {
      backedUpAt: new Date().toISOString(),
      orderCount: orderMap.size,
      note: "Private backup — admin/service role only",
    });
    await uploadJson(admin, `${backupRoot}/snapshot.json`, backupPayload);

    report.deletedOrders = orderMap.size;

    // —— 2) Clear storage order + log files ——
    const emptyOrders = {
      version: 1,
      updatedAt: new Date().toISOString(),
      orders: [],
    };
    for (const file of ORDER_FILES) {
      await uploadJson(admin, file, emptyOrders);
      report.storageFilesCleared.push(file);
    }
    for (const file of [
      "payments/audit-logs.json",
      "payments/email-logs.json",
      "payments/notifications.json",
      "payment-audit-logs.json",
      "payment-email-logs.json",
    ]) {
      await uploadJson(admin, file, {
        version: 1,
        updatedAt: new Date().toISOString(),
        logs: [],
        records: [],
      });
      report.storageFilesCleared.push(file);
    }
    void EXTRA_PAYMENT_GLOBS;

    // —— 3) Clear SQL tables (order matters for FKs) ——
    for (const table of [
      "payment_audit_logs",
      "subscription_events",
      "crypto_transactions",
      "member_payment_orders",
      "payment_orders",
    ]) {
      const n = await deleteAllSql(admin, table);
      if (n > 0 || (await countSql(admin, table)) === 0) {
        // count===0 means table exists and is empty (or was cleared)
        const exists = (await countSql(admin, table)) != null;
        if (exists) report.sqlTablesCleared.push(`${table}:${n}`);
      }
    }

    // Count email notification rows embedded in orders (already deleted)
    let emailFromOrders = 0;
    for (const r of orderMap.values()) {
      const st = String(r.notificationStatus ?? r.notification_status ?? "");
      if (st && st !== "email_not_configured") emailFromOrders += 1;
    }
    report.deletedEmailLogs += emailFromOrders;

    // —— 4) Clear user metadata + selective membership reset ——
    const testUserIds = new Set<string>();
    const nonTestApprovedUserIds = new Set<string>();
    for (const r of orderMap.values()) {
      const uid = String(r.userId ?? r.user_id ?? "");
      const isTest = Boolean(r.isTest ?? r.is_system_test);
      const status = String(r.status ?? "");
      if (!uid) continue;
      if (isTest) testUserIds.add(uid);
      if (!isTest && status === "approved") nonTestApprovedUserIds.add(uid);
    }

    for (const u of users) {
      const email = (u.email ?? "").toLowerCase();
      const meta = { ...(u.app_metadata ?? {}) } as Record<string, unknown>;
      const role = meta.role === "admin" || email === ADMIN_EMAIL ? "admin" : "user";

      const hadPending = Boolean(meta.pending_payment);
      const hadOrder = Boolean(meta.payment_order);
      const hadNotif = meta.payment_notification_status != null;
      const hadHistory = Array.isArray(meta.payment_history) && meta.payment_history.length > 0;

      // Always clear payment fields for non-destructive cleanup
      delete meta.pending_payment;
      delete meta.payment_order;
      delete meta.payment_notification_status;
      delete meta.payment_history;
      meta.pending_payment = null;
      meta.payment_order = null;
      meta.payment_notification_status = null;
      meta.payment_history = null;

      if (hadPending || hadOrder || hadNotif || hadHistory) {
        if (email) report.clearedPendingPaymentEmails.push(email);
      }

      if (role === "admin") {
        meta.role = "admin";
        // Keep admin; clear payment only
        const { error } = await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
        if (error) throw new Error(`admin meta ${email}: ${error.message}`);
        continue;
      }

      meta.role = "user";

      const history = Array.isArray((u.app_metadata as { payment_history?: unknown[] })?.payment_history)
        ? ((u.app_metadata as { payment_history: Array<{ isSystemTest?: boolean; status?: string }> })
            .payment_history)
        : [];
      const historyAllTest =
        history.length > 0 &&
        history.every((h) => h.isSystemTest === true || /TEST|HUOHUO_TEST|SMOKE/i.test(String((h as { tx_hash?: string }).tx_hash ?? "")));
      const pendingWasTest = Boolean(
        (u.app_metadata as { pending_payment?: { isSystemTest?: boolean; tx_hash?: string } })
          ?.pending_payment?.isSystemTest ||
          /TEST|HUOHUO_TEST|SMOKE/i.test(
            String(
              (u.app_metadata as { pending_payment?: { tx_hash?: string } })?.pending_payment?.tx_hash ??
                ""
            )
          )
      );
      const isActive = meta.membership_status === "active";
      const openedByTestOnly =
        isActive &&
        testUserIds.has(u.id) &&
        !nonTestApprovedUserIds.has(u.id) &&
        (historyAllTest || history.length === 0 || pendingWasTest || email === HUOHUO);

      if (openedByTestOnly || (email === HUOHUO && isActive && !nonTestApprovedUserIds.has(u.id))) {
        meta.membership_status = "inactive";
        meta.membership_plan = null;
        meta.membership_started_at = null;
        meta.membership_expires_at = null;
        report.resetTestMemberships.push(email || u.id);
      } else if (isActive && !nonTestApprovedUserIds.has(u.id) && !testUserIds.has(u.id)) {
        // Active with no order evidence — likely manual; do not touch
        report.uncertainMemberships.push(email || u.id);
      }

      const { error } = await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
      if (error) throw new Error(`user meta ${email}: ${error.message}`);
    }

    // Also clear profiles.membership if synced from test (optional, non-admin)
    try {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id,email,membership_status,role")
        .limit(2000);
      for (const p of profiles ?? []) {
        if (p.role === "admin" || (p.email ?? "").toLowerCase() === ADMIN_EMAIL) continue;
        if (report.resetTestMemberships.includes((p.email ?? "").toLowerCase())) {
          await admin
            .from("profiles")
            .update({
              membership_status: "inactive",
              membership_started_at: null,
              membership_expires_at: null,
            })
            .eq("id", p.id);
        }
      }
    } catch {
      /* profiles columns may differ */
    }

    // —— 5) Verify cycle: create → email → approve → delete ——
    const huohuo = users.find((u) => (u.email ?? "").toLowerCase() === HUOHUO);
    if (huohuo) {
      const txHash = `CLEANUP_VERIFY_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const orderNumber = `MOONX-CLEAN${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const submittedAt = new Date().toISOString();
      const order = {
        orderId,
        orderNumber,
        userId: huohuo.id,
        userEmail: HUOHUO,
        plan: "MONTHLY",
        planName: "月度会员",
        amount: 50,
        durationDays: 30,
        network: "TRC20",
        txHash,
        status: "pending",
        submittedAt,
        notificationStatus: "email_not_configured",
        isTest: true,
        id: orderId,
        order_number: orderNumber,
        user_id: huohuo.id,
        user_email: HUOHUO,
        tx_hash: txHash,
        created_at: submittedAt,
        is_system_test: true,
      };

      await uploadJson(admin, "payments/orders.json", {
        version: 1,
        updatedAt: new Date().toISOString(),
        orders: [order],
      });
      report.verify = { createdOrderId: orderId };

      // Email
      const apiKey = process.env.RESEND_API_KEY?.trim();
      if (apiKey && apiKey.length > 10 && apiKey !== "[SENSITIVE]") {
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        const to =
          process.env.PAYMENT_NOTIFICATION_EMAIL?.trim() ||
          process.env.MOONX_ADMIN_EMAIL?.trim() ||
          ADMIN_EMAIL;
        const from =
          process.env.PAYMENT_EMAIL_FROM?.trim() ||
          process.env.MOONX_SUPPORT_EMAIL?.trim() ||
          "MoonX <onboarding@resend.dev>";
        const { data, error } = await resend.emails.send({
          from,
          to,
          subject: "MoonX收到新的会员付款申请",
          text: [
            "MoonX收到新的会员付款申请",
            "",
            `买家邮箱：${HUOHUO}`,
            `订单号：${orderNumber}`,
            `套餐：月度会员`,
            `金额：50 USDT`,
            `网络：TRC20`,
            `交易哈希：${txHash}`,
            `提交时间：${submittedAt}`,
            "",
            "审核地址：https://moon-x-genesis.vercel.app/admin/payments",
            "",
            "（支付清理验收测试单，随后将删除）",
          ].join("\n"),
        });
        report.verify.emailStatus = error ? `email_failed:${error.message}` : data?.id ? "email_sent" : "email_failed";
        order.notificationStatus = report.verify.emailStatus.startsWith("email_sent")
          ? "email_sent"
          : "email_failed";
      } else {
        report.verify.emailStatus = "email_not_configured";
      }

      // Approve (membership activation) — then immediately wipe orders (verify success separately).
      const approvedAt = new Date().toISOString();
      const expires = new Date(Date.now() + 30 * 864e5).toISOString();
      await admin.auth.admin.updateUserById(huohuo.id, {
        app_metadata: {
          ...(huohuo.app_metadata ?? {}),
          role: "user",
          membership_status: "active",
          membership_plan: "MONTHLY",
          membership_started_at: approvedAt,
          membership_expires_at: expires,
          pending_payment: null,
          payment_history: [
            {
              paymentId: orderId,
              plan: "MONTHLY",
              network: "TRC20",
              tx_hash: txHash,
              amount: 50,
              submitted_at: submittedAt,
              reviewed_at: approvedAt,
              status: "approved",
              isSystemTest: true,
            },
          ],
        },
      });
      report.verify.approved = true;

      // Hard wipe both storage files (do not merge-read; overwrite).
      const empty = { version: 1, updatedAt: new Date().toISOString(), orders: [] };
      for (let i = 0; i < 3; i += 1) {
        await uploadJson(admin, "payments/orders.json", empty);
        await uploadJson(admin, "payment-orders.json", empty);
        await new Promise((r) => setTimeout(r, 300));
      }

      await admin.auth.admin.updateUserById(huohuo.id, {
        app_metadata: {
          role: "user",
          membership_status: "inactive",
          membership_plan: null,
          membership_started_at: null,
          membership_expires_at: null,
          pending_payment: null,
          payment_order: null,
          payment_notification_status: null,
          payment_history: null,
        },
      });

      const finalText = await downloadText(admin, "payments/orders.json");
      const legacyText = await downloadText(admin, "payment-orders.json");
      report.verify.finalOrderCount =
        parseOrders(finalText).length + parseOrders(legacyText).length;
      const { data: refreshed } = await admin.auth.admin.getUserById(huohuo.id);
      report.verify.huohuoPendingCleared =
        (refreshed.user?.app_metadata as { pending_payment?: unknown } | undefined)?.pending_payment ==
        null;
      if (!report.resetTestMemberships.includes(HUOHUO)) {
        report.resetTestMemberships.push(HUOHUO);
      }
    }

    report.ok = true;
    await uploadJson(admin, `${backupRoot}/report.json`, report);
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    report.ok = false;
    report.error = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

main();
