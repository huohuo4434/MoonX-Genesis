import { classifyTransferForOrderDiscovery } from "@/lib/payments/payment-amount-policy";

export type GoodwillOrderSnapshot = {
  status: string;
  expectedAmount: number;
  minimumAmount: number;
  uniqueSuffix: number;
  membershipExpiresAt: string | null;
  paidAmount: number | null;
};

export type GoodwillTransferSnapshot = { amountNormalized: number };
export type GoodwillActivationClaim<TOrder> =
  | { kind: "ACQUIRED"; ownerToken: string; order: TOrder; membershipAlreadyGranted: boolean }
  | { kind: "COMPLETED"; order: TOrder }
  | { kind: "BUSY"; order: TOrder };

export function matchesExistingManualReviewEvidence(input: {
  existing: {
    matchedOrderId: string | null;
    amountNormalized: number;
    recipientAddress: string;
    tokenContract: string;
  } | null;
  orderId: string;
  amountNormalized: number;
  recipientAddress: string;
  tokenContract: string;
}): boolean {
  const existing = input.existing;
  return Boolean(
    existing &&
    existing.matchedOrderId === input.orderId &&
    Number.isFinite(existing.amountNormalized) &&
    Math.abs(existing.amountNormalized - input.amountNormalized) <= 0.000001 &&
    existing.recipientAddress === input.recipientAddress &&
    existing.tokenContract === input.tokenContract
  );
}

export function manualGoodwillVerificationWindow(order: { createdAt: string; expiresAt: string }): {
  notBefore: Date;
  notAfter: Date;
} {
  const created = new Date(order.createdAt);
  const expires = new Date(order.expiresAt);
  if (Number.isNaN(created.getTime()) || Number.isNaN(expires.getTime()) || expires <= created) {
    throw new Error("订单支付时间窗无效");
  }
  return { notBefore: new Date(created.getTime() - 5 * 60_000), notAfter: expires };
}

export function isPaymentMembershipActivatedSnapshot(input: {
  status: string;
  membershipGranted?: boolean | null;
}): boolean {
  return input.status === "paid" || input.status === "overpaid" || input.membershipGranted === true;
}

export async function runAuditInsertWithRecovery(input: {
  idempotencyKey?: string;
  lookupExisting: () => Promise<boolean>;
  insert: () => Promise<{ error: string | null }>;
}): Promise<void> {
  if (input.idempotencyKey && await input.lookupExisting()) return;
  const inserted = await input.insert();
  if (!inserted.error) return;
  if (input.idempotencyKey && await input.lookupExisting()) return;
  throw new Error(`付款审计保存失败：${inserted.error}`);
}

export async function runRequiredGoodwillAuditFinalization(input: {
  persistAuditPending: () => Promise<void>;
  writeRequiredAudit: () => Promise<void>;
  persistCompleted: () => Promise<void>;
}): Promise<void> {
  await input.persistAuditPending();
  await input.writeRequiredAudit();
  await input.persistCompleted();
}

export async function runManualGoodwillActivationCore<TOrder extends GoodwillOrderSnapshot, TTransfer extends GoodwillTransferSnapshot>(input: {
  order: TOrder;
  claimedActualAmount?: number;
  verifyAuthoritativeTransfer: () => Promise<TTransfer>;
  recordEvidence: (transfer: TTransfer) => Promise<TOrder>;
  ensureEvidenceAudit: (order: TOrder) => Promise<void>;
  claimActivation: (order: TOrder) => Promise<GoodwillActivationClaim<TOrder>>;
  grantMembership: (order: TOrder) => Promise<{ membershipExpiresAt: string | null; grantApplied: boolean; grantSkipped: string | null }>;
  finalizeActivation: (input: { order: TOrder; transfer: TTransfer; membershipExpiresAt: string | null; ownerToken: string }) => Promise<void>;
}): Promise<{
  alreadyActivated: boolean;
  membershipExpiresAt: string | null;
  grantApplied: boolean;
  grantSkipped: string | null;
  actualReceivedAmount: number;
}> {
  if (input.order.status === "paid" || input.order.status === "overpaid") {
    return {
      alreadyActivated: true,
      membershipExpiresAt: input.order.membershipExpiresAt,
      grantApplied: false,
      grantSkipped: "order_already_activated",
      actualReceivedAmount: input.order.paidAmount ?? 0,
    };
  }
  const transfer = await input.verifyAuthoritativeTransfer();
  if (
    input.claimedActualAmount != null &&
    (!Number.isFinite(input.claimedActualAmount) || Math.abs(input.claimedActualAmount - transfer.amountNormalized) > 0.000001)
  ) throw new Error("提交的到账金额与链上权威金额不一致");
  const classification = classifyTransferForOrderDiscovery({
    expectedAmount: input.order.expectedAmount,
    minimumAmount: input.order.minimumAmount,
    actualAmount: transfer.amountNormalized,
    uniqueSuffix: input.order.uniqueSuffix,
  });
  if (classification !== "UNDERPAID_MANUAL_REVIEW") {
    throw new Error("该交易不是可识别的有限额手续费少付订单，禁止人工特批");
  }
  const evidencedOrder = await input.recordEvidence(transfer);
  await input.ensureEvidenceAudit(evidencedOrder);
  const claim = await input.claimActivation(evidencedOrder);
  if (claim.kind === "COMPLETED") {
    return {
      alreadyActivated: true,
      membershipExpiresAt: claim.order.membershipExpiresAt,
      grantApplied: false,
      grantSkipped: "order_already_activated",
      actualReceivedAmount: claim.order.paidAmount ?? transfer.amountNormalized,
    };
  }
  if (claim.kind === "BUSY") throw new Error("该少付特批正在由另一管理员处理，请稍后权威重读");
  const grant = await input.grantMembership(claim.order);
  await input.finalizeActivation({
    order: claim.order,
    transfer,
    membershipExpiresAt: grant.membershipExpiresAt,
    ownerToken: claim.ownerToken,
  });
  return {
    alreadyActivated: false,
    membershipExpiresAt: grant.membershipExpiresAt,
    grantApplied: grant.grantApplied,
    grantSkipped: grant.grantSkipped,
    actualReceivedAmount: transfer.amountNormalized,
  };
}
