/**
 * Payment orders — Supabase Storage only (no SQL).
 * Path: moonx-data/payments/orders.json
 */
import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  PLAN_DAYS,
  PLAN_LABELS,
  PLAN_PRICES,
  type MembershipPlan,
  type PaymentNetwork,
} from "@/lib/auth/permissions";

export type PaymentOrderStatus = "pending" | "approved" | "rejected";
export type PaymentOrderNotificationStatus =
  | "email_sent"
  | "sent"
  | "email_failed"
  | "email_not_configured";

export type PaymentOrderRecord = {
  orderId: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  plan: MembershipPlan;
  planName: string;
  amount: number;
  durationDays: number;
  network: PaymentNetwork;
  txHash: string;
  status: PaymentOrderStatus;
  submittedAt: string;
  notificationStatus: PaymentOrderNotificationStatus;
  isTest: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  /** Legacy aliases kept for older readers */
  id?: string;
  order_number?: string;
  user_id?: string;
  user_email?: string;
  tx_hash?: string;
  created_at?: string;
  is_system_test?: boolean;
  notification_status?: PaymentOrderNotificationStatus | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

type JsonStore = { version: 1; updatedAt: string; orders: PaymentOrderRecord[] };

const BUCKET = "moonx-data";
const FILE = "payments/orders.json";
const LEGACY_FILES = ["payment-orders.json", "payments/orders.json"];

function newOrderId(): string {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function newOrderNumber(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `MOONX-${rand}`;
}

function normalizeHash(h: string): string {
  return h.trim().toLowerCase();
}

function normalizeRecord(raw: Record<string, unknown>): PaymentOrderRecord | null {
  const orderId = String(raw.orderId ?? raw.id ?? "");
  const txHash = String(raw.txHash ?? raw.tx_hash ?? "");
  const userEmail = String(raw.userEmail ?? raw.user_email ?? "");
  const plan = String(raw.plan ?? "") as MembershipPlan;
  if (!orderId || !txHash || !userEmail || !["MONTHLY", "QUARTERLY", "YEARLY"].includes(plan)) {
    return null;
  }
  const network = (String(raw.network ?? "TRC20") as PaymentNetwork) || "TRC20";
  const status = (String(raw.status ?? "pending") as PaymentOrderStatus) || "pending";
  const submittedAt = String(raw.submittedAt ?? raw.created_at ?? new Date().toISOString());
  const amount = Number(raw.amount ?? PLAN_PRICES[plan] ?? 0);
  const durationDays = Number(raw.durationDays ?? PLAN_DAYS[plan] ?? 30);
  const notificationStatus = String(
    raw.notificationStatus ?? raw.notification_status ?? "email_not_configured"
  ) as PaymentOrderNotificationStatus;
  const isTest = Boolean(raw.isTest ?? raw.is_system_test ?? false);
  const userId = String(raw.userId ?? raw.user_id ?? "");
  const orderNumber = String(raw.orderNumber ?? raw.order_number ?? orderId);

  return {
    orderId,
    orderNumber,
    userId,
    userEmail: userEmail.toLowerCase(),
    plan,
    planName: String(raw.planName ?? PLAN_LABELS[plan] ?? plan),
    amount,
    durationDays,
    network,
    txHash,
    status,
    submittedAt,
    notificationStatus: notificationStatus === "sent" ? "email_sent" : notificationStatus,
    isTest,
    approvedAt: (raw.approvedAt as string | null | undefined) ?? (raw.reviewed_at as string | null | undefined) ?? null,
    approvedBy: (raw.approvedBy as string | null | undefined) ?? (raw.reviewed_by as string | null | undefined) ?? null,
    rejectedAt: (raw.rejectedAt as string | null | undefined) ?? null,
    // legacy mirrors
    id: orderId,
    order_number: orderNumber,
    user_id: userId,
    user_email: userEmail.toLowerCase(),
    tx_hash: txHash,
    created_at: submittedAt,
    is_system_test: isTest,
    notification_status: notificationStatus === "sent" ? "email_sent" : notificationStatus,
    reviewed_at: (raw.approvedAt as string | null | undefined) ?? (raw.reviewed_at as string | null | undefined) ?? null,
    reviewed_by: (raw.approvedBy as string | null | undefined) ?? (raw.reviewed_by as string | null | undefined) ?? null,
  };
}

async function ensureBucket() {
  const admin = getAdminClient();
  if (!admin) throw new Error("付款信息保存失败，请稍后重试。");
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw new Error("付款信息保存失败，请稍后重试。");
    }
  }
  return admin;
}

async function readRawFile(path: string): Promise<PaymentOrderRecord[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as {
      orders?: Record<string, unknown>[];
      records?: Record<string, unknown>[];
    };
    const list = parsed.orders ?? parsed.records ?? [];
    return list.map((r) => normalizeRecord(r)).filter((r): r is PaymentOrderRecord => Boolean(r));
  } catch {
    return [];
  }
}

async function writeOrders(orders: PaymentOrderRecord[]): Promise<void> {
  const admin = await ensureBucket();
  const body: JsonStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    orders,
  };
  const { error } = await admin.storage.from(BUCKET).upload(FILE, JSON.stringify(body, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) {
    console.error("[payment-orders] write failed", error.message);
    throw new Error("付款信息保存失败，请稍后重试。");
  }
}

export async function listPaymentOrders(): Promise<PaymentOrderRecord[]> {
  const map = new Map<string, PaymentOrderRecord>();
  for (const path of LEGACY_FILES) {
    const rows = await readRawFile(path);
    for (const r of rows) map.set(r.orderId, r);
  }
  return [...map.values()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function countPendingPaymentOrders(): Promise<number> {
  const rows = await listPaymentOrders();
  return rows.filter((r) => r.status === "pending").length;
}

export async function findPaymentOrderByTxHash(txHash: string): Promise<PaymentOrderRecord | null> {
  const key = normalizeHash(txHash);
  const rows = await listPaymentOrders();
  return rows.find((r) => normalizeHash(r.txHash) === key) ?? null;
}

export async function getPaymentOrderById(id: string): Promise<PaymentOrderRecord | null> {
  const rows = await listPaymentOrders();
  return rows.find((r) => r.orderId === id || r.id === id) ?? null;
}

export async function listPaymentOrdersForEmail(email: string): Promise<PaymentOrderRecord[]> {
  const key = email.trim().toLowerCase();
  const rows = await listPaymentOrders();
  return rows.filter((r) => r.userEmail === key);
}

export async function listPendingPaymentOrders(limit = 5): Promise<PaymentOrderRecord[]> {
  return (await listPaymentOrders()).filter((r) => r.status === "pending").slice(0, limit);
}

export async function createPaymentOrder(input: {
  userId: string;
  email: string;
  plan: MembershipPlan;
  network: PaymentNetwork;
  txHash: string;
  notificationStatus?: PaymentOrderNotificationStatus;
  isTest?: boolean;
}): Promise<PaymentOrderRecord> {
  const existing = await findPaymentOrderByTxHash(input.txHash);
  if (existing && existing.status !== "rejected") {
    throw new Error("该交易哈希已提交，请勿重复提交。");
  }

  const orderId = newOrderId();
  const orderNumber = newOrderNumber();
  const submittedAt = new Date().toISOString();
  const row: PaymentOrderRecord = {
    orderId,
    orderNumber,
    userId: input.userId,
    userEmail: input.email.trim().toLowerCase(),
    plan: input.plan,
    planName: PLAN_LABELS[input.plan],
    amount: PLAN_PRICES[input.plan],
    durationDays: PLAN_DAYS[input.plan],
    network: input.network,
    txHash: input.txHash.trim(),
    status: "pending",
    submittedAt,
    notificationStatus: input.notificationStatus ?? "email_not_configured",
    isTest: Boolean(input.isTest),
    id: orderId,
    order_number: orderNumber,
    user_id: input.userId,
    user_email: input.email.trim().toLowerCase(),
    tx_hash: input.txHash.trim(),
    created_at: submittedAt,
    is_system_test: Boolean(input.isTest),
    notification_status: input.notificationStatus ?? "email_not_configured",
  };

  const current = await listPaymentOrders();
  const next = [row, ...current.filter((r) => r.orderId !== row.orderId)].slice(0, 500);
  await writeOrders(next);
  return row;
}

export async function importPaymentOrder(row: PaymentOrderRecord): Promise<PaymentOrderRecord> {
  const existing = await findPaymentOrderByTxHash(row.txHash);
  if (existing) return existing;
  const current = await listPaymentOrders();
  const normalized = normalizeRecord(row as unknown as Record<string, unknown>);
  if (!normalized) throw new Error("付款信息保存失败，请稍后重试。");
  await writeOrders([normalized, ...current].slice(0, 500));
  return normalized;
}

export async function updatePaymentOrderNotification(
  orderId: string,
  notificationStatus: PaymentOrderNotificationStatus
): Promise<void> {
  const current = await listPaymentOrders();
  const idx = current.findIndex((r) => r.orderId === orderId);
  if (idx < 0) return;
  current[idx] = {
    ...current[idx]!,
    notificationStatus,
    notification_status: notificationStatus,
  };
  await writeOrders(current);
}

export async function updatePaymentOrderStatus(input: {
  id: string;
  status: "approved" | "rejected";
  reviewedBy?: string;
}): Promise<PaymentOrderRecord | null> {
  const current = await listPaymentOrders();
  const idx = current.findIndex((r) => r.orderId === input.id || r.id === input.id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const prev = current[idx]!;
  current[idx] = {
    ...prev,
    status: input.status,
    approvedAt: input.status === "approved" ? now : prev.approvedAt ?? null,
    approvedBy: input.reviewedBy ?? prev.approvedBy ?? null,
    rejectedAt: input.status === "rejected" ? now : prev.rejectedAt ?? null,
    reviewed_at: now,
    reviewed_by: input.reviewedBy ?? null,
  };
  await writeOrders(current);
  return current[idx]!;
}

export async function markPaymentOrderTest(orderId: string, isTest = true): Promise<PaymentOrderRecord | null> {
  const current = await listPaymentOrders();
  const idx = current.findIndex((r) => r.orderId === orderId || r.id === orderId);
  if (idx < 0) return null;
  current[idx] = { ...current[idx]!, isTest, is_system_test: isTest };
  await writeOrders(current);
  return current[idx]!;
}

/** @deprecated alias */
export type { PaymentOrderRecord as LegacyPaymentOrderRecord };
