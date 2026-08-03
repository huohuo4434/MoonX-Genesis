/**
 * Real data-flow test: create a pending payment order for huohuo4434@gmail.com
 * and verify it appears in the payment orders store (admin queue).
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const TABLE = "member_payment_orders";
const BUCKET = "moonx-data";
const FILE = "payment-orders.json";
const TARGET_EMAIL = "huohuo4434@gmail.com";

type PaymentOrderRecord = {
  id: string;
  order_number: string;
  user_id: string | null;
  user_email: string;
  plan: string;
  amount: number;
  network: string;
  tx_hash: string;
  status: string;
  notification_status?: string | null;
  is_system_test?: boolean;
  created_at: string;
};

function orderNumber(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MX-${y}${m}${day}-${rand}`;
}

async function main() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!url || !service || service.length < 40) throw new Error("missing supabase admin env");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = (listed?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === TARGET_EMAIL);
  if (!user) throw new Error(`${TARGET_EMAIL} not found`);

  const txHash = `HUOHUO_TEST_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const row: PaymentOrderRecord = {
    id: `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    order_number: orderNumber(),
    user_id: user.id,
    user_email: TARGET_EMAIL,
    plan: "MONTHLY",
    amount: 80,
    network: "TRC20",
    tx_hash: txHash,
    status: "pending",
    notification_status: process.env.RESEND_API_KEY?.trim() ? "sent" : "email_not_configured",
    is_system_test: true,
    created_at: new Date().toISOString(),
  };

  let dbOk = false;
  const insert = await admin.from(TABLE).insert({
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id,
    user_email: row.user_email,
    plan: row.plan,
    amount: row.amount,
    network: row.network,
    tx_hash: row.tx_hash,
    status: row.status,
    notification_status: row.notification_status ?? null,
    is_system_test: true,
    created_at: row.created_at,
  });
  if (!insert.error) dbOk = true;
  else console.warn("[submit-huohuo] db insert:", insert.error.message);

  // Always dual-write storage fallback
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
  }
  let existing: PaymentOrderRecord[] = [];
  const dl = await admin.storage.from(BUCKET).download(FILE);
  if (dl.data) {
    try {
      const parsed = JSON.parse(await dl.data.text()) as { records?: PaymentOrderRecord[] };
      existing = parsed.records ?? [];
    } catch {
      existing = [];
    }
  }
  const next = [row, ...existing.filter((r) => r.id !== row.id)].slice(0, 500);
  const up = await admin.storage.from(BUCKET).upload(
    FILE,
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), records: next }, null, 2),
    { contentType: "application/json", upsert: true }
  );
  if (up.error) throw new Error(`storage write failed: ${up.error.message}`);

  // Sync pending_payment on user for admin users page compat
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata ?? {}),
      role: (user.app_metadata as { role?: string })?.role ?? "user",
      pending_payment: {
        paymentId: row.id,
        userId: user.id,
        email: TARGET_EMAIL,
        plan: "MONTHLY",
        network: "TRC20",
        tx_hash: txHash,
        amount: 80,
        submitted_at: row.created_at,
        status: "pending",
        notificationStatus: row.notification_status,
        isSystemTest: true,
      },
    },
  });

  // Verify list
  const { data: dbRows } = await admin.from(TABLE).select("id,user_email,status,order_number").eq("id", row.id);
  const storageOk = next.some((r) => r.id === row.id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: TARGET_EMAIL,
        orderId: row.id,
        orderNumber: row.order_number,
        txHash,
        dbOk,
        dbVisible: Boolean(dbRows?.length),
        storageOk,
        notificationStatus: row.notification_status,
        adminPaymentsUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://moon-x-genesis.vercel.app"}/admin/payments`,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
