import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  buildPasswordResetCallbackUrl,
  normalizePasswordResetEmail,
  PASSWORD_RESET_GENERIC_MESSAGE,
} from "@/lib/auth/password-reset-core";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({ email: z.string().email().max(200) });

function identityHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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

function noStoreJson(body: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", ...headers },
  });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return noStoreJson({ error: "请填写有效的邮箱地址。" }, 400);
  }

  const email = normalizePasswordResetEmail(parsed.data.email);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipLimit = checkRateLimit(`forgot-password:ip:${identityHash(ip)}`, 8, 60 * 60 * 1000);
  const emailLimit = checkRateLimit(
    `forgot-password:email:${identityHash(email)}`,
    3,
    60 * 60 * 1000
  );
  if (!ipLimit.ok || !emailLimit.ok) {
    const retryAfterSec = Math.max(ipLimit.retryAfterSec ?? 0, emailLimit.retryAfterSec ?? 0, 60);
    return noStoreJson(
      { error: "请求过于频繁，请稍后再试。" },
      429,
      { "Retry-After": String(retryAfterSec) }
    );
  }

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) {
    return noStoreJson({ error: "找回密码服务暂不可用，请稍后再试。" }, 503);
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildPasswordResetCallbackUrl(siteConfig.url),
  });
  if (error) {
    const limited = /rate|too many|security purposes/i.test(error.message);
    return noStoreJson(
      { error: limited ? "请求过于频繁，请稍后再试。" : "重设邮件暂时无法发送，请稍后再试。" },
      limited ? 429 : 503,
      limited ? { "Retry-After": "60" } : undefined
    );
  }

  // Supabase deliberately returns the same result for registered and unknown
  // addresses. Keep that privacy boundary intact to prevent account discovery.
  const response = noStoreJson({ ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
  for (const item of pending) response.cookies.set(item.name, item.value, secureOptions(item.options));
  return response;
}
