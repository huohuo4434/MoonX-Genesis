"use client";

import { useState } from "react";
import { Button, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PASSWORD_MIN_LENGTH, validateNewPassword } from "@/lib/auth/password-reset-core";

export function ResetPasswordForm() {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const validation = validateNewPassword(password, confirmation);
    if (validation) {
      setError(en ? (password !== confirmation ? "The passwords do not match." : `Use at least ${PASSWORD_MIN_LENGTH} characters.`) : validation);
      return;
    }
    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ password, confirmation }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; reason?: string };
    if (!response.ok) {
      setLoading(false);
      setError(
        payload.reason === "RECOVERY_EXPIRED"
          ? en
            ? "That reset link is invalid or expired. Request a new one."
            : "重设链接无效或已经过期，请重新申请。"
          : payload.error ?? (en ? "Unable to update the password." : "密码更新失败，请重新申请重设链接。")
      );
      return;
    }
    window.location.replace(href("/login?password_reset=success"));
  }

  return (
    <Card padding="lg" className="mx-auto max-w-md">
      <Text variant="body" weight="semibold" className="mb-2">
        {en ? "Choose a new password" : "设置新密码"}
      </Text>
      <Text variant="body-sm" color="secondary" className="mb-4 block">
        {en
          ? `Use at least ${PASSWORD_MIN_LENGTH} characters. After the change, you will sign in again and other sessions will be revoked.`
          : `新密码至少 ${PASSWORD_MIN_LENGTH} 位。修改成功后需要重新登录，其他设备会话和已信任设备将失效。`}
      </Text>
      <form onSubmit={submit} className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-foreground-tertiary">{en ? "New password" : "新密码"}</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            className="h-11 rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption text-foreground-tertiary">{en ? "Confirm new password" : "确认新密码"}</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            className="h-11 rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </label>
        <button
          type="button"
          className="text-body-sm text-foreground-secondary hover:text-foreground hover:underline"
          onClick={() => setShowPassword((value) => !value)}
        >
          {showPassword ? (en ? "Hide passwords" : "隐藏密码") : en ? "Show passwords" : "显示密码"}
        </button>
        {error ? (
          <div className="space-y-2">
            <Text variant="caption" className="text-red-600">{error}</Text>
            <a href={href("/forgot-password")} className="block text-body-sm text-primary hover:underline">
              {en ? "Request a new reset link" : "重新申请重设链接"}
            </a>
          </div>
        ) : null}
        <Button type="submit" disabled={loading} className="min-h-11 w-full">
          {loading ? (en ? "Updating…" : "更新中…") : en ? "Set new password" : "设置新密码"}
        </Button>
      </form>
    </Card>
  );
}
