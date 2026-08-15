import "server-only";

import {
  claimManualGoodwillActivation,
  completeManualGoodwillActivation,
  ensureManualUnderpaymentEvidenceAudit,
  getAutoPaymentOrderById,
  recordManualReviewTransferEvidence,
} from "@/lib/payments/auto-payment-orders";
import { finalizeAutoPaymentMembership } from "@/lib/payments/finalize-auto-payment";
import {
  minimumAcceptedPaymentAmount,
} from "@/lib/payments/payment-amount-policy";
import { getPaymentConfig } from "@/lib/payments/config";
import { manualGoodwillVerificationWindow, runManualGoodwillActivationCore } from "@/lib/payments/manual-goodwill-core";
import { validateTxHash, verifyTronTransfer } from "@/lib/payments/verify-chain";
import { deliverPaidOrderConsultationQuota } from "@/lib/consultations/quota-delivery";

export type ManualGoodwillActivationResult = {
  alreadyActivated: boolean;
  membershipExpiresAt: string | null;
  grantApplied: boolean;
  grantSkipped: string | null;
  actualReceivedAmount: number;
  consultationQuota?: { delivered: boolean; error: string | null };
};

export async function activateGoodwillUnderpayment(input: {
  orderId: string;
  txHash: string;
  claimedActualAmount?: number;
  reason: string;
  operatorId: string;
}): Promise<ManualGoodwillActivationResult> {
  const order = await getAutoPaymentOrderById(input.orderId);
  if (!order) throw new Error("付款订单不存在");
  if (order.status === "paid" || order.status === "overpaid") {
    const consultationQuota = await deliverPaidOrderConsultationQuota(order.id);
    return {
      alreadyActivated: true,
      membershipExpiresAt: order.membershipExpiresAt,
      grantApplied: false,
      grantSkipped: "order_already_activated",
      actualReceivedAmount: order.paidAmount ?? 0,
      consultationQuota,
    };
  }
  if (order.chain !== "TRON" || !validateTxHash("TRON", input.txHash)) {
    throw new Error("人工特批仅接受有效的TRON交易哈希");
  }
  const reason = input.reason.trim();
  if (reason.length < 10) throw new Error("必须填写可审计的人工特批原因");

  const minimumAmount = minimumAcceptedPaymentAmount({
    plan: order.plan,
    discountPercent: order.discountPercent,
  });
  const authoritativeOrder = {
    ...order,
    minimumAmount,
    uniqueSuffix: order.metadata.uniqueSuffix,
  };
  const result = await runManualGoodwillActivationCore({
    order: authoritativeOrder,
    claimedActualAmount: input.claimedActualAmount,
    verifyAuthoritativeTransfer: () => verifyTronTransfer(input.txHash, {
      recipientAddress: order.recipientAddress,
      tokenContract: order.tokenContract,
      expectedAmount: order.expectedAmount,
      minimumAmount: 0.000001,
      ...manualGoodwillVerificationWindow(order),
    }, getPaymentConfig().tronGridApiKey),
    recordEvidence: async (transfer) => ({
      ...(["EVIDENCE_RECORDED", "PROCESSING", "AUDIT_PENDING", "COMPLETED"].includes(order.metadata.manualGoodwillState ?? "")
        ? order
        : await recordManualReviewTransferEvidence({
          order,
          transfer,
          operatorId: input.operatorId,
          reason,
        })),
      minimumAmount,
      uniqueSuffix: order.metadata.uniqueSuffix,
    }),
    ensureEvidenceAudit: (evidencedOrder) => ensureManualUnderpaymentEvidenceAudit(evidencedOrder, {
      operatorId: input.operatorId,
      reason,
    }),
    claimActivation: async (evidencedOrder) => {
      const claim = await claimManualGoodwillActivation(evidencedOrder);
      return {
        ...claim,
        order: {
          ...claim.order,
          minimumAmount,
          uniqueSuffix: claim.order.metadata.uniqueSuffix,
        },
      };
    },
    grantMembership: (evidencedOrder) => finalizeAutoPaymentMembership({ order: evidencedOrder, verifiedAt: new Date() }),
    finalizeActivation: ({ order: evidencedOrder, transfer, membershipExpiresAt, ownerToken }) => completeManualGoodwillActivation({
      order: evidencedOrder,
      ownerToken,
      membershipExpiresAt,
      operatorId: input.operatorId,
      paidAmount: transfer.amountNormalized,
      reason,
    }),
  });
  const consultationQuota = await deliverPaidOrderConsultationQuota(order.id);
  return { ...result, consultationQuota };
}
