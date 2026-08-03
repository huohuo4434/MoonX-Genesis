"use client";

import { Button } from "@/components/ui";

export function SignOutButton() {
  async function onSignOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    window.location.assign("/");
  }
  return <Button variant="outline" size="sm" onClick={onSignOut}>退出登录</Button>;
}
