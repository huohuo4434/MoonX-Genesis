import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin-emails";

const schema = z.object({
  email: z.string().email().max(200),
});

/**
 * Confirm email for an existing unconfirmed user without changing password.
 * Used when login returns "Email not confirmed".
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limit = checkRateLimit(`ensure-confirm:${ip}:${email}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "服务暂不可用" }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data?.users) {
    return NextResponse.json({ error: "无法读取用户" }, { status: 500 });
  }

  const user = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!user) {
    return NextResponse.json({ ok: true, confirmed: false, reason: "not_found" });
  }

  // Do not touch admin accounts beyond ensuring confirmed.
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const role = meta.role === "admin" || isAdminEmail(email) ? "admin" : "user";
  const nextMeta = {
    ...meta,
    role,
    membership_status: meta.membership_status ?? (role === "admin" ? "active" : "inactive"),
  };

  if (!user.email_confirmed_at) {
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      app_metadata: nextMeta,
    });
    if (updErr) {
      return NextResponse.json({ error: "确认失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, confirmed: true });
  }

  // Ensure role metadata exists even if already confirmed.
  if (!meta.role) {
    await admin.auth.admin.updateUserById(user.id, { app_metadata: nextMeta });
  }

  return NextResponse.json({ ok: true, confirmed: false, reason: "already_confirmed" });
}
