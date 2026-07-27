"use client";

import { useState } from "react";
import { Button, Card, Text } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
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
      setError("登录服务尚未配置 Supabase 环境变量");
      setLoading(false);
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
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
        使用 Magic Link 登录，无需密码。邮件服务由 Supabase 提供；若未收到请检查垃圾箱。
      </Text>
      {sent ? (
        <Text variant="body-sm" color="secondary">
          登录链接已发送至 {email}，请在 15 分钟内点击邮件中的链接完成登录。
        </Text>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
            aria-label="邮箱"
          />
          {error && (
            <Text variant="caption" color="tertiary">
              {error}
            </Text>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "发送中…" : "发送 Magic Link"}
          </Button>
        </form>
      )}
    </Card>
  );
}
