import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  chineseResendError,
  isPaymentEmailConfigured,
  paymentEmailFrom,
  paymentNotifyTo,
  sendRawEmail,
} from "@/lib/email/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function authorize(request: NextRequest): Promise<boolean> {
  if (await requireAdmin()) return true;
  const expected = process.env.MOONX_ADMIN_INITIAL_PASSWORD?.trim();
  if (!expected || expected.length < 8) return false;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "无权限", ok: false }, { status: 403 });
  }

  const to = paymentNotifyTo();
  const from = paymentEmailFrom();

  if (!isPaymentEmailConfigured()) {
    return NextResponse.json({
      ok: false,
      status: "email_not_configured",
      error: "邮件服务未配置：缺少 RESEND_API_KEY",
      to,
      from,
    });
  }

  const result = await sendRawEmail({
    to,
    subject: "MoonX付款通知测试成功",
    text: [
      "MoonX付款通知测试成功",
      "",
      `收件人：${to}`,
      `发件人：${from}`,
      `时间：${new Date().toISOString()}`,
      "",
      "审核地址：https://moon-x-genesis.vercel.app/admin/payments",
    ].join("\n"),
  });

  if (result.status === "sent") {
    return NextResponse.json({
      ok: true,
      status: "email_sent",
      message: "测试邮件已发送",
      to,
      from,
    });
  }

  return NextResponse.json({
    ok: false,
    status: result.status,
    error: chineseResendError(result.error),
    rawError: result.error ? result.error.replace(/re_[A-Za-z0-9_]+/g, "re_***") : undefined,
    to,
    from,
  });
}
