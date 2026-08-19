"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { clearSessionLite, loadSessionLite, peekSessionLite, type SessionLite } from "@/lib/client/session-lite";

type NavSession = Pick<SessionLite, "email" | "isAdmin">;

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
    const cached = peekSessionLite();
    if (cached) setSession({ email: cached.email, isAdmin: cached.isAdmin });

    loadSessionLite(30_000).then((payload) => {
      if (!cancelled) setSession({ email: payload.email, isAdmin: payload.isAdmin });
    });

    return () => { cancelled = true; };
  }, []);

  async function signOut() {
    clearSessionLite();
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
    return <Button variant="ghost" size="sm" asChild><Link href={href("/login")}>{label}</Link></Button>;
  }

  return <>
    {publicSignupEnabled ? <Button variant="ghost" size="sm" asChild><Link href={href("/account")}>{session.email.split("@")[0]}</Link></Button> : null}
    {adminEnabled && session.isAdmin ? <Button variant="ghost" size="sm" asChild><Link href="/admin">{en ? "Admin" : "管理"}</Link></Button> : null}
    <Button variant="outline" size="sm" onClick={signOut}>{en ? "Sign out" : "退出"}</Button>
  </>;
}
