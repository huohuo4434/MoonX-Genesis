/**
 * Production smoke: recover + seed huohuo pending into payments/orders.json.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moon-x-genesis.vercel.app";
const BUCKET = "moonx-data";
const FILE = "payments/orders.json";
const HUOHUO = "huohuo4434@gmail.com";

type Order = {
  orderId: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  plan: string;
  planName: string;
  amount: number;
  durationDays: number;
  network: string;
  txHash: string;
  status: string;
  submittedAt: string;
  notificationStatus: string;
  isTest: boolean;
};

async function readOrders(admin: ReturnType<typeof createClient>): Promise<Order[]> {
  const map = new Map<string, Order>();
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
        const orderId = String(r.orderId ?? r.id ?? "");
        if (!orderId) continue;
        map.set(orderId, {
          orderId,
          orderNumber: String(r.orderNumber ?? r.order_number ?? orderId),
          userId: String(r.userId ?? r.user_id ?? ""),
          userEmail: String(r.userEmail ?? r.user_email ?? "").toLowerCase(),
          plan: String(r.plan ?? "MONTHLY"),
          planName: String(r.planName ?? "月度会员"),
          amount: Number(r.amount ?? 50),
          durationDays: Number(r.durationDays ?? 30),
          network: String(r.network ?? "TRC20"),
          txHash: String(r.txHash ?? r.tx_hash ?? ""),
          status: String(r.status ?? "pending"),
          submittedAt: String(r.submittedAt ?? r.created_at ?? new Date().toISOString()),
          notificationStatus: String(r.notificationStatus ?? r.notification_status ?? "email_not_configured"),
          isTest: Boolean(r.isTest ?? r.is_system_test ?? false),
        });
      }
    } catch {
      /* ignore */
    }
  }
  return [...map.values()];
}

async function writeOrders(admin: ReturnType<typeof createClient>, orders: Order[]) {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
  }
  const up = await admin.storage.from(BUCKET).upload(
    FILE,
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), orders }, null, 2),
    { contentType: "application/json", upsert: true }
  );
  if (up.error) throw new Error(up.error.message);
}

async function main() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!url || !service || service.length < 40) throw new Error("missing supabase admin env");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = listed?.users ?? [];
  const huohuoUser = users.find((u) => (u.email ?? "").toLowerCase() === HUOHUO);
  if (!huohuoUser) throw new Error(`${HUOHUO} not found`);

  // Recover pending from metadata if present
  const pending = (huohuoUser.app_metadata as { pending_payment?: { tx_hash?: string; plan?: string; network?: string; amount?: number; submitted_at?: string } })
    ?.pending_payment;

  let orders = await readOrders(admin);
  // Remove prior HUOHUO_TEST pending rows
  orders = orders.filter(
    (r) =>
      !(
        r.userEmail === HUOHUO &&
        r.status === "pending" &&
        r.isTest &&
        r.txHash.startsWith("HUOHUO_TEST_")
      )
  );

  let recovered: Order | null = null;
  if (pending?.tx_hash) {
    const exists = orders.find(
      (o) => o.txHash.trim().toLowerCase() === pending.tx_hash!.trim().toLowerCase()
    );
    if (!exists) {
      recovered = {
        orderId: `ord_recover_${Date.now().toString(36)}`,
        orderNumber: `MOONX-R${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        userId: huohuoUser.id,
        userEmail: HUOHUO,
        plan: pending.plan ?? "MONTHLY",
        planName: "月度会员",
        amount: pending.amount ?? 50,
        durationDays: 30,
        network: pending.network ?? "TRC20",
        txHash: pending.tx_hash,
        status: "pending",
        submittedAt: pending.submitted_at ?? new Date().toISOString(),
        notificationStatus: "email_not_configured",
        isTest: true,
      };
      orders = [recovered, ...orders];
    } else {
      recovered = exists;
    }
  }

  // Always ensure at least one visible pending test order for huohuo
  const huohuoRow: Order = {
    orderId: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    orderNumber: `MOONX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    userId: huohuoUser.id,
    userEmail: HUOHUO,
    plan: "MONTHLY",
    planName: "月度会员",
    amount: 50,
    durationDays: 30,
    network: "TRC20",
    txHash: `HUOHUO_TEST_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    status: "pending",
    submittedAt: new Date().toISOString(),
    notificationStatus: process.env.RESEND_API_KEY?.trim() ? "email_sent" : "email_not_configured",
    isTest: true,
  };
  // Prefer recovered real hash over fresh test if recovered from metadata
  const seed = recovered && recovered.txHash && !recovered.txHash.startsWith("HUOHUO_TEST_")
    ? recovered
    : huohuoRow;
  if (!orders.some((o) => o.orderId === seed.orderId)) {
    orders = [seed, ...orders.filter((o) => o.orderId !== seed.orderId)];
  }

  await writeOrders(admin, orders.slice(0, 500));

  await admin.auth.admin.updateUserById(huohuoUser.id, {
    app_metadata: {
      ...(huohuoUser.app_metadata ?? {}),
      role: (huohuoUser.app_metadata as { role?: string })?.role ?? "user",
      pending_payment: {
        paymentId: seed.orderId,
        userId: huohuoUser.id,
        email: HUOHUO,
        plan: seed.plan,
        network: seed.network,
        tx_hash: seed.txHash,
        amount: seed.amount,
        submitted_at: seed.submittedAt,
        status: "pending",
        notificationStatus: seed.notificationStatus === "email_sent" ? "sent" : seed.notificationStatus,
        isSystemTest: true,
      },
    },
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  console.log(
    JSON.stringify({
      ok: true,
      huohuoEmail: HUOHUO,
      recoveredFromMetadata: Boolean(pending?.tx_hash),
      recoveredTxHash: pending?.tx_hash ?? null,
      orderId: seed.orderId,
      orderNumber: seed.orderNumber,
      txHash: seed.txHash,
      pendingCount,
      emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
      adminPaymentsUrl: `${SITE}/admin/payments`,
    })
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
