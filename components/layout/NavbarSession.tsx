"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";

export function NavbarSession({
  adminEnabled = true,
  publicSignupEnabled = true,
  initialEmail = null,
  initialIsAdmin = false,
}: {
  adminEnabled?: boolean;
  publicSignupEnabled?: boolean;
  initialEmail?: string | null;
  initialIsAdmin?: boolean;
}) {
  const { locale, href } = useLocale();
  const t = useTranslations();
  const en = locale === "en";

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    window.location.assign(href("/"));
  }

  if (!initialEmail) {
    const label = publicSignupEnabled ? t("nav.signIn") : adminEnabled ? (en ? "Admin sign in" : "管理员登录") : t("nav.signIn");
    return <Button variant="ghost" size="sm" asChild><Link href={href("/login")}>{label}</Link></Button>;
  }

  return <>
    {publicSignupEnabled ? <Button variant="ghost" size="sm" asChild><Link href={href("/account")}>{initialEmail.split("@")[0]}</Link></Button> : null}
    {adminEnabled && initialIsAdmin ? <Button variant="ghost" size="sm" asChild><Link href="/admin">{en ? "Admin" : "管理"}</Link></Button> : null}
    <Button variant="outline" size="sm" onClick={signOut}>{en ? "Sign out" : "退出"}</Button>
  </>;
}
