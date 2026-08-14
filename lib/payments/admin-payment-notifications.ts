import "server-only";

import { chineseResendError, paymentNotifyTo, sendRawEmail, type EmailNotificationStatus } from "@/lib/email/notifications";
import { siteConfig } from "@/lib/site-config";
import {
  getAutoPaymentUserEmail,
  isAutoPaymentMembershipActivated,
  isCompletedManualGoodwill,
  listAllAutoPaymentOrders,
  patchAutoPaymentOrderMetadata,
  writePaymentAudit,
  type AutoPaymentOrder,
} from "@/lib/payments/auto-payment-orders";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export type AdminPaymentNotificationKind =
  | "hash_submitted"
  | "activated"
  | "pending"
  | "underpaid"
  | "manual_review"
  | "rejected"
  | "manual_activated";

const KIND_LABEL: Record<AdminPaymentNotificationKind, string> = {
  hash_submitted: "用户已提交交易哈希",
  activated: "自动开通成功",
  pending: "链上确认中",
  underpaid: "到账金额不足",
  manual_review: "需要人工复核",
  rejected: "自动核验未通过",
  manual_activated: "管理员已手动开通",
};

function amount(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value} USDT`;
}

export async function notifyAdminAutoPayment(input: {
  order: AutoPaymentOrder;
  kind: AdminPaymentNotificationKind;
  message?: string | null;
  paidAmount?: number | null;
  membershipExpiresAt?: string | null;
}): Promise<{ status: EmailNotificationStatus; error?: string }> {
  const email = input.order.metadata.buyerEmail ?? await getAutoPaymentUserEmail(input.order.userId) ?? "未读取到邮箱";
  const statusLabel = KIND_LABEL[input.kind];
  const submittedAt = input.order.metadata.txSubmittedAt ?? input.order.createdAt;
  const lines = [
    `MOOX付款通知：${statusLabel}`,
    "",
    `买家邮箱：${email}`,
    `用户ID：${input.order.userId}`,
    `订单号：${input.order.orderNumber}`,
    `订单ID：${input.order.id}`,
    `套餐：${input.order.planName}（${input.order.plan}）`,
    `会员天数：${input.order.durationDays}天`,
    `标价：${amount(input.order.listPrice)}`,
    `折扣：${input.order.discountPercent}%`,
    `创始会员序号：${input.order.founderRank ?? "—"}`,
    `订单应付精确金额：${amount(input.order.expectedAmount)}`,
    `链上实际到账：${amount(input.paidAmount ?? input.order.paidAmount)}`,
    `网络：${input.order.network} / ${input.order.chain}`,
    `收款地址：${input.order.recipientAddress}`,
    `交易哈希：${input.order.txHash ?? "尚未提交"}`,
    `订单创建：${formatDateTimeChina(input.order.createdAt)}`,
    `哈希提交：${formatDateTimeChina(submittedAt)}`,
    `当前状态：${input.kind}`,
    `会员到期：${input.membershipExpiresAt ? formatDateTimeChina(input.membershipExpiresAt) : "—"}`,
    `系统说明：${input.message?.trim() || "—"}`,
    "",
    `后台付款页：${siteConfig.url}/admin/payments`,
    "若自动开通失败，请在后台核对区块浏览器后点击“重试核验”或“确认到账并手动开通”。",
  ];
  const result = await sendRawEmail({
    to: paymentNotifyTo(),
    subject: `MOOX付款｜${statusLabel}｜${email}`,
    text: lines.join("\n"),
  });
  const error = result.error ? chineseResendError(result.error) : undefined;
  await patchAutoPaymentOrderMetadata(input.order.id, {
    buyerEmail: email,
    adminNotificationStatus: result.status,
    adminNotificationError: error ?? null,
    adminNotifiedAt: new Date().toISOString(),
    lastAdminNotificationKind: input.kind,
  }).catch(() => undefined);
  await writePaymentAudit({
    orderId: input.order.id,
    action: `admin_email_${input.kind}`,
    result: result.status,
    message: error ?? null,
  });
  return { status: result.status, error };
}


function desiredNotificationKind(order: AutoPaymentOrder): AdminPaymentNotificationKind {
  if (isCompletedManualGoodwill(order)) return "manual_activated";
  if (isAutoPaymentMembershipActivated(order)) return order.metadata.membershipGranted ? "manual_review" : "activated";
  if (order.status === "underpaid") return "underpaid";
  if (order.status === "manual_review" || order.status === "rejected" || order.status === "expired") return "manual_review";
  return "hash_submitted";
}

/**
 * Cron self-healing for notification outages and process crashes.
 * A hash-submission email is not considered enough after the order later becomes
 * paid or enters manual review; the final state is delivered separately.
 */
export async function retryFailedAdminPaymentNotifications(limit = 10): Promise<number> {
  const orders = await listAllAutoPaymentOrders(150);
  const now = Date.now();
  let sent = 0;
  for (const order of orders) {
    if (sent >= Math.max(1, Math.min(30, limit))) break;
    if (!order.txHash) continue;
    const desired = desiredNotificationKind(order);
    const alreadyDelivered =
      order.metadata.adminNotificationStatus === "sent" &&
      order.metadata.lastAdminNotificationKind === desired;
    if (alreadyDelivered) continue;

    const lastAttempt = order.metadata.adminNotifiedAt
      ? new Date(order.metadata.adminNotifiedAt).getTime()
      : 0;
    if (Number.isFinite(lastAttempt) && lastAttempt > 0 && now - lastAttempt < 5 * 60_000) continue;

    const result = await notifyAdminAutoPayment({
      order,
      kind: desired,
      message: order.verificationError ?? "定时任务补发付款状态通知。",
      paidAmount: order.paidAmount,
      membershipExpiresAt: order.membershipExpiresAt,
    }).catch(() => null);
    if (result?.status === "sent") sent += 1;
  }
  return sent;
}
