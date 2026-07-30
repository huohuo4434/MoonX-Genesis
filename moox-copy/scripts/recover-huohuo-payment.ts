/**
 * Recover huohuo4434 pending_payment from Auth metadata into payments/orders.json.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const TARGET = "huohuo4434@gmail.com";

async function main() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!url || !service || service.length < 40) throw new Error("missing supabase admin env");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = (listed?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === TARGET);
  if (!user) {
    console.log(JSON.stringify({ ok: false, recovered: false, reason: "user_not_found", email: TARGET }));
    return;
  }

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pending = (meta.pending_payment ?? userMeta.pending_payment) as
    | {
        paymentId?: string;
        plan?: string;
        network?: string;
        tx_hash?: string;
        amount?: number;
        submitted_at?: string;
        notificationStatus?: string;
        isSystemTest?: boolean;
      }
    | null
    | undefined;

  const history = (meta.payment_history as Array<{ tx_hash?: string; plan?: string; network?: string; amount?: number; submitted_at?: string; status?: string }> | undefined) ?? [];

  let source = pending;
  if (!source?.tx_hash) {
    const histPending = history.find((h) => h.status === "pending" && h.tx_hash);
    if (histPending) {
      source = {
        plan: histPending.plan,
        network: histPending.network,
        tx_hash: histPending.tx_hash,
        amount: histPending.amount,
        submitted_at: histPending.submitted_at,
      };
    }
  }

  if (!source?.tx_hash || !source.plan) {
    console.log(
      JSON.stringify({
        ok: true,
        recovered: false,
        reason: "此前提交未被系统保存，无法恢复。",
        email: TARGET,
        hasPendingPayment: Boolean(pending),
        historyCount: history.length,
      })
    );
    return;
  }

  // Import via storage using same path as app
  const BUCKET = "moonx-data";
  const FILE = "payments/orders.json";
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
  }

  let orders: Array<Record<string, unknown>> = [];
  for (const path of [FILE, "payment-orders.json"]) {
    const dl = await admin.storage.from(BUCKET).download(path);
    if (!dl.data) continue;
    try {
      const parsed = JSON.parse(await dl.data.text()) as {
        orders?: Array<Record<string, unknown>>;
        records?: Array<Record<string, unknown>>;
      };
      const list = parsed.orders ?? parsed.records ?? [];
      for (const r of list) {
        const id = String(r.orderId ?? r.id ?? "");
        if (id && !orders.some((o) => String(o.orderId ?? o.id) === id)) orders.push(r);
      }
    } catch {
      /* ignore */
    }
  }

  const txKey = source.tx_hash.trim().toLowerCase();
  const already = orders.find(
    (o) => String(o.txHash ?? o.tx_hash ?? "").trim().toLowerCase() === txKey
  );
  if (already) {
    // Ensure recovered huohuo rows are marked system test
    const idx = orders.findIndex((o) => String(o.orderId ?? o.id) === String(already.orderId ?? already.id));
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], isTest: true, is_system_test: true };
      await admin.storage.from(BUCKET).upload(
        FILE,
        JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), orders }, null, 2),
        { contentType: "application/json", upsert: true }
      );
    }
    console.log(
      JSON.stringify({
        ok: true,
        recovered: true,
        alreadyExisted: true,
        markedTest: true,
        orderNumber: already.orderNumber ?? already.order_number,
        orderId: already.orderId ?? already.id,
        email: TARGET,
        txHash: source.tx_hash,
      })
    );
    return;
  }

  const plan = (source.plan ?? "MONTHLY") as "MONTHLY" | "QUARTERLY" | "YEARLY";
  const prices = { MONTHLY: 50, QUARTERLY: 120, YEARLY: 400 } as const;
  const days = { MONTHLY: 30, QUARTERLY: 90, YEARLY: 365 } as const;
  const labels = { MONTHLY: "月度会员", QUARTERLY: "季度会员", YEARLY: "年度会员" } as const;
  const orderId = `ord_recover_${Date.now().toString(36)}`;
  const orderNumber = `MOONX-R${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const row = {
    orderId,
    orderNumber,
    userId: user.id,
    userEmail: TARGET,
    plan,
    planName: labels[plan],
    amount: source.amount ?? prices[plan],
    durationDays: days[plan],
    network: source.network ?? "TRC20",
    txHash: source.tx_hash,
    status: "pending",
    submittedAt: source.submitted_at ?? new Date().toISOString(),
    notificationStatus: "email_not_configured",
    isTest: true,
  };
  orders = [row, ...orders].slice(0, 500);
  const up = await admin.storage.from(BUCKET).upload(
    FILE,
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), orders }, null, 2),
    { contentType: "application/json", upsert: true }
  );
  if (up.error) throw new Error(up.error.message);

  console.log(
    JSON.stringify({
      ok: true,
      recovered: true,
      alreadyExisted: false,
      orderId,
      orderNumber,
      email: TARGET,
      plan,
      txHash: source.tx_hash,
      isTest: true,
    })
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
