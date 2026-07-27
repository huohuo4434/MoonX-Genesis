"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function NavbarSession() {
  const t = useTranslations();
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
      const res = await fetch("/api/auth/profile");
      if (res.ok) {
        const json = (await res.json()) as { role?: string };
        setIsAdmin(json.role === "admin");
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
      <>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">{t("nav.signIn")}</Link>
        </Button>
        <Button variant="primary" size="sm" asChild>
          <Link href="/pricing">{t("nav.getStarted")}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/account">{email.split("@")[0]}</Link>
      </Button>
      {isAdmin && (
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
