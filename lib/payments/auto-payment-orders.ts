import "server-only";

import { randomInt, randomUUID } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { chainTokenMeta, getPaymentConfig } from "@/lib/payments/config";
import {
  OFFICIAL_PLAN_PRICES,
  PLAN_DAYS,
  PLAN_LABELS_ZH,
  discountedPrice,
  type FounderDiscountQuote,
} from "@/lib/payments/founder-discount-shared";
import type { AuthUserView, MembershipPlan, PaymentNetwork } from "@/lib/auth/permissions";
import type { PaymentChain } from "@/types/membership";
import type { VerifiedTransfer } from "@/types/membership";
import {
  isPaymentMembershipActivatedSnapshot,
  matchesExistingManualReviewEvidence,
  runAuditInsertWithRecovery,
  runRequiredGoodwillAuditFinalization,
} from "@/lib/payments/manual-goodwill-core";
import { hasMembershipEventForSource } from "@/lib/auth/membership-events";
import {
  isWithinPaymentDiscoveryGrace,
  paymentDiscoveryCutoff,
} from "@/lib/payments/auto-payment-timing-core";

export type AutoPaymentOrderStatus =
  | "pending"
  | "verifying"
  | "paid"
  | "underpaid"
  | "overpaid"
  | "expired"
  | "manual_review"
  | "rejected"
  | "refunded";

export interface AutoPaymentMetadata {
  planCode: MembershipPlan;
  planName: string;
  durationDays: number;
  listPrice: number;
  discountPercent: 0 | 10 | 20;
  founderRank: number | null;
  founderStatus: string;
  uniqueSuffix: number;
  autoVerification: true;
  network: PaymentNetwork;
  txSubmittedAt?: string | null;
  processingStartedAt?: string | null;
  lastAttemptAt?: string | null;
  attemptCount?: number;
  verificationState?: string | null;
  buyerEmail?: string | null;
  adminNotificationStatus?: "sent" | "email_failed" | "email_not_configured" | null;
  adminNotificationError?: string | null;
  adminNotifiedAt?: string | null;
  lastAdminNotificationKind?: string | null;
  recoveryVersion?: string | null;
  manualActivatedAt?: string | null;
  manualActivatedBy?: string | null;
  manualGoodwillReason?: string | null;
  actualReceivedAmount?: number | null;
  paymentShortfall?: number | null;
  chainEvidenceStatus?: string | null;
  membershipGranted?: boolean;
  manualGoodwillState?: "EVIDENCE_RECORDED" | "PROCESSING" | "AUDIT_PENDING" | "COMPLETED" | null;
  manualGoodwillOwner?: string | null;
  manualGoodwillStartedAt?: string | null;
  manualGoodwillCompletedAt?: string | null;
  manualGoodwillAuditComplete?: boolean;
}

export interface AutoPaymentOrder {
  id: string;
  orderNumber: string;
  userId: string;
  planId: string;
  plan: MembershipPlan;
  planName: string;
  durationDays: number;
  listPrice: number;
  discountPercent: 0 | 10 | 20;
  founderRank: number | null;
  chain: PaymentChain;
  network: PaymentNetwork;
  tokenSymbol: string;
  tokenContract: string;
  recipientAddress: string;
  expectedAmount: number;
  paidAmount: number | null;
  status: AutoPaymentOrderStatus;
  txHash: string | null;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  verifiedAt: string | null;
  membershipExpiresAt: string | null;
  verificationError: string | null;
  metadata: AutoPaymentMetadata;
}

export function isAutoPaymentMembershipActivated(order: Pick<AutoPaymentOrder, "status" | "metadata">): boolean {
  return isPaymentMembershipActivatedSnapshot({ status: order.status, membershipGranted: order.metadata.membershipGranted });
}

export function isCompletedManualGoodwill(order: Pick<AutoPaymentOrder, "metadata">): boolean {
  return order.metadata.membershipGranted === true &&
    order.metadata.manualGoodwillState === "COMPLETED" &&
    order.metadata.manualGoodwillAuditComplete === true;
}

const ACTIVE_STATUSES: AutoPaymentOrderStatus[] = ["pending", "verifying"];
const ORDER_TTL_MINUTES = 45;

function networkToChain(network: PaymentNetwork): PaymentChain {
  return network === "TRC20" ? "TRON" : "BSC";
}

function chainToNetwork(chain: PaymentChain): PaymentNetwork {
  return chain === "TRON" ? "TRC20" : "BEP20";
}

function orderNumber(): string {
  const date = new Date();
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MX-${y}${m}${d}-${suffix}`;
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseMetadata(raw: unknown, fallback: {
  plan: MembershipPlan;
  network: PaymentNetwork;
  expectedAmount: number;
}): AutoPaymentMetadata {
  const m = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const discount = m.discountPercent === 20 || m.discountPercent === 10 ? m.discountPercent : 0;
  const rank = Number(m.founderRank ?? 0);
  const listPrice = asNumber(m.listPrice) || OFFICIAL_PLAN_PRICES[fallback.plan];
  return {
    planCode: fallback.plan,
    planName: String(m.planName ?? PLAN_LABELS_ZH[fallback.plan]),
    durationDays: asNumber(m.durationDays) || PLAN_DAYS[fallback.plan],
    listPrice,
    discountPercent: discount,
    founderRank: Number.isFinite(rank) && rank > 0 ? rank : null,
    founderStatus: String(m.founderStatus ?? "standard"),
    uniqueSuffix: asNumber(m.uniqueSuffix) || Math.max(0, fallback.expectedAmount - discountedPrice(fallback.plan, discount)),
    autoVerification: true,
    network: fallback.network,
    txSubmittedAt: typeof m.txSubmittedAt === "string" ? m.txSubmittedAt : null,
    processingStartedAt: typeof m.processingStartedAt === "string" ? m.processingStartedAt : null,
    lastAttemptAt: typeof m.lastAttemptAt === "string" ? m.lastAttemptAt : null,
    attemptCount: asNumber(m.attemptCount),
    verificationState: typeof m.verificationState === "string" ? m.verificationState : null,
    buyerEmail: typeof m.buyerEmail === "string" ? m.buyerEmail : null,
    adminNotificationStatus:
      m.adminNotificationStatus === "sent" ||
      m.adminNotificationStatus === "email_failed" ||
      m.adminNotificationStatus === "email_not_configured"
        ? m.adminNotificationStatus
        : null,
    adminNotificationError: typeof m.adminNotificationError === "string" ? m.adminNotificationError : null,
    adminNotifiedAt: typeof m.adminNotifiedAt === "string" ? m.adminNotifiedAt : null,
    lastAdminNotificationKind: typeof m.lastAdminNotificationKind === "string" ? m.lastAdminNotificationKind : null,
    recoveryVersion: typeof m.recoveryVersion === "string" ? m.recoveryVersion : null,
    manualActivatedAt: typeof m.manualActivatedAt === "string" ? m.manualActivatedAt : null,
    manualActivatedBy: typeof m.manualActivatedBy === "string" ? m.manualActivatedBy : null,
    manualGoodwillReason: typeof m.manualGoodwillReason === "string" ? m.manualGoodwillReason : null,
    actualReceivedAmount: m.actualReceivedAmount == null ? null : asNumber(m.actualReceivedAmount),
    paymentShortfall: m.paymentShortfall == null ? null : asNumber(m.paymentShortfall),
    chainEvidenceStatus: typeof m.chainEvidenceStatus === "string" ? m.chainEvidenceStatus : null,
    membershipGranted: m.membershipGranted === true,
    manualGoodwillState: ["EVIDENCE_RECORDED", "PROCESSING", "AUDIT_PENDING", "COMPLETED"].includes(String(m.manualGoodwillState))
      ? m.manualGoodwillState as AutoPaymentMetadata["manualGoodwillState"]
      : null,
    manualGoodwillOwner: typeof m.manualGoodwillOwner === "string" ? m.manualGoodwillOwner : null,
    manualGoodwillStartedAt: typeof m.manualGoodwillStartedAt === "string" ? m.manualGoodwillStartedAt : null,
    manualGoodwillCompletedAt: typeof m.manualGoodwillCompletedAt === "string" ? m.manualGoodwillCompletedAt : null,
    manualGoodwillAuditComplete: m.manualGoodwillAuditComplete === true,
  };
}

function mapRow(row: Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null }): AutoPaymentOrder {
  const planRaw = row.membership_plans?.code ?? (row.metadata as Record<string, unknown> | undefined)?.planCode ?? "MONTHLY";
  const plan = (["MONTHLY", "QUARTERLY", "YEARLY"].includes(String(planRaw)) ? planRaw : "MONTHLY") as MembershipPlan;
  const chain = String(row.chain) === "BSC" ? "BSC" : "TRON";
  const network = chainToNetwork(chain);
  const expectedAmount = asNumber(row.expected_amount);
  const metadata = parseMetadata(row.metadata, { plan, network, expectedAmount });
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    userId: String(row.user_id),
    planId: String(row.plan_id),
    plan,
    planName: metadata.planName || row.membership_plans?.name || PLAN_LABELS_ZH[plan],
    durationDays: metadata.durationDays || row.membership_plans?.duration_days || PLAN_DAYS[plan],
    listPrice: metadata.listPrice,
    discountPercent: metadata.discountPercent,
    founderRank: metadata.founderRank,
    chain,
    network,
    tokenSymbol: String(row.token_symbol),
    tokenContract: String(row.token_contract),
    recipientAddress: String(row.recipient_address),
    expectedAmount,
    paidAmount: row.paid_amount == null ? null : asNumber(row.paid_amount),
    status: String(row.status) as AutoPaymentOrderStatus,
    txHash: row.tx_hash ? String(row.tx_hash) : null,
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
    paidAt: row.paid_at ? String(row.paid_at) : null,
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    membershipExpiresAt: row.membership_expires_at ? String(row.membership_expires_at) : null,
    verificationError: row.verification_error ? String(row.verification_error) : null,
    metadata,
  };
}

async function ensureProfileAndPlan(user: AuthUserView, plan: MembershipPlan): Promise<string> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动支付服务未配置");

  const now = new Date().toISOString();
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email.toLowerCase(),
      display_name: user.email.split("@")[0] ?? user.email,
      updated_at: now,
    },
    { onConflict: "id" }
  );
  if (profileError) throw new Error(`会员资料同步失败：${profileError.message}`);

  const { error: planUpsertError } = await admin.from("membership_plans").upsert(
    {
      code: plan,
      name: PLAN_LABELS_ZH[plan],
      duration_days: PLAN_DAYS[plan],
      price_usdt: OFFICIAL_PLAN_PRICES[plan],
      access_level: "member",
      active: true,
      sort_order: plan === "MONTHLY" ? 1 : plan === "QUARTERLY" ? 2 : 3,
      updated_at: now,
    },
    { onConflict: "code" }
  );
  if (planUpsertError) throw new Error(`会员价格同步失败：${planUpsertError.message}`);

  const { data, error } = await admin
    .from("membership_plans")
    .select("id")
    .eq("code", plan)
    .single();
  if (error || !data?.id) throw new Error("会员套餐不存在");
  return String(data.id);
}

async function reserveExactAmount(chain: PaymentChain, baseAmount: number): Promise<{ amount: number; suffix: number }> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动支付服务未配置");
  const discoveryCutoff = paymentDiscoveryCutoff().toISOString();
  const { data } = await admin
    .from("payment_orders")
    .select("expected_amount")
    .eq("chain", chain)
    .in("status", ACTIVE_STATUSES)
    .gt("expires_at", discoveryCutoff)
    .gte("expected_amount", baseAmount)
    .lt("expected_amount", baseAmount + 0.01);
  const occupied = new Set((data ?? []).map((row) => Number(row.expected_amount).toFixed(5)));

  for (let i = 0; i < 80; i += 1) {
    const suffix = randomInt(1, 1000) / 100000;
    const amount = Number((baseAmount + suffix).toFixed(5));
    if (!occupied.has(amount.toFixed(5))) return { amount, suffix };
  }
  throw new Error("当前付款订单较多，请稍后重新生成订单");
}

export async function createAutoPaymentOrder(input: {
  user: AuthUserView;
  plan: MembershipPlan;
  network: PaymentNetwork;
  founderQuote: FounderDiscountQuote;
}): Promise<AutoPaymentOrder> {
  const cfg = getPaymentConfig();
  if (input.network === "BEP20" && !cfg.bep20Enabled) {
    throw new Error("BEP20 自动支付暂未启用，请选择 TRC20");
  }
  const admin = getAdminClient();
  if (!admin) throw new Error("自动支付服务未配置");

  const planId = await ensureProfileAndPlan(input.user, input.plan);
  const chain = networkToChain(input.network);
  const token = chainTokenMeta(chain);
  const { data: existing } = await admin
    .from("payment_orders")
    .select("*, membership_plans(code,name,duration_days)")
    .eq("user_id", input.user.id)
    .eq("plan_id", planId)
    .eq("chain", chain)
    .in("status", ACTIVE_STATUSES)
    .gt("expires_at", paymentDiscoveryCutoff().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return mapRow(existing as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null });
  }
  const baseAmount = discountedPrice(input.plan, input.founderQuote.discountPercent);
  const { amount, suffix } = await reserveExactAmount(chain, baseAmount);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ORDER_TTL_MINUTES * 60_000);
  const metadata: AutoPaymentMetadata = {
    planCode: input.plan,
    planName: PLAN_LABELS_ZH[input.plan],
    durationDays: PLAN_DAYS[input.plan],
    listPrice: OFFICIAL_PLAN_PRICES[input.plan],
    discountPercent: input.founderQuote.discountPercent,
    founderRank: input.founderQuote.founderRank,
    founderStatus: input.founderQuote.status,
    uniqueSuffix: suffix,
    autoVerification: true,
    network: input.network,
    attemptCount: 0,
    verificationState: "awaiting_transfer",
    buyerEmail: input.user.email.toLowerCase(),
  };

  const { data, error } = await admin
    .from("payment_orders")
    .insert({
      order_number: orderNumber(),
      user_id: input.user.id,
      plan_id: planId,
      chain,
      token_symbol: token.tokenSymbol,
      token_contract: token.tokenContract,
      recipient_address: token.recipientAddress,
      expected_amount: amount,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      metadata,
    })
    .select("*, membership_plans(code,name,duration_days)")
    .single();
  if (error || !data) throw new Error(`订单创建失败：${error?.message ?? "unknown"}`);
  return mapRow(data as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null });
}

export async function getAutoPaymentOrderById(orderId: string): Promise<AutoPaymentOrder | null> {
  const admin = getAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("payment_orders")
    .select("*, membership_plans(code,name,duration_days)")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null });
}

export async function listAutoPaymentOrdersForUser(userId: string, limit = 50): Promise<AutoPaymentOrder[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("payment_orders")
    .select("*, membership_plans(code,name,duration_days)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => mapRow(row as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null }));
}

export async function attachTransactionHash(input: {
  orderId: string;
  userId: string;
  txHash: string;
}): Promise<AutoPaymentOrder> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动支付服务未配置");
  const order = await getAutoPaymentOrderById(input.orderId);
  if (!order || order.userId !== input.userId) throw new Error("订单不存在");
  if (!["pending", "verifying"].includes(order.status)) throw new Error("该订单已处理");
  if (!isWithinPaymentDiscoveryGrace(order.expiresAt) && !order.txHash) {
    await admin.from("payment_orders").update({ status: "expired" }).eq("id", order.id).eq("status", "pending");
    throw new Error("订单已过期，请重新生成付款订单");
  }

  const { data: duplicate } = await admin
    .from("payment_orders")
    .select("id,user_id")
    .eq("tx_hash", input.txHash)
    .neq("id", order.id)
    .maybeSingle();
  if (duplicate) throw new Error("该交易哈希已被其他订单使用");

  const metadata = {
    ...order.metadata,
    txSubmittedAt: new Date().toISOString(),
    verificationState: "queued",
  };
  const { data, error } = await admin
    .from("payment_orders")
    .update({ tx_hash: input.txHash, status: "pending", verification_error: null, metadata })
    .eq("id", order.id)
    .eq("user_id", input.userId)
    .select("*, membership_plans(code,name,duration_days)")
    .single();
  if (error || !data) throw new Error(`交易哈希保存失败：${error?.message ?? "unknown"}`);
  return mapRow(data as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null });
}

export async function claimOrderForVerification(orderId: string): Promise<AutoPaymentOrder | null> {
  const admin = getAdminClient();
  if (!admin) return null;
  const now = new Date().toISOString();
  const current = await getAutoPaymentOrderById(orderId);
  if (!current || current.status !== "pending" || !current.txHash) return null;
  const metadata = {
    ...current.metadata,
    processingStartedAt: now,
    lastAttemptAt: now,
    attemptCount: (current.metadata.attemptCount ?? 0) + 1,
    verificationState: "verifying",
  };
  const { data, error } = await admin
    .from("payment_orders")
    .update({ status: "verifying", verified_at: now, verification_error: null, metadata })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("*, membership_plans(code,name,duration_days)")
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null });
}

export async function releaseOrderForRetry(order: AutoPaymentOrder, message: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  const metadata = {
    ...order.metadata,
    processingStartedAt: null,
    verificationState: "waiting_confirmation",
  };
  await admin
    .from("payment_orders")
    .update({ status: "pending", verified_at: null, verification_error: message.slice(0, 500), metadata })
    .eq("id", order.id)
    .eq("status", "verifying");
}

export async function markOrderException(order: AutoPaymentOrder, status: "underpaid" | "manual_review" | "rejected", message: string, paidAmount?: number): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  const metadata = {
    ...order.metadata,
    processingStartedAt: null,
    verificationState: status,
  };
  const { error } = await admin.from("payment_orders").update({
    status,
    paid_amount: paidAmount ?? null,
    verified_at: new Date().toISOString(),
    verification_error: message.slice(0, 500),
    metadata,
  }).eq("id", order.id);
  if (error) throw new Error(`付款异常状态保存失败：${error.message}`);
  await writePaymentAudit({
    orderId: order.id,
    action: status === "underpaid" ? "underpayment_detected" : "payment_exception",
    result: status,
    message,
    serverMetadata: {
      txHash: order.txHash,
      expectedAmount: order.expectedAmount,
      actualReceivedAmount: paidAmount ?? null,
      shortfall: paidAmount == null ? null : Number(Math.max(0, order.expectedAmount - paidAmount).toFixed(6)),
      automaticActivation: false,
    },
    required: status === "underpaid",
  });
}

export async function markOrderPaid(input: {
  order: AutoPaymentOrder;
  paidAmount: number;
  paidAt: string;
  membershipExpiresAt: string | null;
  rawPayload: Record<string, unknown>;
  blockNumber: number | null;
  senderAddress: string;
  amountRaw: string;
}): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动支付服务未配置");
  const finalStatus: AutoPaymentOrderStatus = input.paidAmount > input.order.expectedAmount + 0.000001 ? "overpaid" : "paid";
  const now = new Date().toISOString();
  const metadata = {
    ...input.order.metadata,
    processingStartedAt: null,
    verificationState: "activated",
  };
  await admin.from("crypto_transactions").upsert({
    chain: input.order.chain,
    tx_hash: input.order.txHash,
    block_number: input.blockNumber,
    sender_address: input.senderAddress,
    recipient_address: input.order.recipientAddress,
    token_contract: input.order.tokenContract,
    amount_raw: input.amountRaw,
    amount_normalized: input.paidAmount,
    block_timestamp: input.paidAt,
    confirmation_status: "confirmed",
    matched_order_id: input.order.id,
    processed_at: now,
    raw_payload: input.rawPayload,
  }, { onConflict: "tx_hash" });

  const { error } = await admin.from("payment_orders").update({
    status: finalStatus,
    paid_amount: input.paidAmount,
    paid_at: input.paidAt,
    verified_at: now,
    membership_expires_at: input.membershipExpiresAt,
    verification_error: null,
    metadata,
  }).eq("id", input.order.id);
  if (error) throw new Error(`订单完成状态保存失败：${error.message}`);
}

export async function listOrdersReadyForVerification(limit = 20): Promise<AutoPaymentOrder[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const staleBefore = new Date(Date.now() - 2 * 60_000).toISOString();
  await admin.from("payment_orders").update({ status: "pending", verified_at: null })
    .eq("status", "verifying")
    .lt("verified_at", staleBefore);

  const { data, error } = await admin
    .from("payment_orders")
    .select("*, membership_plans(code,name,duration_days)")
    .eq("status", "pending")
    .or("chain.eq.TRON,tx_hash.not.is.null")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => mapRow(row as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null }));
}

export async function expireUnpaidOrders(): Promise<number> {
  const admin = getAdminClient();
  if (!admin) return 0;
  const { data, error } = await admin
    .from("payment_orders")
    .update({ status: "expired", verification_error: "Order expired before a transaction hash was submitted" })
    .eq("status", "pending")
    .is("tx_hash", null)
    .lt("expires_at", paymentDiscoveryCutoff().toISOString())
    .select("id");
  if (error) return 0;
  return data?.length ?? 0;
}

export async function getAutoPaymentUserEmail(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email.toLowerCase();
}

export async function patchAutoPaymentOrderMetadata(
  orderId: string,
  patch: Partial<AutoPaymentMetadata>
): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  const current = await getAutoPaymentOrderById(orderId);
  if (!current) return;
  await admin
    .from("payment_orders")
    .update({ metadata: { ...current.metadata, ...patch } })
    .eq("id", orderId);
}

export async function writePaymentAudit(input: {
  orderId: string;
  action: string;
  result: string;
  message?: string | null;
  serverMetadata?: Record<string, unknown>;
  required?: boolean;
  idempotencyKey?: string;
}): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    if (input.required) throw new Error("付款审计服务未配置");
    return;
  }
  const serverMetadata = {
    ...(input.serverMetadata ?? {}),
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  };
  try {
    const lookupExisting = async () => {
      if (!input.idempotencyKey) return false;
      const { data: existing, error: lookupError } = await admin.from("payment_audit_logs")
        .select("id")
        .eq("order_id", input.orderId)
        .eq("action", input.action)
        .contains("server_metadata", { idempotencyKey: input.idempotencyKey })
        .limit(1);
      if (lookupError) throw new Error(`付款审计幂等查询失败：${lookupError.message}`);
      return Boolean(existing?.length);
    };
    await runAuditInsertWithRecovery({
      idempotencyKey: input.idempotencyKey,
      lookupExisting,
      insert: async () => {
        const { error } = await admin.from("payment_audit_logs").insert({
          order_id: input.orderId,
          action: input.action,
          result: input.result,
          message: input.message?.slice(0, 1000) ?? null,
          server_metadata: serverMetadata,
        });
        return { error: error?.message ?? null };
      },
    });
  } catch (error) {
    if (input.required) throw error;
    // Audit storage must never block payment activation.
  }
}

export async function listAllAutoPaymentOrders(limit = 200): Promise<AutoPaymentOrder[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("payment_orders")
    .select("*, membership_plans(code,name,duration_days)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) =>
    mapRow(
      row as Record<string, unknown> & {
        membership_plans?: { code?: string; name?: string; duration_days?: number } | null;
      }
    )
  );
}

export async function countAutoPaymentOrdersByStatus(
  statuses: AutoPaymentOrderStatus[]
): Promise<number> {
  const admin = getAdminClient();
  if (!admin || statuses.length === 0) return 0;
  const { count, error } = await admin
    .from("payment_orders")
    .select("id", { count: "exact", head: true })
    .in("status", statuses);
  if (error) return 0;
  return count ?? 0;
}

export async function requeueAutoPaymentOrder(orderId: string, reason: string): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) return false;
  const order = await getAutoPaymentOrderById(orderId);
  if (!order?.txHash) return false;
  if (order.status === "paid" || order.status === "overpaid" || order.status === "refunded") return false;
  const metadata: AutoPaymentMetadata = {
    ...order.metadata,
    processingStartedAt: null,
    verificationState: "queued",
    recoveryVersion: "payment-reliability-v6",
  };
  const { error } = await admin
    .from("payment_orders")
    .update({ status: "pending", verified_at: null, verification_error: reason.slice(0, 500), metadata })
    .eq("id", order.id);
  if (!error) {
    await writePaymentAudit({
      orderId: order.id,
      action: "requeue",
      result: "pending",
      message: reason,
    });
  }
  return !error;
}

export async function recoverLegacyAmountMismatchOrders(limit = 50): Promise<number> {
  const admin = getAdminClient();
  if (!admin) return 0;
  const { data, error } = await admin
    .from("payment_orders")
    .select("*, membership_plans(code,name,duration_days)")
    .in("status", ["underpaid", "manual_review", "rejected"])
    .not("tx_hash", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return 0;

  let recovered = 0;
  for (const row of data) {
    const order = mapRow(
      row as Record<string, unknown> & {
        membership_plans?: { code?: string; name?: string; duration_days?: number } | null;
      }
    );
    if (order.metadata.recoveryVersion === "payment-reliability-v6") continue;
    if (!/less than order amount|exceeds order amount|exactly match|below minimum accepted amount|amount mismatch/i.test(order.verificationError ?? "")) continue;
    if (await requeueAutoPaymentOrder(order.id, "自动恢复旧版金额尾差误判订单")) recovered += 1;
  }
  return recovered;
}

export async function ensureManualUnderpaymentEvidenceAudit(
  order: AutoPaymentOrder,
  fallback?: { operatorId?: string; reason?: string }
): Promise<void> {
  if (!order.txHash || order.paidAmount == null) throw new Error("少付特批缺少权威链上证据，不能写审计");
  const reason = order.metadata.manualGoodwillReason ?? fallback?.reason ?? order.verificationError ?? "少付人工复核链上证据";
  await writePaymentAudit({
    orderId: order.id,
    action: "manual_underpayment_evidence",
    result: "manual_review",
    message: reason,
    serverMetadata: {
      txHash: order.txHash,
      expectedAmount: order.expectedAmount,
      actualReceivedAmount: order.paidAmount,
      shortfall: Number(Math.max(0, order.expectedAmount - order.paidAmount).toFixed(6)),
      operatorId: order.metadata.manualActivatedBy ?? fallback?.operatorId ?? null,
    },
    idempotencyKey: `manual-underpayment-evidence:${order.id}`,
    required: true,
  });
}

export async function ensureManualFullPaymentAudit(order: AutoPaymentOrder): Promise<void> {
  if (order.metadata.verificationState !== "manual_admin_activated") return;
  if (!order.txHash || order.paidAmount == null || order.paidAmount + 0.000001 < order.expectedAmount) {
    throw new Error("普通人工开通缺少权威全额到账证据");
  }
  await writePaymentAudit({
    orderId: order.id,
    action: "manual_activate",
    result: order.status,
    message: order.metadata.manualGoodwillReason ?? order.verificationError ?? "管理员核对全额到账后开通",
    serverMetadata: {
      operatorId: order.metadata.manualActivatedBy ?? null,
      txHash: order.txHash,
      expectedAmount: order.expectedAmount,
      actualReceivedAmount: order.paidAmount,
      shortfall: 0,
      approvalType: "manual_full_payment",
    },
    idempotencyKey: `manual-full-payment:${order.id}`,
    required: true,
  });
}

export async function recordManualReviewTransferEvidence(input: {
  order: AutoPaymentOrder;
  transfer: VerifiedTransfer;
  operatorId: string;
  reason: string;
}): Promise<AutoPaymentOrder> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动付款服务未配置");
  const txHash = input.transfer.txHash.trim().toLowerCase();
  const { data: duplicate, error: duplicateError } = await admin.from("payment_orders")
    .select("id").eq("tx_hash", txHash).neq("id", input.order.id).maybeSingle();
  if (duplicateError) throw new Error(`交易哈希唯一性检查失败：${duplicateError.message}`);
  if (duplicate) throw new Error("该交易哈希已绑定其他订单");

  const now = new Date().toISOString();
  const shortfall = Number(Math.max(0, input.order.expectedAmount - input.transfer.amountNormalized).toFixed(6));
  const metadata: AutoPaymentMetadata = {
    ...input.order.metadata,
    processingStartedAt: null,
    verificationState: "manual_review_underpaid",
    actualReceivedAmount: input.transfer.amountNormalized,
    paymentShortfall: shortfall,
    chainEvidenceStatus: "confirmed_success",
    manualGoodwillReason: input.reason,
    manualActivatedBy: input.operatorId,
    membershipGranted: false,
    manualGoodwillState: "EVIDENCE_RECORDED",
    manualGoodwillOwner: null,
    manualGoodwillStartedAt: null,
    manualGoodwillCompletedAt: null,
    manualGoodwillAuditComplete: false,
  };
  const transactionEvidence = {
    chain: input.order.chain,
    tx_hash: txHash,
    block_number: input.transfer.blockNumber,
    sender_address: input.transfer.senderAddress,
    recipient_address: input.order.recipientAddress,
    token_contract: input.order.tokenContract,
    amount_raw: input.transfer.amountRaw,
    amount_normalized: input.transfer.amountNormalized,
    block_timestamp: input.transfer.blockTimestamp.toISOString(),
    confirmation_status: "confirmed",
    matched_order_id: input.order.id,
    processed_at: now,
    raw_payload: input.transfer.rawPayload,
  };
  const { error: transactionError } = await admin.from("crypto_transactions").insert(transactionEvidence);
  if (transactionError) {
    if (transactionError.code !== "23505") throw new Error(`链上证据保存失败：${transactionError.message}`);
    const { data: existingEvidence, error: existingEvidenceError } = await admin.from("crypto_transactions")
      .select("matched_order_id,amount_normalized,recipient_address,token_contract")
      .eq("tx_hash", txHash)
      .maybeSingle();
    if (existingEvidenceError) throw new Error(`链上证据幂等核对失败：${existingEvidenceError.message}`);
    if (!matchesExistingManualReviewEvidence({
      existing: existingEvidence ? {
        matchedOrderId: existingEvidence.matched_order_id == null ? null : String(existingEvidence.matched_order_id),
        amountNormalized: Number(existingEvidence.amount_normalized),
        recipientAddress: String(existingEvidence.recipient_address ?? ""),
        tokenContract: String(existingEvidence.token_contract ?? ""),
      } : null,
      orderId: input.order.id,
      amountNormalized: input.transfer.amountNormalized,
      recipientAddress: input.order.recipientAddress,
      tokenContract: input.order.tokenContract,
    })) throw new Error("该交易哈希已存在不一致的链上证据，禁止覆盖");
  }

  let evidenceUpdate = admin.from("payment_orders").update({
    tx_hash: txHash,
    status: "manual_review",
    paid_amount: input.transfer.amountNormalized,
    paid_at: input.transfer.blockTimestamp.toISOString(),
    verified_at: now,
    verification_error: input.reason.slice(0, 500),
    metadata,
  }).eq("id", input.order.id)
    .eq("status", input.order.status);
  if (input.order.status === "manual_review" && input.order.metadata.verificationState) {
    evidenceUpdate = evidenceUpdate.eq("metadata->>verificationState", input.order.metadata.verificationState);
  }
  const { data, error } = await evidenceUpdate
    .select("*, membership_plans(code,name,duration_days)").maybeSingle();
  if (error) throw new Error(`人工复核证据保存失败：${error.message}`);
  if (!data) {
    const current = await getAutoPaymentOrderById(input.order.id);
    if (
      current?.txHash?.toLowerCase() === txHash &&
      (["paid", "overpaid"].includes(current.status) || Boolean(current.metadata.manualGoodwillState))
    ) return current;
    throw new Error("订单状态已变化，人工复核未写入");
  }
  const evidencedOrder = mapRow(data as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null });
  await ensureManualUnderpaymentEvidenceAudit(evidencedOrder, {
    operatorId: input.operatorId,
    reason: input.reason,
  });
  return evidencedOrder;
}

export type ManualGoodwillClaimResult =
  | { kind: "ACQUIRED"; ownerToken: string; order: AutoPaymentOrder; membershipAlreadyGranted: boolean }
  | { kind: "COMPLETED"; order: AutoPaymentOrder }
  | { kind: "BUSY"; order: AutoPaymentOrder };

export async function claimManualGoodwillActivation(order: AutoPaymentOrder): Promise<ManualGoodwillClaimResult> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动付款服务未配置");
  if (order.metadata.membershipGranted && order.metadata.manualGoodwillState === "COMPLETED") {
    return { kind: "COMPLETED", order };
  }
  const eventAlreadyApplied = order.metadata.membershipGranted ||
    await hasMembershipEventForSource("PAYMENT_APPROVED", order.id);
  if (order.metadata.manualGoodwillState === "PROCESSING" && !eventAlreadyApplied) {
    return { kind: "BUSY", order };
  }
  if (
    !["EVIDENCE_RECORDED", "PROCESSING", "AUDIT_PENDING"].includes(order.metadata.manualGoodwillState ?? "")
  ) throw new Error("订单没有可恢复的少付人工特批证据");

  const ownerToken = randomUUID();
  const now = new Date().toISOString();
  const metadata: AutoPaymentMetadata = {
    ...order.metadata,
    verificationState: "manual_goodwill_processing",
    manualGoodwillState: "PROCESSING",
    manualGoodwillOwner: ownerToken,
    manualGoodwillStartedAt: now,
    membershipGranted: eventAlreadyApplied,
  };
  let claimUpdate = admin.from("payment_orders")
    .update({ metadata, verification_error: order.verificationError })
    .eq("id", order.id)
    .eq("status", "manual_review")
    .eq("metadata->>manualGoodwillState", order.metadata.manualGoodwillState);
  if (order.metadata.manualGoodwillOwner) {
    claimUpdate = claimUpdate.eq("metadata->>manualGoodwillOwner", order.metadata.manualGoodwillOwner);
  }
  const { data, error } = await claimUpdate
    .select("*, membership_plans(code,name,duration_days)").maybeSingle();
  if (error) throw new Error(`人工特批原子认领失败：${error.message}`);
  if (data) {
    return {
      kind: "ACQUIRED",
      ownerToken,
      membershipAlreadyGranted: eventAlreadyApplied,
      order: mapRow(data as Record<string, unknown> & { membership_plans?: { code?: string; name?: string; duration_days?: number } | null }),
    };
  }
  const current = await getAutoPaymentOrderById(order.id);
  if (!current) throw new Error("付款订单不存在");
  if (current.metadata.membershipGranted && current.metadata.manualGoodwillState === "COMPLETED") {
    return { kind: "COMPLETED", order: current };
  }
  return { kind: "BUSY", order: current };
}

export async function completeManualGoodwillActivation(input: {
  order: AutoPaymentOrder;
  ownerToken: string;
  membershipExpiresAt: string | null;
  operatorId: string;
  paidAmount: number;
  reason: string;
}): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动付款服务未配置");
  const pendingAuditMetadata: AutoPaymentMetadata = {
    ...input.order.metadata,
    verificationState: "manual_goodwill_membership_granted",
    membershipGranted: true,
    manualGoodwillState: "AUDIT_PENDING",
    manualGoodwillOwner: input.ownerToken,
    manualGoodwillReason: input.reason,
    actualReceivedAmount: input.paidAmount,
    paymentShortfall: Number(Math.max(0, input.order.expectedAmount - input.paidAmount).toFixed(6)),
    manualGoodwillAuditComplete: false,
  };
  const completedMetadata: AutoPaymentMetadata = {
    ...pendingAuditMetadata,
    verificationState: "manual_goodwill_completed",
    manualGoodwillState: "COMPLETED",
    manualGoodwillCompletedAt: new Date().toISOString(),
    manualGoodwillAuditComplete: true,
  };
  await runRequiredGoodwillAuditFinalization({
    persistAuditPending: async () => {
      const { data: pending, error: pendingError } = await admin.from("payment_orders")
        .update({
          status: "manual_review",
          paid_amount: input.paidAmount,
          membership_expires_at: input.membershipExpiresAt,
          verification_error: input.reason.slice(0, 500),
          metadata: pendingAuditMetadata,
        })
        .eq("id", input.order.id)
        .eq("status", "manual_review")
        .eq("metadata->>manualGoodwillOwner", input.ownerToken)
        .eq("metadata->>manualGoodwillState", "PROCESSING")
        .select("id")
        .maybeSingle();
      if (pendingError) throw new Error(`人工特批会员状态保存失败：${pendingError.message}`);
      if (!pending) {
        const current = await getAutoPaymentOrderById(input.order.id);
        if (current?.metadata.membershipGranted && current.metadata.manualGoodwillState === "COMPLETED") return;
        throw new Error("人工特批所有权已变化，禁止写入终态");
      }
    },
    writeRequiredAudit: () => writePaymentAudit({
      orderId: input.order.id,
      action: "manual_goodwill_underpayment",
      result: "manual_approved_underpaid",
      message: input.reason,
      serverMetadata: {
        operatorId: input.operatorId,
        txHash: input.order.txHash,
        expectedAmount: input.order.expectedAmount,
        actualReceivedAmount: input.paidAmount,
        shortfall: Number(Math.max(0, input.order.expectedAmount - input.paidAmount).toFixed(6)),
        membershipGranted: true,
      },
      idempotencyKey: `manual-goodwill-underpayment:${input.order.id}`,
      required: true,
    }),
    persistCompleted: async () => {
      const { data: completed, error: completedError } = await admin.from("payment_orders")
        .update({ metadata: completedMetadata })
        .eq("id", input.order.id)
        .eq("status", "manual_review")
        .eq("metadata->>manualGoodwillOwner", input.ownerToken)
        .eq("metadata->>manualGoodwillState", "AUDIT_PENDING")
        .select("id")
        .maybeSingle();
      if (completedError) throw new Error(`人工特批审计终态保存失败：${completedError.message}`);
      if (!completed) throw new Error("人工特批审计终态未保存，可安全重试");
    },
  });
}

export async function markOrderManuallyActivated(input: {
  order: AutoPaymentOrder;
  membershipExpiresAt: string | null;
  operatorId: string;
  paidAmount: number;
  reason: string;
}): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动支付服务未配置");
  if (!Number.isFinite(input.paidAmount) || input.paidAmount <= 0) throw new Error("缺少权威实际到账金额");
  if (input.paidAmount + 0.000001 < input.order.expectedAmount) {
    throw new Error("普通人工开通只接受全额到账；少付必须走专用特批流程");
  }
  const now = new Date().toISOString();
  const paidAmount = input.paidAmount;
  const finalStatus: AutoPaymentOrderStatus = paidAmount > input.order.expectedAmount + 0.000001 ? "overpaid" : "paid";
  const metadata: AutoPaymentMetadata = {
    ...input.order.metadata,
    processingStartedAt: null,
    verificationState: "manual_admin_activated",
    manualActivatedAt: now,
    manualActivatedBy: input.operatorId,
    manualGoodwillReason: input.reason,
    actualReceivedAmount: paidAmount,
    paymentShortfall: Number(Math.max(0, input.order.expectedAmount - paidAmount).toFixed(6)),
    chainEvidenceStatus: "confirmed_success",
  };
  const { data: updated, error } = await admin
    .from("payment_orders")
    .update({
      status: finalStatus,
      paid_amount: paidAmount,
      paid_at: input.order.paidAt ?? now,
      verified_at: now,
      membership_expires_at: input.membershipExpiresAt,
      verification_error: input.reason.slice(0, 500),
      metadata,
    })
    .eq("id", input.order.id)
    .in("status", ["expired", "underpaid", "manual_review", "pending", "verifying", "rejected"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`手动开通状态保存失败：${error.message}`);
  if (!updated) {
    const current = await getAutoPaymentOrderById(input.order.id);
    if (
      current &&
      ["paid", "overpaid"].includes(current.status) &&
      current.txHash?.toLowerCase() === input.order.txHash?.toLowerCase() &&
      current.paidAmount != null &&
      Math.abs(current.paidAmount - paidAmount) <= 0.000001
    ) {
      await ensureManualFullPaymentAudit(current);
      return;
    }
    throw new Error("订单状态已变化，人工开通未写入");
  }
  await ensureManualFullPaymentAudit({
    ...input.order,
    status: finalStatus,
    paidAmount,
    paidAt: input.order.paidAt ?? now,
    verifiedAt: now,
    membershipExpiresAt: input.membershipExpiresAt,
    verificationError: input.reason,
    metadata,
  });
}

export async function getAutoPaymentUserEmailMap(userIds: string[]): Promise<Map<string, string>> {
  const admin = getAdminClient();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, string>();
  if (!admin || unique.length === 0) return result;
  const { data, error } = await admin.from("profiles").select("id,email").in("id", unique);
  if (!error && data) {
    for (const row of data) {
      if (row.id && row.email) result.set(String(row.id), String(row.email).toLowerCase());
    }
  }
  return result;
}
