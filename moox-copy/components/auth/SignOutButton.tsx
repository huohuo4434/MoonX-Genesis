"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.refresh();
    window.location.href = "/";
  }

  return (
    <Button variant="outline" size="sm" onClick={signOut}>
      退出登录
    </Button>
  );
}
