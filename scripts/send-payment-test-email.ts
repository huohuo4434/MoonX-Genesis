/**
 * Send real payment test email using production env (Resend).
 * Prefer direct Resend call (works on Vercel build with secrets).
 * Also hits live HTTP endpoint when possible.
 */
import { Resend } from "resend";
import { loadProductionEnv } from "./load-env";

loadProductionEnv();

function chineseResendError(raw?: string): string {
  if (!raw?.trim()) return "邮件发送失败：Resend 未返回具体原因";
  const m = raw.toLowerCase();
  if (m.includes("invalid api key") || m.includes("unauthorized") || m.includes("401")) {
    return `API密钥无效：${raw}`;
  }
  if (
    m.includes("not verified") ||
    m.includes("domain is not verified") ||
    m.includes("from address") ||
    m.includes("validation_error")
  ) {
    return `发件地址未验证：${raw}`;
  }
  if (m.includes("restricted") || m.includes("only send testing emails") || m.includes("own email")) {
    return `收件人被拒绝（测试域名仅可发给账号邮箱）：${raw}`;
  }
  if (m.includes("bounce") || m.includes("blocked") || m.includes("recipient")) {
    return `收件人被拒绝：${raw}`;
  }
  if (m.includes("rate") || m.includes("too many")) return `发送频率受限：${raw}`;
  return `邮件发送失败：${raw.replace(/re_[A-Za-z0-9_]+/g, "re_***")}`;
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to =
    process.env.PAYMENT_NOTIFICATION_EMAIL?.trim() ||
    process.env.MOONX_ADMIN_EMAIL?.trim() ||
    "jackzwin999@gmail.com";
  const from =
    process.env.PAYMENT_EMAIL_FROM?.trim() ||
    process.env.MOONX_SUPPORT_EMAIL?.trim() ||
    "MoonX <onboarding@resend.dev>";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moon-x-genesis.vercel.app";

  if (!apiKey || apiKey === "[SENSITIVE]" || apiKey.length < 10) {
    console.log(
      JSON.stringify({
        ok: false,
        status: "email_not_configured",
        error: "邮件服务未配置：缺少 RESEND_API_KEY",
        to,
        from,
      })
    );
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "MoonX付款通知测试成功",
    text: [
      "MoonX付款通知测试成功",
      "",
      `收件人：${to}`,
      `发件人：${from}`,
      `时间：${new Date().toISOString()}`,
      "",
      `审核地址：${site}/admin/payments`,
    ].join("\n"),
  });

  if (error) {
    const detail = [error.name, error.message].filter(Boolean).join(": ");
    console.log(
      JSON.stringify({
        ok: false,
        status: "email_failed",
        error: chineseResendError(detail),
        rawError: detail.replace(/re_[A-Za-z0-9_]+/g, "re_***"),
        to,
        from,
      })
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      ok: true,
      status: "email_sent",
      message: "测试邮件已发送",
      to,
      from,
      emailId: data?.id ?? null,
    })
  );
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: chineseResendError(err instanceof Error ? err.message : String(err)),
    })
  );
  process.exit(1);
});
