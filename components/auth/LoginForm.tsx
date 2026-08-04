"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Tab = "login" | "register";

function translateAuthError(message: string, english = false): string {
  if (/Email not confirmed/i.test(message)) return english ? "Incorrect email or password." : "邮箱或密码不正确";
  if (/Invalid login credentials/i.test(message)) return english ? "Incorrect email or password." : "邮箱或密码不正确";
  if (/User not found|No user found/i.test(message)) return english ? "Account not found." : "账户不存在";
  if (/rate|too many|frequent/i.test(message)) return english ? "Too many requests. Please try again later." : "请求过于频繁，请稍后再试";
  if (/already registered|already been registered/i.test(message)) return english ? "This email is already registered. Please sign in." : "该邮箱已注册，请直接登录。";
  if (/password/i.test(message) && /6|8|least/i.test(message)) return english ? "The password must be at least 8 characters." : "密码至少需要 8 位。";
  if (/invalid.*email|email.*invalid/i.test(message)) return english ? "Invalid email address." : "邮箱格式不正确。";
  return english ? "The operation failed. Please try again later." : "操作失败，请稍后重试。";
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

const NAV_SESSION_CACHE_KEY = "moox_nav_session_v1";

type SignInResult = {
  error: string | null;
  email: string | null;
  isAdmin: boolean;
};

function cacheNavSession(result: SignInResult): void {
  if (result.error || !result.email) return;
  try {
    window.sessionStorage.setItem(
      NAV_SESSION_CACHE_KEY,
      JSON.stringify({ email: result.email, isAdmin: result.isAdmin, cachedAt: Date.now() })
    );
  } catch {
    // Ignore storage failures.
  }
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
  const searchParams = useSearchParams();
  const { locale, href } = useLocale();
  const en = locale === "en";
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
      setError(en ? `Please wait ${sec} seconds before trying again.` : `请 ${sec} 秒后再试。`);
      return false;
    }
    if (now - lastSubmitAt.current < 1500) {
      setError(en ? "Please do not submit repeatedly." : "请勿重复提交。");
      return false;
    }
    lastSubmitAt.current = now;
    return true;
  }

  function afterAuth(result: SignInResult) {
    cacheNavSession(result);
    const target = result.isAdmin ? "/admin" : safeRedirectPath(redirectNext, "/account");
    window.location.replace(result.isAdmin ? target : href(target));
  }

  async function signInOnce() {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      email?: string | null;
      isAdmin?: boolean;
    };
    return {
      error: response.ok ? null : payload.error ?? (en ? "Sign-in failed" : "登录失败"),
      email: response.ok ? payload.email ?? email.trim().toLowerCase() : null,
      isAdmin: response.ok && payload.isAdmin === true,
    } satisfies SignInResult;
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!assertCooldown()) return;
    if (password.length < 8) {
      setError(en ? "The password must be at least 8 characters." : "密码至少需要 8 位。");
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
      setError(translateAuthError(result.error, en));
      return;
    }
    setInfo(en ? "Signed in." : "登录成功。");
    afterAuth(result);
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!publicSignupEnabled) {
      setError(en ? "Registration is temporarily unavailable." : "当前暂不支持注册。");
      return;
    }
    setError(null);
    setInfo(null);
    if (!assertCooldown()) return;
    if (password.length < 8) {
      setError(en ? "The password must be at least 8 characters." : "密码至少需要 8 位。");
      return;
    }
    if (password !== confirmPassword) {
      setError(en ? "The passwords do not match." : "两次输入的密码不一致。");
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
      setError(regJson.error ?? (en ? "Registration failed. Please try again later." : "注册失败，请稍后重试。"));
      return;
    }

    setInfo(regJson.inviteWarning ? (en ? `Account created. Invite-code note: ${regJson.inviteWarning}` : `账户创建成功。邀请码提示：${regJson.inviteWarning}`) : en ? "Account created. Signing in…" : "账户创建成功，正在登录。");
    const result = await signInOnce();
    if (result.error) {
      setLoading(false);
      setError(translateAuthError(result.error, en));
      return;
    }
    afterAuth(result);
  }

  if (!authConfigured) {
    return (
      <Card padding="lg" className="mx-auto max-w-md">
        <Text variant="body" weight="semibold" className="mb-2">
          {en ? "Account sign-in" : "账户登录"}
        </Text>
        <Text variant="body-sm" color="secondary">
          {en ? "The sign-in service is temporarily unavailable. Please try again later." : "登录服务暂不可用，请稍后重试。"}
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="mx-auto max-w-md">
      <Text variant="body" weight="semibold" className="mb-2">
        {en ? "Sign in or create an account" : "账户登录／注册"}
      </Text>
      <Text variant="caption" color="tertiary" className="mb-4 block">
        {tab === "register"
          ? en ? "Create an account with your email and password." : "填写邮箱和密码即可立即创建账户。"
          : en ? "Sign in with your email and password." : "使用邮箱和密码登录。"}
      </Text>
      <div className="mb-4 flex gap-2 border-b border-border/[0.08]">
        <button
          type="button"
          className={`min-h-11 px-3 py-2 text-body-sm ${tab === "login" ? "border-b-2 border-primary font-semibold text-foreground" : "text-foreground-secondary"}`}
          onClick={() => {
            setTab("login");
            setPassword("");
            setConfirmPassword("");
            setShowPassword(false);
            setError(null);
            setInfo(null);
          }}
        >
          {en ? "Sign in" : "登录"}
        </button>
        {publicSignupEnabled ? (
          <button
            type="button"
            className={`min-h-11 px-3 py-2 text-body-sm ${tab === "register" ? "border-b-2 border-primary font-semibold text-foreground" : "text-foreground-secondary"}`}
            onClick={() => {
              setTab("register");
              setPassword("");
              setConfirmPassword("");
              setShowPassword(false);
              setError(null);
              setInfo(null);
            }}
          >
            {en ? "Register" : "注册"}
          </button>
        ) : null}
      </div>

      <form onSubmit={tab === "login" ? onLogin : onRegister} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-foreground-tertiary">{en ? "Email" : "邮箱"}</span>
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
          <span className="text-caption text-foreground-tertiary">{en ? "Password" : "密码"}</span>
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
              aria-label={showPassword ? (en ? "Hide password" : "隐藏密码") : en ? "Show password" : "显示密码"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (en ? "Hide" : "隐藏") : en ? "Show" : "显示"}
            </Button>
          </div>
        </label>
        {tab === "register" ? (
          <label className="flex flex-col gap-1">
            <span className="text-caption text-foreground-tertiary">{en ? "Confirm password" : "确认密码"}</span>
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
            <span className="text-caption text-foreground-tertiary">{en ? "Invite code (optional)" : "邀请码（可选）"}</span>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="h-11 rounded-md border border-border bg-surface px-3 text-body-sm tracking-wider"
              autoComplete="off"
              placeholder={en ? "Example: ABC123" : "例如 ABC123"}
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
              ? en ? "Signing in…" : "登录中…"
              : en ? "Creating…" : "创建中…"
            : tab === "login"
              ? en ? "Sign in" : "登录"
              : en ? "Create account" : "创建账户"}
        </Button>
      </form>
    </Card>
  );
}
