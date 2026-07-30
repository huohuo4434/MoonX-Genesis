"use client";

import { useState } from "react";
import { Button, Text } from "@/components/ui";

export function AdminPaymentEmailTest({ configured }: { configured: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  async function sendTest() {
    setLoading(true);
    setMessage(null);
    setOk(null);
    const res = await fetch("/api/admin/notifications/test-payment-email", { method: "POST" });
    const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };
    setLoading(false);
    if (json.ok) {
      setOk(true);
      setMessage(json.message ?? "测试邮件已发送");
      return;
    }
    setOk(false);
    setMessage(json.error ?? "发送失败");
  }

  return (
    <div className="space-y-2 pt-2">
      <Button size="sm" disabled={loading} onClick={sendTest}>
        {loading ? "发送中…" : "发送测试邮件"}
      </Button>
      {message ? (
        <Text variant="caption" className={ok ? "text-green-600" : "text-red-600"}>
          {message}
        </Text>
      ) : null}
      {!configured ? (
        <Text variant="caption" color="tertiary" className="block">
          若仍提示缺少 RESEND_API_KEY，请确认 Vercel Production 环境变量已生效并重新部署。
        </Text>
      ) : (
        <Text variant="caption" color="tertiary" className="block">
          将向管理员收件人发送测试邮件；失败时显示 Resend 返回的具体中文原因。
        </Text>
      )}
    </div>
  );
}
