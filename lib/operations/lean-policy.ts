/** Reviewed lean release policy. Existing environment variables cannot re-enable automation. */
export const MANUAL_PAYMENT_MODE = true;
export const CONSULTATIONS_PAUSED = true;
export const PAYMENT_TELEGRAM = {
  handle: "@jackuwin",
  url: "https://t.me/jackuwin",
} as const;

export function manualPaymentNotice() {
  return {
    error: "MANUAL_PAYMENT_REQUIRED",
    message: `支付已改为人工核验。付款后请联系 Telegram ${PAYMENT_TELEGRAM.handle}，提供注册邮箱、套餐、网络和交易哈希；核实到账后由管理员开通。旧订单请同时提供订单号，勿重复付款。`,
    contactUrl: PAYMENT_TELEGRAM.url,
    autoVerify: false,
  };
}
