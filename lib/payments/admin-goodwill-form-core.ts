export type AdminGoodwillFormInput = {
  orderId: string;
  txHash: string;
  claimedActualAmount: string;
  reason: string;
  confirmed: boolean;
};

export type AdminGoodwillRequestPayload = {
  orderId: string;
  action: "activate_goodwill_underpayment";
  txHash: string;
  claimedActualAmount?: number;
  reason: string;
  confirm: true;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRON_TX_HASH = /^[0-9a-f]{64}$/i;

export function buildAdminGoodwillRequest(input: AdminGoodwillFormInput):
  | { ok: true; payload: AdminGoodwillRequestPayload }
  | { ok: false; error: string } {
  const orderId = input.orderId.trim();
  const txHash = input.txHash.trim();
  const reason = input.reason.trim();
  const amountText = input.claimedActualAmount.trim();
  if (!UUID.test(orderId)) return { ok: false, error: "请输入有效的订单 UUID。" };
  if (!TRON_TX_HASH.test(txHash)) return { ok: false, error: "请输入64位 TRON 交易哈希。" };
  if (reason.length < 10) return { ok: false, error: "特批原因至少需要10个字符，必须可审计。" };
  if (!input.confirmed) return { ok: false, error: "请勾选确认：这是一次少付客服特批。" };
  let claimedActualAmount: number | undefined;
  if (amountText) {
    claimedActualAmount = Number(amountText);
    if (!Number.isFinite(claimedActualAmount) || claimedActualAmount <= 0) {
      return { ok: false, error: "辅助到账金额必须是大于0的数字。" };
    }
  }
  return {
    ok: true,
    payload: {
      orderId,
      action: "activate_goodwill_underpayment",
      txHash: txHash.toLowerCase(),
      ...(claimedActualAmount == null ? {} : { claimedActualAmount }),
      reason,
      confirm: true,
    },
  };
}
