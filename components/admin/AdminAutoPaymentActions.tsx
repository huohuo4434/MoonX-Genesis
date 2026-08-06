"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";

export function AdminAutoPaymentActions({
  orderId,
  canRetry,
  canActivate,
}: {
  orderId: string;
  canRetry: boolean;
  canActivate: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "retry" | "activate" | "resend_admin_email") {
    const label = action === "retry" ? "重新核验" : action === "activate" ? "确认到账并手动开通" : "重发邮件";
    if (action === "activate" && !window.confirm("请先在区块浏览器确认收款地址、币种和金额均正确。确认后将立即给用户开通会员，是否继续？")) return;
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/payments/auto-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action, confirm: true }),
      });
      const json = (await response.json()) as { error?: string; result?: { message?: string } };
      if (!response.ok) throw new Error(json.error ?? `${label}失败`);
      setMessage(json.result?.message ?? `${label}完成`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label}失败`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        {canRetry ? (
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run("retry")}>
            {busy === "retry" ? "核验中…" : "重试链上核验"}
          </Button>
        ) : null}
        {canActivate ? (
          <Button size="sm" disabled={busy !== null} onClick={() => run("activate")}>
            {busy === "activate" ? "开通中…" : "确认到账并手动开通"}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run("resend_admin_email")}>
          {busy === "resend_admin_email" ? "发送中…" : "重发付款邮件"}
        </Button>
      </div>
      {message ? <Text variant="caption" color="tertiary">{message}</Text> : null}
    </div>
  );
}
