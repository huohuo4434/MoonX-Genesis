import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureProfileForUser } from "@/lib/auth/admin-bootstrap";
import { getProfile } from "@/lib/auth/membership";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeRedirectPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const userFallback = safeRedirectPath(nextParam, "/account");

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=auth_config`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback`);
    }
  } else {
    return NextResponse.redirect(`${origin}${userFallback}`);
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  try {
    await ensureProfileForUser(userData.user.id, userData.user.email);
  } catch (err) {
    console.error("[auth/callback] profile upsert failed:", err instanceof Error ? err.message : err);
  }

  const profile = await getProfile(userData.user.id);
  const destination = profile?.role === "admin" ? "/admin" : userFallback;
  return NextResponse.redirect(`${origin}${destination}`);
}
