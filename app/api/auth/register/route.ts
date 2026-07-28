import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlags } from "@/lib/feature-flags";
import { attachInviteOnRegister } from "@/lib/referral/service";
import { ensureReferralInvite } from "@/lib/referral/store";
import { updateUserAppMetadata } from "@/lib/auth/permissions";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  inviteCode: z.string().max(32).optional().nullable(),
  deviceId: z.string().max(128).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const flags = getFeatureFlags();
  if (!flags.publicSignupEnabled) {
    return NextResponse.json({ error: "当前暂不支持注册。" }, { status: 403 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请填写有效邮箱，密码至少 8 位。" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const deviceId =
    body.deviceId?.trim() ||
    request.headers.get("x-device-id")?.trim() ||
    null;

  const ipLimit = checkRateLimit(`register:ip:${ip}`, 8, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }
  const emailLimit = checkRateLimit(`register:email:${email}`, 5, 60 * 60 * 1000);
  if (!emailLimit.ok) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }
  if (deviceId) {
    const deviceLimit = checkRateLimit(`register:device:${deviceId}`, 6, 60 * 60 * 1000);
    if (!deviceLimit.ok) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "注册服务暂不可用，请稍后重试。" }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    app_metadata: {
      role: "user",
      membership_status: "inactive",
      membership_plan: null,
      membership_started_at: null,
      membership_expires_at: null,
      pending_payment: null,
      payment_history: [],
      referral_code: null,
      referred_by_code: null,
      referred_by_user_id: null,
    },
  });

  if (error) {
    const msg = error.message || "";
    if (/already|registered|exists/i.test(msg)) {
      return NextResponse.json({ error: "该邮箱已注册，请直接登录。" }, { status: 409 });
    }
    if (/password/i.test(msg)) {
      return NextResponse.json({ error: "密码不符合要求，请使用至少 8 位密码。" }, { status: 400 });
    }
    return NextResponse.json({ error: "注册失败，请稍后重试。" }, { status: 400 });
  }

  const userId = data.user?.id;
  if (userId) {
    try {
      const invite = await ensureReferralInvite(userId);
      await updateUserAppMetadata(userId, { referral_code: invite.invite_code });
    } catch {
      /* invite code can be created later in account */
    }

    if (body.inviteCode?.trim()) {
      const attached = await attachInviteOnRegister({
        inviteeId: userId,
        inviteeEmail: email,
        inviteCode: body.inviteCode,
        deviceId,
      });
      if (!attached.ok) {
        // Account created; surface invite bind failure without rolling back signup.
        return NextResponse.json({
          ok: true,
          email: data.user?.email ?? email,
          message: "账户创建成功，正在登录。",
          inviteWarning: attached.error,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    email: data.user?.email ?? email,
    message: "账户创建成功，正在登录。",
  });
}
