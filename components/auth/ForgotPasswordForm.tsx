"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { locale, href } = useLocale();
  const en = locale === "en";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "expired"
      ? en
        ? "That reset link is invalid or expired. Request a new one below."
        : "重设链接无效或已经过期，请重新申请。"
      : null
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const response = await fetch("/api/public/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email: email.trim() }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? (en ? "Unable to send the reset email. Try again later." : "重设邮件暂时无法发送，请稍后再试。"));
      return;
    }
    setSent(true);
  }

  return (
    <Card padding="lg" className="mx-auto max-w-md">
      <Text variant="body" weight="semibold" className="mb-2">
        {en ? "Reset your password" : "找回密码"}
      </Text>
      <Text variant="body-sm" color="secondary" className="mb-4 block">
        {en
          ? "Enter the email address used for your MOOX account. We will send a one-time reset link."
          : "输入注册MOOX时使用的邮箱，我们会发送一封一次性重设密码邮件。"}
      </Text>

      {sent ? (
        <div className="space-y-3">
          <Text variant="body-sm">
            {en
              ? "If that email is registered, a reset message has been sent. Check your inbox and spam folder. For security, we cannot confirm whether an account exists."
              : "如果该邮箱已注册，重设邮件已经发送。请检查收件箱和垃圾邮件。为保护账户安全，页面不会确认某个邮箱是否已注册。"}
          </Text>
          <Text variant="caption" color="tertiary">
            {en
              ? "Open the link in the same browser where possible. The link is time-limited and can be used only once."
              : "建议尽量在当前浏览器打开邮件链接；链接有时效且只能使用一次。"}
          </Text>
          <button
            type="button"
            className="text-body-sm font-medium text-primary hover:underline"
            onClick={() => setSent(false)}
          >
            {en ? "Send again" : "重新发送"}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-caption text-foreground-tertiary">{en ? "Email" : "邮箱"}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="h-11 rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          {error ? <Text variant="caption" className="text-red-600">{error}</Text> : null}
          <Button type="submit" disabled={loading} className="min-h-11 w-full">
            {loading ? (en ? "Sending…" : "发送中…") : en ? "Send reset email" : "发送重设邮件"}
          </Button>
        </form>
      )}

      <a href={href("/login")} className="mt-5 inline-block text-body-sm text-foreground-secondary hover:text-foreground hover:underline">
        {en ? "Back to sign in" : "返回登录"}
      </a>
    </Card>
  );
}
