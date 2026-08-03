"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

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
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    window.location.assign("/");
  }

  if (!initialEmail) {
    return <Button variant="ghost" size="sm" asChild><Link href="/login">{publicSignupEnabled ? "登录" : adminEnabled ? "管理员登录" : "登录"}</Link></Button>;
  }

  return <>
    {publicSignupEnabled ? <Button variant="ghost" size="sm" asChild><Link href="/account">{initialEmail.split("@")[0]}</Link></Button> : null}
    {adminEnabled && initialIsAdmin ? <Button variant="ghost" size="sm" asChild><Link href="/admin">管理</Link></Button> : null}
    <Button variant="outline" size="sm" onClick={signOut}>退出</Button>
  </>;
}
