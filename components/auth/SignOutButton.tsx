"use client";

import { Button } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function SignOutButton() {
  const { locale } = useLocale();
  const en = locale === "en";
  async function onSignOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    window.location.assign("/");
  }
  return <Button variant="outline" size="sm" onClick={onSignOut}>{en ? "Sign out" : "退出登录"}</Button>;
}
