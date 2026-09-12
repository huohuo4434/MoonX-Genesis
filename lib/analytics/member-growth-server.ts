import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireAdminOrRedirect, toAuthUserView, isAdmin, isActiveMember } from "@/lib/auth/permissions";
import { isSandboxUser } from "@/lib/admin/sandbox-data";
import { summarizeMemberGrowth, type GrowthPayment, type GrowthUser } from "./member-growth-core";

type Row = Record<string, unknown>;
const str = (v: unknown) => typeof v === "string" ? v : "";
const obj = (v: unknown): Row => v && typeof v === "object" && !Array.isArray(v) ? v as Row : {};

/** Strict read-only source loading. Unlike legacy admin list helpers, a failed
 * request must not turn into a zero-payment report. No health/storage writes. */
export async function readMemberGrowth() {
  await requireAdminOrRedirect("/admin/users");
  const admin = getAdminClient();
  if (!admin) throw new Error("Growth source unavailable");
  const users: GrowthUser[] = [];
  for (let page = 1; ; page++) {
    if (page > 50) throw new Error("Growth user limit exceeded");
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users) throw new Error("Growth users unavailable");
    for (const raw of data.users) {
      const u = toAuthUserView(raw);
      if (!u.email || isAdmin(u) || isSandboxUser(u)) continue;
      users.push({ id: u.id, email: u.email, createdAt: u.created_at,
        expiresAt: u.app_metadata.membership_expires_at ?? null, active: isActiveMember(u),
        firstTouch: u.app_metadata.acquisition_first_touch, lastTouch: u.app_metadata.acquisition_last_touch });
    }
    if (data.users.length < 1000) break;
  }
  const payments: GrowthPayment[] = [];
  for (let offset = 0; ; offset += 1000) {
    if (offset >= 50000) throw new Error("Growth payment limit exceeded");
    const { data, error } = await admin.from("payment_orders")
      .select("id,user_id,chain,tx_hash,status,paid_at,paid_amount,metadata")
      .order("id", { ascending: true }).range(offset, offset + 999);
    if (error || !data) throw new Error("Growth payments unavailable");
    for (const raw of data as Row[]) {
      const m = obj(raw.metadata);
      const received = Number(raw.paid_amount ?? m.actualReceivedAmount);
      payments.push({ id: str(raw.id), userId: str(raw.user_id), network: str(raw.chain), tx: str(raw.tx_hash),
        at: str(raw.paid_at) || str(m.manualActivatedAt) || null,
        confirmed: received > 0 && (["paid", "overpaid"].includes(str(raw.status)) ||
          (m.membershipGranted === true && m.manualGoodwillState === "COMPLETED" && m.manualGoodwillAuditComplete === true)),
        refunded: raw.status === "refunded", test: m.isTest === true || m.is_system_test === true });
    }
    if (data.length < 1000) break;
  }
  // Both documented legacy locations are read; transaction identity deduplicates mirrors.
  let legacyRead = 0;
  for (const path of ["payments/orders.json", "payment-orders.json"]) {
    const { data, error } = await admin.storage.from("moonx-data").download(path);
    if (error || !data) {
      if (error && (String((error as unknown as { statusCode?: string }).statusCode) === "404"
        || /^(object not found|the resource was not found)$/i.test(error.message.trim()))) continue;
      throw new Error("Growth legacy payments unavailable");
    }
    const store = obj(JSON.parse(await data.text()));
    const rows = store.orders ?? store.records;
    if (!Array.isArray(rows)) throw new Error("Growth legacy format invalid");
    legacyRead++;
    for (const item of rows) {
      const p = obj(item);
      payments.push({ id: str(p.orderId ?? p.id), userId: str(p.userId ?? p.user_id),
        network: str(p.network), tx: str(p.txHash ?? p.tx_hash), at: str(p.approvedAt ?? p.reviewed_at) || null,
        confirmed: p.status === "approved" && Number(p.amount) > 0,
        test: p.isTest === true || p.is_system_test === true });
    }
  }
  if (!legacyRead) throw new Error("Growth legacy history missing");
  return summarizeMemberGrowth(users, payments);
}
