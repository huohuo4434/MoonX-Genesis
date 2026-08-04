import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";
import { isActiveMember, isAdmin, toAuthUserView } from "@/lib/auth/permissions";
import {
  generateDeviceToken,
  MEMBER_DEVICE_COOKIE,
  MEMBER_DEVICE_COOKIE_MAX_AGE_SECONDS,
  registerLoginDevice,
} from "@/lib/auth/device-security";

export const dynamic = "force-dynamic";

function authConfig() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim();
  return url && key ? { url, key } : null;
}

function secureOptions(options: CookieOptions | undefined): CookieOptions {
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  return {
    ...options,
    path: options?.path ?? "/",
    sameSite: options?.sameSite ?? "lax",
    secure: isProd ? true : Boolean(options?.secure),
    httpOnly: true,
  };
}

export async function POST(request: NextRequest) {
  const cfg = authConfig();
  if (!cfg) return NextResponse.json({ error: "登录服务暂不可用" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!email || password.length < 8) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 400 });
  }

  const pending: Array<{ name: string; value: string; options?: CookieOptions }> = [];
  const supabase = createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        pending.push(...items);
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Invalid login credentials" }, { status: 401 });
  }

  const currentDeviceToken = request.cookies.get(MEMBER_DEVICE_COOKIE)?.value;
  const deviceToken = currentDeviceToken || generateDeviceToken();
  const authUser = toAuthUserView(data.user);
  const deviceRegistration = await registerLoginDevice({
    userId: data.user.id,
    deviceToken,
    userAgent: request.headers.get("user-agent"),
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip"),
    region: request.headers.get("x-vercel-ip-country"),
    isPaidMember: isActiveMember(authUser),
    isAdmin: isAdmin(authUser),
  }).catch(() => ({ ok: false as const, reason: "SETUP_REQUIRED" as const }));

  const adminUser = isAdmin(authUser);
  const response = NextResponse.json({
    ok: true,
    email: data.user.email ?? email,
    role: adminUser ? "admin" : "user",
    isAdmin: adminUser,
    deviceStatus: deviceRegistration.reason,
  });
  for (const item of pending) response.cookies.set(item.name, item.value, secureOptions(item.options));
  response.cookies.set(MEMBER_DEVICE_COOKIE, deviceToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
    maxAge: MEMBER_DEVICE_COOKIE_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
