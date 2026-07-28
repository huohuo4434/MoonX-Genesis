"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Tab = "login" | "register";

function translateAuthError(message: string): string {
  if (/Email not confirmed/i.test(message)) return "邮箱或密码不正确";
  if (/Invalid login credentials/i.test(message)) return "邮箱或密码不正确";
  if (/User not found|No user found/i.test(message)) return "账户不存在";
  if (/rate|too many|frequent/i.test(message)) return "请求过于频繁，请稍后再试";
  if (/already registered|already been registered/i.test(message)) return "该邮箱已注册，请直接登录。";
  if (/password/i.test(message) && /6|8|least/i.test(message)) return "密码至少需要 8 位。";
  if (/invalid.*email|email.*invalid/i.test(message)) return "邮箱格式不正确。";
  return "操作失败，请稍后重试。";
}

function safeRedirectPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}

function getOrCreateDeviceId(): string {
  try {
    const key = "moonx_device_id";
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    const next = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return `dev_tmp_${Date.now().toString(36)}`;
  }
}

async function resolveRole(): Promise<string | null> {
  await fetch("/api/auth/sync-profile", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
  });
  const res = await fetch("/api/auth/profile", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { role?: string };
  return json.role ?? null;
}

export function LoginForm({
  next = "/account",
  authConfigured = true,
  publicSignupEnabled = true,
  initialTab = "login",
  initialInviteCode = "",
}: {
  next?: string;
  authConfigured?: boolean;
  maintenanceMessage?: string;
  publicSignupEnabled?: boolean;
  initialTab?: Tab;
  initialInviteCode?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectNext = searchParams.get("next") ?? next;
  const refFromQuery = searchParams.get("ref") ?? initialInviteCode;
  const [tab, setTab] = useState<Tab>(
    publicSignupEnabled && (initialTab === "register" || Boolean(refFromQuery)) ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(refFromQuery ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const lastSubmitAt = useRef(0);

  function assertCooldown(): boolean {
    const now = Date.now();
    if (now < cooldownUntil) {
      const sec = Math.ceil((cooldownUntil - now) / 1000);
      setError(`请 ${sec} 秒后再试。`);
      return false;
    }
    if (now - lastSubmitAt.current < 1500) {
      setError("请勿重复提交。");
      return false;
    }
    lastSubmitAt.current = now;
    return true;
  }

  async function afterAuth(role: string | null) {
    // Refresh RSC tree so server components re-read auth cookies before navigation.
    router.refresh();
    const target = role === "admin" ? "/admin" : safeRedirectPath(redirectNext, "/account");
    router.push(target);
  }

  async function signInOnce() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return { error: "登录服务暂不可用，请稍后重试。" as string };
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) return { error: authError.message };
    return { error: null };
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!assertCooldown()) return;
    if (password.length < 8) {
      setError("密码至少需要 8 位。");
      return;
    }
    setLoading(true);
    let result = await signInOnce();
    if (result.error && /Email not confirmed/i.test(result.error)) {
      await fetch("/api/auth/ensure-confirmed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      result = await signInOnce();
    }
    if (result.error) {
      setLoading(false);
      setCooldownUntil(Date.now() + 60_000);
      setError(translateAuthError(result.error));
      return;
    }
    const role = await resolveRole();
    setLoading(false);
    setInfo("登录成功。");
    await afterAuth(role);
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!publicSignupEnabled) {
      setError("当前暂不支持注册。");
      return;
    }
    setError(null);
    setInfo(null);
    if (!assertCooldown()) return;
    if (password.length < 8) {
      setError("密码至少需要 8 位。");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    setLoading(true);

    const regRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": getOrCreateDeviceId(),
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        inviteCode: inviteCode.trim() || null,
        deviceId: getOrCreateDeviceId(),
      }),
    });
    const regJson = (await regRes.json()) as {
      error?: string;
      message?: string;
      inviteWarning?: string;
    };
    if (!regRes.ok) {
      setLoading(false);
      setCooldownUntil(Date.now() + 60_000);
      setError(regJson.error ?? "注册失败，请稍后重试。");
      return;
    }

    setInfo(regJson.inviteWarning ? `账户创建成功。邀请码提示：${regJson.inviteWarning}` : "账户创建成功，正在登录。");
    const result = await signInOnce();
    if (result.error) {
      setLoading(false);
      setError(translateAuthError(result.error));
      return;
    }
    const role = await resolveRole();
    setLoading(false);
    await afterAuth(role);
  }

  if (!authConfigured) {
    return (
      <Card padding="lg" className="mx-auto max-w-md">
        <Text variant="body" weight="semibold" className="mb-2">
          账户登录
        </Text>
        <Text variant="body-sm" color="secondary">
          登录服务暂不可用，请稍后重试。
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="mx-auto max-w-md">
      <Text variant="body" weight="semibold" className="mb-2">
        账户登录／注册
      </Text>
      <Text variant="caption" color="tertiary" className="mb-4 block">
        {tab === "register"
          ? "填写邮箱和密码即可立即创建账户。"
          : "使用邮箱和密码登录。"}
      </Text>
      <div className="mb-4 flex gap-2 border-b border-border/[0.08]">
        <button
          type="button"
          className={`min-h-11 px-3 py-2 text-body-sm ${tab === "login" ? "border-b-2 border-primary font-semibold text-foreground" : "text-foreground-secondary"}`}
          onClick={() => {
            setTab("login");
            setError(null);
            setInfo(null);
          }}
        >
          登录
        </button>
        {publicSignupEnabled ? (
          <button
            type="button"
            className={`min-h-11 px-3 py-2 text-body-sm ${tab === "register" ? "border-b-2 border-primary font-semibold text-foreground" : "text-foreground-secondary"}`}
            onClick={() => {
              setTab("register");
              setError(null);
              setInfo(null);
            }}
          >
            注册
          </button>
        ) : null}
      </div>

      <form onSubmit={tab === "login" ? onLogin : onRegister} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-foreground-tertiary">邮箱</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-body-sm"
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption text-foreground-tertiary">密码</span>
          <div className="flex gap-2">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-body-sm"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              minLength={8}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 shrink-0"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "隐藏" : "显示"}
            </Button>
          </div>
        </label>
        {tab === "register" ? (
          <label className="flex flex-col gap-1">
            <span className="text-caption text-foreground-tertiary">确认密码</span>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 rounded-md border border-border bg-surface px-3 text-body-sm"
              autoComplete="new-password"
              minLength={8}
            />
          </label>
        ) : null}
        {tab === "register" ? (
          <label className="flex flex-col gap-1">
            <span className="text-caption text-foreground-tertiary">邀请码（可选）</span>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="h-11 rounded-md border border-border bg-surface px-3 text-body-sm tracking-wider"
              autoComplete="off"
              placeholder="例如 ABC123"
              maxLength={32}
            />
          </label>
        ) : null}
        {info ? (
          <Text variant="caption" color="secondary">
            {info}
          </Text>
        ) : null}
        {error ? (
          <Text variant="caption" className="text-red-600">
            {error}
          </Text>
        ) : null}
        <Button type="submit" disabled={loading} className="min-h-11">
          {loading
            ? tab === "login"
              ? "登录中…"
              : "创建中…"
            : tab === "login"
              ? "登录"
              : "创建账户"}
        </Button>
      </form>
    </Card>
  );
}
