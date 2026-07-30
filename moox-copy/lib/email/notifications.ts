import "server-only";

import { Resend } from "resend";

export type EmailNotificationStatus = "sent" | "email_failed" | "email_not_configured";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function isPaymentEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function paymentNotifyTo(): string {
  return (
    process.env.PAYMENT_NOTIFICATION_EMAIL?.trim() ||
    process.env.MOONX_ADMIN_EMAIL?.trim() ||
    "jackzwin999@gmail.com"
  );
}

export function paymentEmailFrom(): string {
  return (
    process.env.PAYMENT_EMAIL_FROM?.trim() ||
    process.env.MOONX_SUPPORT_EMAIL?.trim() ||
    "MoonX <onboarding@resend.dev>"
  );
}

export async function sendRawEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ status: EmailNotificationStatus; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { status: "email_not_configured", error: "邮件服务未配置：缺少 RESEND_API_KEY" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: paymentEmailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    if (error) {
      const detail = [error.name, error.message].filter(Boolean).join(": ");
      return { status: "email_failed", error: detail || error.message || "Resend 返回未知错误" };
    }
    if (!data?.id) {
      return { status: "email_failed", error: "Resend 未返回邮件 ID" };
    }
    return { status: "sent" };
  } catch (err) {
    return {
      status: "email_failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Map Resend / SMTP errors to Chinese for admin UI. Never returns bare “未配置” when key exists. */
export function chineseResendError(raw?: string): string {
  if (!raw?.trim()) return "邮件发送失败：Resend 未返回具体原因";
  const m = raw.toLowerCase();
  if (m.includes("缺少 resend_api_key") || m.includes("邮件服务未配置：缺少")) {
    return "邮件服务未配置：缺少 RESEND_API_KEY";
  }
  if (m.includes("invalid api key") || m.includes("unauthorized") || m.includes("401")) {
    return `API密钥无效：${raw}`;
  }
  if (
    m.includes("not verified") ||
    m.includes("domain is not verified") ||
    m.includes("from address") ||
    m.includes("validation_error") ||
    (m.includes("from") && m.includes("domain"))
  ) {
    return `发件地址未验证：${raw}`;
  }
  if (m.includes("restricted") || m.includes("only send testing emails") || m.includes("own email")) {
    return `收件人被拒绝（测试域名仅可发给账号邮箱）：${raw}`;
  }
  if (m.includes("bounce") || m.includes("blocked") || m.includes("invalid.*recipient") || m.includes("recipient")) {
    return `收件人被拒绝：${raw}`;
  }
  if (m.includes("rate") || m.includes("too many")) {
    return `发送频率受限：${raw}`;
  }
  if (m.includes("quota") || m.includes("billing") || m.includes("payment")) {
    return `账户额度或计费问题：${raw}`;
  }
  // Keep Resend's own message so admin can diagnose; strip obvious secrets.
  const cleaned = raw.replace(/re_[A-Za-z0-9_]+/g, "re_***");
  return `邮件发送失败：${cleaned}`;
}

export async function notifyAdminNewPayment(input: {
  email: string;
  planLabel: string;
  amount: number;
  network: string;
  txHash: string;
  submittedAt: string;
  paymentId: string;
  reviewUrl?: string;
}): Promise<EmailNotificationStatus> {
  const reviewLink = input.reviewUrl ?? "https://mooxintel.com/admin/payments";
  const result = await sendRawEmail({
    to: paymentNotifyTo(),
    subject: "MoonX收到新的会员付款申请",
    text: [
      "MoonX收到新的会员付款申请",
      "",
      `买家邮箱：${input.email}`,
      `订单号：${input.paymentId}`,
      `套餐：${input.planLabel}`,
      `金额：${input.amount} USDT`,
      `支付网络：${input.network}`,
      `交易哈希：${input.txHash}`,
      `提交时间：${input.submittedAt}`,
      "",
      `审核地址：${reviewLink}`,
    ].join("\n"),
  });
  return result.status;
}

export async function notifyBuyerMembershipActivated(input: {
  to: string;
  planLabel: string;
  startedAt: string;
  expiresAt: string;
}): Promise<EmailNotificationStatus> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mooxintel.com";
  const result = await sendRawEmail({
    to: input.to,
    subject: "MoonX会员已开通",
    text: [
      "MoonX会员已开通",
      "",
      `套餐：${input.planLabel}`,
      `开通时间：${input.startedAt}`,
      `到期时间：${input.expiresAt}`,
      "",
      `会员内容入口：${site}/member/tomorrow`,
      `本周行情：${site}/member/weekly`,
    ].join("\n"),
  });
  return result.status;
}

export async function notifyBuyerPaymentRejected(input: {
  to: string;
  txHash: string;
  supportEmail: string;
}): Promise<EmailNotificationStatus> {
  const result = await sendRawEmail({
    to: input.to,
    subject: "付款信息未通过审核",
    text: [
      "付款信息未通过审核",
      "",
      `交易哈希：${input.txHash}`,
      `如有疑问请联系客服：${input.supportEmail}`,
    ].join("\n"),
  });
  return result.status;
}

/** Legacy stub — prefer specific notify helpers. */
export async function sendMoonXEmail(input: {
  to: string;
  template: string;
  data: Record<string, unknown>;
}): Promise<{ sent: boolean; reason?: string; status: EmailNotificationStatus }> {
  void input;
  if (!isPaymentEmailConfigured()) {
    return { sent: false, reason: "邮件服务未配置", status: "email_not_configured" };
  }
  return { sent: false, reason: "请使用专用通知函数", status: "email_failed" };
}
