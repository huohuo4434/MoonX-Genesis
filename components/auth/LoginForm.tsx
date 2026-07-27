"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const AUTH_ERROR_ZH: Record<string, string> = {
  "Invalid email": "邮箱格式不正确，请检查后重试。",
  "Email rate limit exceeded": "发送过于频繁，请稍后再试。",
  "Signups not allowed for this instance": "当前不允许新用户注册，请联系客服。",
  "Email link is invalid or has expired": "登录链接无效或已过期，请重新发送。",
};

function translateAuthError(message: string): string {
  for (const [key, zh] of Object.entries(AUTH_ERROR_ZH)) {
    if (message.includes(key)) return zh;
  }
  if (/rate limit/i.test(message)) return "发送过于频繁，请稍后再试。";
  if (/invalid email/i.test(message)) return "邮箱格式不正确，请检查后重试。";
  return "登录请求失败，请稍后重试或联系客服。";
}

export function LoginForm({ next = "/account" }: { next?: string }) {
  const searchParams = useSearchParams();
  const redirectNext = searchParams.get("next") ?? next;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("登录服务尚未配置，请稍后再试。");
      setLoading(false);
      return;
    }
    const safeNext = redirectNext.startsWith("/") && !redirectNext.startsWith("//") ? redirectNext : "/account";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (authError) {
      setError(translateAuthError(authError.message));
      return;
    }
    setSent(true);
  }

  return (
    <Card padding="lg" className="mx-auto max-w-md">
      <Text variant="body" weight="semibold" className="mb-2">
        邮箱登录
      </Text>
      <Text variant="body-sm" color="secondary" className="mb-4">
        输入邮箱，我们会向你发送免密登录链接，无需设置密码。
      </Text>
      {sent ? (
        <Text variant="body-sm" color="secondary">
          登录链接已发送，请检查收件箱和垃圾邮件文件夹。
        </Text>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
            aria-label="邮箱"
          />
          {error && (
            <Text variant="caption" color="tertiary">
              {error}
            </Text>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "发送中…" : "发送登录链接"}
          </Button>
        </form>
      )}
    </Card>
  );
}
