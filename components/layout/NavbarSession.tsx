"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";

const SESSION_CACHE_KEY = "moox_nav_session_v1";
const SESSION_CACHE_MS = 2 * 60 * 1000;

type NavSession = {
  email: string | null;
  isAdmin: boolean;
};

type CachedNavSession = NavSession & { cachedAt: number };
type NavSessionPayload = {
  authenticated?: boolean;
  email?: string | null;
  isAdmin?: boolean;
};

function readCachedSession(): CachedNavSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedNavSession>;
    if (
      typeof parsed.cachedAt !== "number" ||
      Date.now() - parsed.cachedAt > SESSION_CACHE_MS ||
      (parsed.email !== null && typeof parsed.email !== "string") ||
      typeof parsed.isAdmin !== "boolean"
    ) {
      window.sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return {
      cachedAt: parsed.cachedAt,
      email: parsed.email ?? null,
      isAdmin: parsed.isAdmin,
    };
  } catch {
    return null;
  }
}

function writeCachedSession(session: NavSession): void {
  try {
    window.sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({ ...session, cachedAt: Date.now() } satisfies CachedNavSession)
    );
  } catch {
    // sessionStorage may be unavailable in privacy mode.
  }
}

export function NavbarSession({
  adminEnabled = true,
  publicSignupEnabled = true,
}: {
  adminEnabled?: boolean;
  publicSignupEnabled?: boolean;
}) {
  const { locale, href } = useLocale();
  const t = useTranslations();
  const en = locale === "en";
  const [session, setSession] = useState<NavSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedSession();
    if (cached) setSession({ email: cached.email, isAdmin: cached.isAdmin });

    const shouldRefresh = !cached || Date.now() - cached.cachedAt > 30_000;
    if (!shouldRefresh) return () => { cancelled = true; };

    const controller = new AbortController();
    fetch("/api/auth/session-lite", {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response): Promise<NavSessionPayload> => {
        if (!response.ok) return { authenticated: false, email: null, isAdmin: false };
        return response.json() as Promise<NavSessionPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        const next: NavSession = payload.authenticated
          ? { email: payload.email ?? null, isAdmin: payload.isAdmin === true }
          : { email: null, isAdmin: false };
        setSession(next);
        writeCachedSession(next);
      })
      .catch(() => {
        if (!cancelled && !cached) setSession({ email: null, isAdmin: false });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  async function signOut() {
    try {
      window.sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
      // Ignore storage failures.
    }
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    window.location.replace(href("/"));
  }

  if (!session) {
    return <span className="inline-block h-9 w-20" aria-hidden="true" />;
  }

  if (!session.email) {
    const label = publicSignupEnabled
      ? t("nav.signIn")
      : adminEnabled
        ? en ? "Admin sign in" : "管理员登录"
        : t("nav.signIn");
    return <Button variant="ghost" size="sm" asChild><Link href={href("/login")} prefetch={false}>{label}</Link></Button>;
  }

  return <>
    {publicSignupEnabled ? <Button variant="ghost" size="sm" asChild><Link href={href("/account")} prefetch={false}>{session.email.split("@")[0]}</Link></Button> : null}
    {adminEnabled && session.isAdmin ? <Button variant="ghost" size="sm" asChild><Link href="/admin" prefetch={false}>{en ? "Admin" : "管理"}</Link></Button> : null}
    <Button variant="outline" size="sm" onClick={signOut}>{en ? "Sign out" : "退出"}</Button>
  </>;
}
