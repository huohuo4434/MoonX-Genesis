"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function NavbarSession({
  adminEnabled = true,
  publicSignupEnabled = true,
}: {
  adminEnabled?: boolean;
  publicSignupEnabled?: boolean;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) {
        setLoading(false);
        return;
      }
      setEmail(data.user.email);
      const res = await fetch("/api/auth/profile", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const json = (await res.json()) as { role?: string; isAdmin?: boolean; email?: string };
        setIsAdmin(Boolean(json.isAdmin) || json.role === "admin");
      }
      setLoading(false);
    });
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) return null;

  if (!email) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">{publicSignupEnabled ? "登录" : adminEnabled ? "管理员登录" : "登录"}</Link>
      </Button>
    );
  }

  return (
    <>
      {publicSignupEnabled && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/account">{email.split("@")[0]}</Link>
        </Button>
      )}
      {adminEnabled && isAdmin && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">管理</Link>
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={signOut}>
        退出
      </Button>
    </>
  );
}
