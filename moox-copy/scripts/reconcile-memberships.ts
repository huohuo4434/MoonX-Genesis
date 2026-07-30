/**
 * Reconcile membership_expires_at from approved payment orders + referral rewards.
 *
 * Usage:
 *   npx tsx scripts/reconcile-memberships.ts           # preview only
 *   npx tsx scripts/reconcile-memberships.ts --write   # apply extend-only repairs
 *
 * Rules:
 * - Only APPROVED / approved non-test payments
 * - Sort by reviewed/approved time per user
 * - Accumulate 30/90/365 days
 * - Keep later of (existing expiry, recomputed)
 * - Idempotent via MembershipEvent sourceId DATA_REPAIR:payment:<orderId>
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const WRITE = process.argv.includes("--write");
const BUCKET = "moonx-data";
const ORDER_FILE = "payments/orders.json";
const EVENTS_FILE = "membership/events.json";
const PLAN_DAYS: Record<string, number> = { MONTHLY: 30, QUARTERLY: 90, YEARLY: 365 };

type Order = {
  orderId: string;
  userId: string;
  userEmail: string;
  plan: string;
  status: string;
  isTest?: boolean;
  approvedAt?: string | null;
  reviewed_at?: string | null;
  submittedAt?: string;
};

type EventRow = {
  id: string;
  userId: string;
  userEmail?: string | null;
  eventType: string;
  source: string;
  sourceId: string;
  previousExpiresAt: string | null;
  newExpiresAt: string | null;
  daysChanged: number;
  operatorId: string | null;
  note: string | null;
  createdAt: string;
};

function later(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function addDays(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function computeFromPayments(
  payments: Order[],
  existingExpiry: string | null
): { computed: string | null; appliedIds: string[] } {
  const sorted = [...payments].sort((a, b) => {
    const ta = a.approvedAt || a.reviewed_at || a.submittedAt || "";
    const tb = b.approvedAt || b.reviewed_at || b.submittedAt || "";
    return ta.localeCompare(tb);
  });
  let cursor: string | null = null;
  const appliedIds: string[] = [];
  for (const p of sorted) {
    const days = PLAN_DAYS[p.plan] ?? 0;
    if (!days) continue;
    const paidAt = p.approvedAt || p.reviewed_at || p.submittedAt || new Date().toISOString();
    const base =
      cursor && new Date(cursor).getTime() > new Date(paidAt).getTime() ? cursor : paidAt;
    cursor = addDays(base, days);
    appliedIds.push(p.orderId);
  }
  return { computed: later(existingExpiry, cursor), appliedIds };
}

async function main() {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ""
  ).trim();
  if (!url || !key) throw new Error("missing supabase admin env");

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: orderBlob } = await admin.storage.from(BUCKET).download(ORDER_FILE);
  let orders: Order[] = [];
  if (orderBlob) {
    try {
      const parsed = JSON.parse(await orderBlob.text()) as { orders?: Order[] };
      orders = (parsed.orders ?? []).filter(
        (o) => o.status === "approved" && !o.isTest && Boolean(o.userId)
      );
    } catch {
      orders = [];
    }
  }

  let existingEvents: EventRow[] = [];
  const { data: evtBlob } = await admin.storage.from(BUCKET).download(EVENTS_FILE);
  if (evtBlob) {
    try {
      const parsed = JSON.parse(await evtBlob.text()) as { events?: EventRow[] };
      existingEvents = parsed.events ?? [];
    } catch {
      existingEvents = [];
    }
  }
  const repairedSources = new Set(
    existingEvents
      .filter((e) => e.eventType === "DATA_REPAIR")
      .map((e) => e.sourceId)
  );

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = listed?.users ?? [];
  const byId = new Map(users.map((u) => [u.id, u]));

  const byUser = new Map<string, Order[]>();
  for (const o of orders) {
    const list = byUser.get(o.userId) ?? [];
    list.push(o);
    byUser.set(o.userId, list);
  }

  type Preview = {
    email: string;
    userId: string;
    currentExpiresAt: string | null;
    computedFromPayments: string | null;
    finalExpiresAt: string | null;
    willUpdate: boolean;
    paymentCount: number;
  };

  const previews: Preview[] = [];
  const newEvents: EventRow[] = [];

  for (const [userId, pays] of byUser) {
    const user = byId.get(userId);
    if (!user) continue;
    const email = (user.email ?? pays[0]?.userEmail ?? "").toLowerCase();
    const meta = (user.app_metadata ?? {}) as {
      role?: string;
      membership_expires_at?: string;
    };
    if (meta.role === "admin") continue;

    const current = meta.membership_expires_at ?? null;
    const { computed, appliedIds } = computeFromPayments(pays, current);
    const final = later(current, computed);
    const willUpdate =
      Boolean(final) &&
      (!current || new Date(final!).getTime() > new Date(current).getTime());

    previews.push({
      email,
      userId,
      currentExpiresAt: current,
      computedFromPayments: computed,
      finalExpiresAt: final,
      willUpdate,
      paymentCount: pays.length,
    });

    if (!WRITE || !willUpdate || !final) continue;

    // Mark each payment as repaired (idempotent ledger) then write once.
    for (const orderId of appliedIds) {
      const sourceId = `DATA_REPAIR:payment:${orderId}`;
      if (repairedSources.has(sourceId)) continue;
      repairedSources.add(sourceId);
      newEvents.push({
        id: `mevt_repair_${orderId}`,
        userId,
        userEmail: email,
        eventType: "DATA_REPAIR",
        source: "reconcile-memberships",
        sourceId,
        previousExpiresAt: current,
        newExpiresAt: final,
        daysChanged: Math.round(
          (new Date(final).getTime() - new Date(current ?? final).getTime()) /
            (24 * 60 * 60 * 1000)
        ),
        operatorId: null,
        note: "reconcile from approved payments",
        createdAt: new Date().toISOString(),
      });
    }

    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...(user.app_metadata ?? {}),
        membership_status: "active",
        membership_expires_at: final,
      },
    });

    try {
      await admin.from("profiles").upsert(
        {
          id: userId,
          email,
          membership_status: "active",
          membership_expires_at: final,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch {
      /* optional */
    }
  }

  // Also scan payment_history on users with no storage orders.
  for (const user of users) {
    const email = (user.email ?? "").toLowerCase();
    const meta = (user.app_metadata ?? {}) as {
      role?: string;
      membership_expires_at?: string;
      payment_history?: Array<{
        paymentId: string;
        plan: string;
        status: string;
        reviewed_at?: string;
        submitted_at?: string;
        isSystemTest?: boolean;
      }>;
    };
    if (meta.role === "admin") continue;
    if (byUser.has(user.id)) continue;
    const hist = (meta.payment_history ?? []).filter(
      (h) => h.status === "approved" && !h.isSystemTest
    );
    if (!hist.length) continue;
    const asOrders: Order[] = hist.map((h) => ({
      orderId: h.paymentId,
      userId: user.id,
      userEmail: email,
      plan: h.plan,
      status: "approved",
      approvedAt: h.reviewed_at ?? h.submitted_at,
      submittedAt: h.submitted_at,
    }));
    const current = meta.membership_expires_at ?? null;
    const { computed, appliedIds } = computeFromPayments(asOrders, current);
    const final = later(current, computed);
    const willUpdate =
      Boolean(final) &&
      (!current || new Date(final!).getTime() > new Date(current).getTime());
    previews.push({
      email,
      userId: user.id,
      currentExpiresAt: current,
      computedFromPayments: computed,
      finalExpiresAt: final,
      willUpdate,
      paymentCount: hist.length,
    });
    if (!WRITE || !willUpdate || !final) continue;
    for (const orderId of appliedIds) {
      const sourceId = `DATA_REPAIR:payment:${orderId}`;
      if (repairedSources.has(sourceId)) continue;
      repairedSources.add(sourceId);
      newEvents.push({
        id: `mevt_repair_${orderId}`,
        userId: user.id,
        userEmail: email,
        eventType: "DATA_REPAIR",
        source: "reconcile-memberships",
        sourceId,
        previousExpiresAt: current,
        newExpiresAt: final,
        daysChanged: 0,
        operatorId: null,
        note: "reconcile from payment_history",
        createdAt: new Date().toISOString(),
      });
    }
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...(user.app_metadata ?? {}),
        membership_status: "active",
        membership_expires_at: final,
      },
    });
  }

  if (WRITE && newEvents.length) {
    const merged = [...newEvents, ...existingEvents].slice(0, 5000);
    await admin.storage.from(BUCKET).upload(
      EVENTS_FILE,
      JSON.stringify(
        { version: 1, updatedAt: new Date().toISOString(), events: merged },
        null,
        2
      ),
      { contentType: "application/json", upsert: true }
    );
  }

  const toFix = previews.filter((p) => p.willUpdate);
  console.log(
    JSON.stringify(
      {
        mode: WRITE ? "write" : "preview",
        usersScanned: previews.length,
        usersNeedingRepair: toFix.length,
        preview: previews.sort((a, b) => a.email.localeCompare(b.email)),
        huohuo: previews.find((p) => p.email.includes("huohuo")),
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
