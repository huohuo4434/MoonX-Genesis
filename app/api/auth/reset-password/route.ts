import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
} from "@/lib/auth/password-reset-core";
import {
  logoutOtherDevices,
  MEMBER_DEVICE_COOKIE,
  recordSecurityEvent,
} from "@/lib/auth/device-security";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  confirmation: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = checkRateLimit(`reset-password:ip:${ip}`, 8, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "尝试次数过多，请稍后再试。" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Retry-After": String(limited.retryAfterSec ?? 60),
        },
      }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: `新密码至少需要 ${PASSWORD_MIN_LENGTH} 位。` },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
  const passwordError = validateNewPassword(parsed.data.password, parsed.data.confirmation);
  if (passwordError) {
    return NextResponse.json(
      { error: passwordError },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) {
    return NextResponse.json(
      { error: "重设密码服务暂不可用，请稍后再试。" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const pending: Array<{ name: string; value: string; options?: CookieOptions }> = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        pending.push(...items);
      },
    },
  });
  const authorization = await supabase.auth.getUser();
  const { data: userData, error: userError } = authorization;
  if (userError || !userData.user) {
    return NextResponse.json(
      { reason: "RECOVERY_EXPIRED", error: "重设链接无效或已经过期，请重新申请。" },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) {
    return NextResponse.json(
      { error: /same password/i.test(updateError.message) ? "新密码不能与原密码相同。" : "密码更新失败，请重新申请重设链接。" },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  await logoutOtherDevices({ userId: userData.user.id, actorUserId: userData.user.id });
  await recordSecurityEvent({
    userId: userData.user.id,
    eventType: "PASSWORD_RESET_COMPLETED",
    actorUserId: userData.user.id,
  });
  await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);

  const response = NextResponse.json(
    { ok: true, message: "密码已更新，请使用新密码重新登录。" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
  for (const item of pending) response.cookies.set(item.name, item.value, secureOptions(item.options));
  response.cookies.set(MEMBER_DEVICE_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
    maxAge: 0,
  });
  return response;
}
