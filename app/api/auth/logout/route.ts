import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) return NextResponse.json({ ok: true });

  const pending: Array<{ name: string; value: string; options?: CookieOptions }> = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        pending.push(...items);
      },
    },
  });
  await supabase.auth.signOut().catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  for (const item of pending) {
    response.cookies.set(item.name, item.value, {
      ...item.options,
      path: item.options?.path ?? "/",
      httpOnly: true,
      sameSite: item.options?.sameSite ?? "lax",
      secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
      maxAge: 0,
    });
  }
  response.cookies.set("moox_device", "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
