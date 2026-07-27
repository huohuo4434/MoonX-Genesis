import { NextResponse } from "next/server";
import { ensureProfileForUser, isAdminEmail } from "@/lib/auth/admin-bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeRedirectPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const fallback = safeRedirectPath(nextParam, "/account");

  if (!code) {
    return NextResponse.redirect(`${origin}${fallback}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=auth_config`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  await ensureProfileForUser(data.user.id, data.user.email);

  const destination = isAdminEmail(data.user.email) ? "/admin" : fallback;
  return NextResponse.redirect(`${origin}${destination}`);
}
