import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { grantMembershipFromPlan } from "@/lib/auth/grant-membership";
import {
  getCurrentUser,
  PLAN_DAYS,
  PLAN_LABELS,
  PLAN_PRICES,
  requireAdmin,
  toAuthUserView,
  updateUserAppMetadata,
  type AuthUserView,
  type MembershipPlan,
  type PaymentHistoryItem,
  type PaymentNetwork,
  type PendingPayment,
} from "@/lib/auth/permissions";
import {
  isPaymentEmailConfigured,
  notifyAdminNewPayment,
  notifyBuyerMembershipActivated,
  notifyBuyerPaymentRejected,
} from "@/lib/email/notifications";
import { getPaymentConfig } from "@/lib/payments/config";
import {
  createPaymentOrder,
  findPaymentOrderByTxHash,
  getPaymentOrderById,
  markPaymentOrderTest,
  updatePaymentOrderNotification,
  updatePaymentOrderStatus,
} from "@/lib/payments/payment-orders-store";
import { getAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const submitSchema = z.object({
  plan: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  network: z.enum(["TRC20", "BEP20"]),
  txHash: z.string().min(20).max(200),
  isSystemTest: z.boolean().optional(),
});

const reviewSchema = z.object({
  orderId: z.string().min(1).optional(),
  userId: z.string().uuid().optional(),
  action: z.enum(["approve", "reject", "mark_test"]),
});

function normalizeHash(h: string): string {
  return h.trim().toLowerCase();
}

async function resolveRequestUser(request: NextRequest): Promise<AuthUserView | null> {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
      const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim();
      if (url && anon) {
        const { createClient } = await import("@supabase/supabase-js");
        const { normalizeSupabaseUrl } = await import("@/lib/supabase/normalize-url");
        const normalized = normalizeSupabaseUrl(url);
        if (normalized) {
          const userClient = createClient(normalized, anon, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data, error } = await userClient.auth.getUser();
          if (!error && data.user?.email) {
            const admin = getAdminClient();
            if (admin) {
              const full = await admin.auth.admin.getUserById(data.user.id);
              if (full.data.user) return toAuthUserView(full.data.user);
            }
            return toAuthUserView(data.user);
          }
        }
      }
    }
  }
  return getCurrentUser();
}

function mapNotifyStatus(
  status: "sent" | "email_failed" | "email_not_configured"
): "email_sent" | "email_failed" | "email_not_configured" {
  if (status === "sent") return "email_sent";
  return status;
}

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: z.infer<typeof submitSchema>;
  try {
    body = submitSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "参数无效：请检查套餐、网络和交易哈希" }, { status: 400 });
  }

  const txHash = body.txHash.trim();
  const existing = await findPaymentOrderByTxHash(txHash);
  if (existing && existing.status !== "rejected") {
    return NextResponse.json({ error: "该交易哈希已提交，请勿重复提交。" }, { status: 409 });
  }

  const plan = body.plan as MembershipPlan;
  const amount = PLAN_PRICES[plan];
  const durationDays = PLAN_DAYS[plan];
  const isSystemTest = Boolean(body.isSystemTest) || /^SYSTEM[_-]?TEST|^HUOHUO_TEST|^SMOKE_/i.test(txHash);

  let order;
  try {
    order = await createPaymentOrder({
      userId: user.id,
      email: user.email,
      plan,
      network: body.network as PaymentNetwork,
      txHash,
      notificationStatus: isPaymentEmailConfigured() ? "email_failed" : "email_not_configured",
      isTest: isSystemTest,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "付款信息保存失败，请稍后重试。";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const rawNotify = await notifyAdminNewPayment({
    email: user.email,
    planLabel: PLAN_LABELS[plan],
    amount,
    network: body.network,
    txHash,
    submittedAt: formatDateTimeChina(order.submittedAt),
    paymentId: order.orderNumber,
    reviewUrl: "https://moon-x-genesis.vercel.app/admin/payments",
  });
  const notificationStatus = mapNotifyStatus(rawNotify);
  await updatePaymentOrderNotification(order.orderId, notificationStatus);

  const pending: PendingPayment = {
    paymentId: order.orderId,
    userId: user.id,
    email: user.email,
    plan,
    network: body.network as PaymentNetwork,
    tx_hash: txHash,
    amount,
    submitted_at: order.submittedAt,
    status: "pending",
    notificationStatus: notificationStatus === "email_sent" ? "sent" : notificationStatus,
    isSystemTest: isSystemTest || undefined,
  };

  const history = [...(user.app_metadata.payment_history ?? [])];
  history.unshift({
    paymentId: order.orderId,
    plan,
    network: body.network as PaymentNetwork,
    tx_hash: txHash,
    amount,
    submitted_at: order.submittedAt,
    status: "pending",
    notificationStatus: pending.notificationStatus,
    isSystemTest: pending.isSystemTest,
  });

  try {
    await updateUserAppMetadata(user.id, {
      pending_payment: pending,
      payment_history: history.slice(0, 50),
    });
  } catch {
    // Order already saved — metadata sync failure must not undo order.
  }

  return NextResponse.json({
    ok: true,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    plan,
    planName: PLAN_LABELS[plan],
    amount,
    durationDays,
    network: body.network,
    status: "pending",
    notificationStatus,
    emailConfigured: isPaymentEmailConfigured(),
    message: "付款信息已提交",
  });
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let body: z.infer<typeof reviewSchema>;
  try {
    body = reviewSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "服务未配置" }, { status: 503 });

  let order = body.orderId ? await getPaymentOrderById(body.orderId) : null;
  let userId = body.userId ?? order?.userId ?? undefined;

  if (!order && userId) {
    const { data } = await admin.auth.admin.getUserById(userId);
    const pending = (data.user?.app_metadata as { pending_payment?: PendingPayment } | undefined)
      ?.pending_payment;
    if (pending?.paymentId) {
      order = await getPaymentOrderById(pending.paymentId);
      if (!order && pending.tx_hash) order = await findPaymentOrderByTxHash(pending.tx_hash);
    }
  }

  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

  if (body.action === "mark_test") {
    const updated = await markPaymentOrderTest(order.orderId, true);
    return NextResponse.json({ ok: true, order: updated });
  }

  // Idempotent: already-approved orders must not re-extend membership.
  if (order.status === "approved" && body.action === "approve") {
    return NextResponse.json({
      ok: true,
      alreadyProcessed: true,
      membershipExpiresAt: null,
      message: "付款已审核，未重复加时",
    });
  }

  if (order.status !== "pending") {
    return NextResponse.json({ error: "订单已处理" }, { status: 400 });
  }

  userId = userId ?? order.userId;
  if (!userId) return NextResponse.json({ error: "订单缺少用户信息" }, { status: 400 });

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const meta = data.user.app_metadata as {
    pending_payment?: PendingPayment;
    payment_history?: PaymentHistoryItem[];
    membership_expires_at?: string;
    membership_started_at?: string;
  };
  const history = [...(meta.payment_history ?? [])];
  const reviewedAt = new Date().toISOString();
  const idx = history.findIndex(
    (h) => h.paymentId === order!.orderId || normalizeHash(h.tx_hash) === normalizeHash(order!.txHash)
  );
  const reviewer = await getCurrentUser();

  // History already approved for this payment → do not re-grant.
  if (
    body.action === "approve" &&
    idx >= 0 &&
    history[idx]?.status === "approved"
  ) {
    return NextResponse.json({
      ok: true,
      alreadyProcessed: true,
      membershipExpiresAt: meta.membership_expires_at ?? null,
      message: "付款已审核，未重复加时",
    });
  }

  if (body.action === "reject") {
    await updatePaymentOrderStatus({
      id: order.orderId,
      status: "rejected",
      reviewedBy: reviewer?.id,
    });
    const entry: PaymentHistoryItem = {
      paymentId: order.orderId,
      plan: order.plan,
      network: order.network,
      tx_hash: order.txHash,
      amount: order.amount,
      submitted_at: order.submittedAt,
      reviewed_at: reviewedAt,
      status: "rejected",
      isSystemTest: order.isTest,
    };
    if (idx >= 0) history[idx] = entry;
    else history.unshift(entry);
    await updateUserAppMetadata(userId, {
      pending_payment: null,
      payment_history: history.slice(0, 50),
    });
    if (data.user.email) {
      await notifyBuyerPaymentRejected({
        to: data.user.email,
        txHash: order.txHash,
        supportEmail: getPaymentConfig().supportEmail || "jackzwin999@gmail.com",
      });
    }
    return NextResponse.json({ ok: true });
  }

  const startedAt = meta.membership_started_at ?? reviewedAt;

  await updatePaymentOrderStatus({
    id: order.orderId,
    status: "approved",
    reviewedBy: reviewer?.id,
  });

  const grant = await grantMembershipFromPlan({
    userId,
    plan: order.plan,
    eventType: "PAYMENT_APPROVED",
    source: "payment_order",
    sourceId: order.orderId,
    operatorId: reviewer?.id ?? null,
    note: `plan=${order.plan}; tx=${order.txHash}`,
  });

  const expiresAt = grant.newExpiresAt ?? meta.membership_expires_at ?? null;

  const entry: PaymentHistoryItem = {
    paymentId: order.orderId,
    plan: order.plan,
    network: order.network,
    tx_hash: order.txHash,
    amount: order.amount,
    submitted_at: order.submittedAt,
    reviewed_at: reviewedAt,
    status: "approved",
    isSystemTest: order.isTest,
  };
  if (idx >= 0) history[idx] = entry;
  else history.unshift(entry);

  await updateUserAppMetadata(userId, {
    pending_payment: null,
    payment_history: history.slice(0, 50),
    membership_plan: order.plan,
    membership_started_at: startedAt,
    ...(expiresAt
      ? { membership_status: "active" as const, membership_expires_at: expiresAt }
      : {}),
  });

  let referralReward: { applied: boolean; skipped?: string } | null = null;
  try {
    const { processReferralRewardAfterPayment } = await import("@/lib/referral/service");
    referralReward = await processReferralRewardAfterPayment({
      inviteeId: userId,
      paymentId: order.orderId,
    });
  } catch (err) {
    console.warn(
      "[referral] reward failed:",
      err instanceof Error ? err.message : err
    );
    referralReward = { applied: false, skipped: "reward_error" };
  }

  if (data.user.email && expiresAt) {
    await notifyBuyerMembershipActivated({
      to: data.user.email,
      planLabel: PLAN_LABELS[order.plan],
      startedAt: formatDateTimeChina(startedAt),
      expiresAt: formatDateTimeChina(expiresAt),
    });
  }

  return NextResponse.json({
    ok: true,
    membershipExpiresAt: expiresAt,
    grantApplied: grant.applied,
    grantSkipped: grant.skipped ?? null,
    referralReward,
  });
}
