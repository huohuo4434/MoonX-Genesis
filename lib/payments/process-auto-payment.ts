import "server-only";

import { getPaymentConfig } from "@/lib/payments/config";
import {
  claimOrderForVerification,
  getAutoPaymentOrderById,
  listOrdersReadyForVerification,
  markOrderException,
  markOrderPaid,
  releaseOrderForRetry,
  type AutoPaymentOrder,
} from "@/lib/payments/auto-payment-orders";
import { finalizeAutoPaymentMembership } from "@/lib/payments/finalize-auto-payment";
import {
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
}

function verificationWindow(order: AutoPaymentOrder): { notBefore: Date; notAfter: Date } {
  const created = new Date(order.createdAt);
  const expires = new Date(order.expiresAt);
  return {
    notBefore: new Date(created.getTime() - 2 * 60_000),
    notAfter: new Date(expires.getTime() + 60 * 60_000),
  };
}

async function verifyTransfer(order: AutoPaymentOrder): Promise<VerifiedTransfer> {
  if (!order.txHash || !validateTxHash(order.chain, order.txHash)) {
    throw new Error("Invalid transaction hash format");
  }
  const cfg = getPaymentConfig();
  const window = verificationWindow(order);
  if (order.chain === "TRON") {
    return verifyTronTransfer(
      order.txHash,
      {
        recipientAddress: order.recipientAddress,
        tokenContract: order.tokenContract,
        expectedAmount: order.expectedAmount,
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
    rpcUrl: cfg.bscRpcUrl,
    minConfirmations: cfg.bscConfirmations,
    tokenDecimals: cfg.bscTokenDecimals,
    ...window,
  });
}

export async function processAutoPaymentOrder(orderId: string): Promise<AutoPaymentProcessResult> {
  const current = await getAutoPaymentOrderById(orderId);
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
    return { orderId, status: current.status, activated: false, message: current.verificationError ?? "订单无需自动核验" };
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
    const finalStatus = transfer.amountNormalized > claimed.expectedAmount + 0.000001 ? "overpaid" : "paid";
    return {
      orderId,
      status: finalStatus,
      activated: true,
      message: "链上付款已确认，会员已自动开通",
      membershipExpiresAt: grant.membershipExpiresAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isTemporaryVerificationError(message)) {
      await releaseOrderForRetry(claimed, message);
      return { orderId, status: "pending", activated: false, message: "链上确认中，系统会自动重试" };
    }
    if (isUnderpaymentError(message)) {
      const match = message.match(/\((\d+(?:\.\d+)?)\//);
      await markOrderException(claimed, "underpaid", message, match ? Number(match[1]) : undefined);
      return { orderId, status: "underpaid", activated: false, message: "到账金额不足，会员未开通" };
    }
    if (/recipient|contract|timestamp|disabled|exceeds order amount|exactly match/i.test(message)) {
      await markOrderException(claimed, "manual_review", message);
      return { orderId, status: "manual_review", activated: false, message: "付款信息异常，已转入异常复核" };
    }
    await markOrderException(claimed, "rejected", message);
    return { orderId, status: "rejected", activated: false, message: "链上核验未通过" };
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
