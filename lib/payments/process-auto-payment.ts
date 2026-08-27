import "server-only";

import { notifyAdminAutoPayment } from "@/lib/payments/admin-payment-notifications";
import {
  attachTransactionHash,
  claimOrderForVerification,
  getAutoPaymentOrderById,
  listOrdersReadyForVerification,
  markOrderException,
  markOrderPaid,
  releaseOrderForRetry,
  type AutoPaymentOrder,
} from "@/lib/payments/auto-payment-orders";
import { getPaymentConfig } from "@/lib/payments/config";
import { finalizeAutoPaymentMembership } from "@/lib/payments/finalize-auto-payment";
import { minimumAcceptedPaymentAmount } from "@/lib/payments/payment-amount-policy";
import {
  discoverTronTransferCandidate,
  isTemporaryVerificationError,
  isUnderpaymentError,
  validateTxHash,
  verifyBscTransfer,
  verifyTronTransfer,
} from "@/lib/payments/verify-chain";
import type { VerifiedTransfer } from "@/types/membership";

export interface AutoPaymentProcessResult {
  orderId: string;
  status: AutoPaymentOrder["status"] | "busy";
  activated: boolean;
  message: string;
  membershipExpiresAt?: string | null;
  consultationQuota?: { delivered: boolean; error: string | null };
}

function verificationWindow(order: AutoPaymentOrder): { notBefore: Date; notAfter: Date } {
  const created = new Date(order.createdAt);
  const expires = new Date(order.expiresAt);
  return {
    notBefore: new Date(created.getTime() - 5 * 60_000),
    // Users may pay from an exchange and submit the hash after the 45-minute UI timer.
    // A submitted, unique hash still has to match token, recipient and discounted plan price.
    notAfter: new Date(expires.getTime() + 24 * 60 * 60_000),
  };
}

function minimumAmount(order: AutoPaymentOrder): number {
  return minimumAcceptedPaymentAmount({
    plan: order.plan,
    discountPercent: order.discountPercent,
  });
}

async function verifyTransfer(order: AutoPaymentOrder): Promise<VerifiedTransfer> {
  if (!order.txHash || !validateTxHash(order.chain, order.txHash)) {
    throw new Error("Invalid transaction hash format");
  }
  const cfg = getPaymentConfig();
  const window = verificationWindow(order);
  const acceptedMinimum = minimumAmount(order);
  if (order.chain === "TRON") {
    return verifyTronTransfer(
      order.txHash,
      {
        recipientAddress: order.recipientAddress,
        tokenContract: order.tokenContract,
        expectedAmount: order.expectedAmount,
        minimumAmount: acceptedMinimum,
        ...window,
      },
      cfg.tronGridApiKey
    );
  }
  if (!cfg.bep20Enabled) throw new Error("BEP20 automatic verification is disabled");
  return verifyBscTransfer(order.txHash, {
    recipientAddress: order.recipientAddress,
    tokenContract: order.tokenContract,
    expectedAmount: order.expectedAmount,
    minimumAmount: acceptedMinimum,
    rpcUrl: cfg.bscRpcUrl,
    minConfirmations: cfg.bscConfirmations,
    tokenDecimals: cfg.bscTokenDecimals,
    ...window,
  });
}

async function safeAdminNotice(
  order: AutoPaymentOrder,
  kind: Parameters<typeof notifyAdminAutoPayment>[0]["kind"],
  options: { message?: string | null; paidAmount?: number | null; membershipExpiresAt?: string | null } = {}
): Promise<void> {
  await notifyAdminAutoPayment({ order, kind, ...options }).catch((error) => {
    console.warn("[auto-payment] admin email failed", error instanceof Error ? error.message : error);
  });
}

export async function processAutoPaymentOrder(orderId: string): Promise<AutoPaymentProcessResult> {
  let current = await getAutoPaymentOrderById(orderId);
  if (!current) return { orderId, status: "rejected", activated: false, message: "订单不存在" };
  if (current.status === "paid" || current.status === "overpaid") {
    return {
      orderId,
      status: current.status,
      activated: true,
      message: "会员已自动开通",
      membershipExpiresAt: current.membershipExpiresAt,
    };
  }
  if (!["pending", "verifying"].includes(current.status)) {
    return {
      orderId,
      status: current.status,
      activated: false,
      message: current.verificationError ?? "订单无需自动核验",
    };
  }

  // TRC20 customers no longer need to paste a transaction hash. The unique
  // five-decimal order amount is used only to discover the matching confirmed
  // incoming transfer; the normal full verification still runs before activation.
  if (!current.txHash && current.chain === "TRON") {
    try {
      const cfg = getPaymentConfig();
      const window = verificationWindow(current);
      const discovered = await discoverTronTransferCandidate({
        recipientAddress: current.recipientAddress,
        tokenContract: current.tokenContract,
        expectedAmount: current.expectedAmount,
        minimumAmount: minimumAmount(current),
        uniqueSuffix: current.metadata.uniqueSuffix,
        ...window,
      }, cfg.tronGridApiKey);
      if (!discovered) {
        return { orderId, status: "pending", activated: false, message: "等待链上自动识别到账，系统会每5分钟继续扫描" };
      }
      current = await attachTransactionHash({ orderId: current.id, userId: current.userId, txHash: discovered.txHash });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/Multiple matching TRON transfers|already used|已被其他订单使用/i.test(message)) {
        await markOrderException(current, "manual_review", message);
        return { orderId, status: "manual_review", activated: false, message: "发现重复或多笔匹配付款，已转入异常复核" };
      }
      if (isTemporaryVerificationError(message)) {
        return { orderId, status: "pending", activated: false, message: "链上自动查账暂时不可用，系统会继续重试" };
      }
      return { orderId, status: "pending", activated: false, message: `自动查账等待重试：${message}` };
    }
  }

  if (!current.txHash) {
    return { orderId, status: "pending", activated: false, message: "等待交易哈希或自动到账识别" };
  }

  const claimed = await claimOrderForVerification(orderId);
  if (!claimed) return { orderId, status: "busy", activated: false, message: "订单正在核验" };

  try {
    const transfer = await verifyTransfer(claimed);
    const grant = await finalizeAutoPaymentMembership({ order: claimed, verifiedAt: new Date() });
    await markOrderPaid({
      order: claimed,
      paidAmount: transfer.amountNormalized,
      paidAt: transfer.blockTimestamp.toISOString(),
      membershipExpiresAt: grant.membershipExpiresAt,
      rawPayload: transfer.rawPayload,
      blockNumber: transfer.blockNumber,
      senderAddress: transfer.senderAddress,
      amountRaw: transfer.amountRaw,
    });
    const { deliverPaidOrderConsultationQuota } = await import("@/lib/consultations/quota-delivery");
    const consultationQuota = await deliverPaidOrderConsultationQuota(claimed.id);
    const finalStatus = transfer.amountNormalized > claimed.expectedAmount + 0.000001 ? "overpaid" : "paid";
    await safeAdminNotice(claimed, "activated", {
      message: `链上核验成功；grantApplied=${grant.grantApplied}; grantSkipped=${grant.grantSkipped ?? "none"}`,
      paidAmount: transfer.amountNormalized,
      membershipExpiresAt: grant.membershipExpiresAt,
    });
    return {
      orderId,
      status: finalStatus,
      activated: true,
      message: "链上付款已确认，会员已自动开通",
      membershipExpiresAt: grant.membershipExpiresAt,
      consultationQuota,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = claimed.metadata.attemptCount ?? 1;
    if (isTemporaryVerificationError(message)) {
      if (attempts < 8) {
        await releaseOrderForRetry(claimed, message);
        if (attempts === 1 || attempts === 4) {
          await safeAdminNotice(claimed, "pending", { message });
        }
        return { orderId, status: "pending", activated: false, message: "链上确认中，系统会自动重试" };
      }
      await markOrderException(claimed, "manual_review", `多次自动重试仍未完成：${message}`);
      await safeAdminNotice(claimed, "manual_review", { message });
      return { orderId, status: "manual_review", activated: false, message: "自动核验多次未完成，已转入人工复核" };
    }
    if (isUnderpaymentError(message)) {
      const match = message.match(/\((\d+(?:\.\d+)?)\//);
      const paidAmount = match ? Number(match[1]) : undefined;
      await markOrderException(claimed, "underpaid", message, paidAmount);
      await safeAdminNotice(claimed, "underpaid", { message, paidAmount });
      return { orderId, status: "underpaid", activated: false, message: "到账金额低于套餐实付价，会员未开通" };
    }
    if (/recipient|contract|timestamp|disabled|invalid transaction hash/i.test(message)) {
      await markOrderException(claimed, "manual_review", message);
      await safeAdminNotice(claimed, "manual_review", { message });
      return { orderId, status: "manual_review", activated: false, message: "付款信息需要人工复核" };
    }

    // Unknown verifier/provider failures must not permanently reject money that may
    // already have arrived. Preserve the hash and route the order to manual review.
    await markOrderException(claimed, "manual_review", message);
    await safeAdminNotice(claimed, "manual_review", { message });
    return { orderId, status: "manual_review", activated: false, message: "自动核验未完成，已转入人工复核" };
  }
}

export async function reconcileAutoPayments(limit = 20): Promise<{
  checked: number;
  activated: number;
  pending: number;
  exceptions: number;
  results: AutoPaymentProcessResult[];
}> {
  const orders = await listOrdersReadyForVerification(limit);
  const results: AutoPaymentProcessResult[] = [];
  for (const order of orders) {
    results.push(await processAutoPaymentOrder(order.id));
  }
  return {
    checked: results.length,
    activated: results.filter((item) => item.activated).length,
    pending: results.filter((item) => item.status === "pending" || item.status === "busy").length,
    exceptions: results.filter((item) => ["underpaid", "manual_review", "rejected"].includes(item.status)).length,
    results,
  };
}
