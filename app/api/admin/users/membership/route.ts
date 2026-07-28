import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  computeNewExpiry,
  PLAN_DAYS,
  requireAdmin,
  updateUserAppMetadata,
  type MembershipPlan,
} from "@/lib/auth/permissions";
import { getAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  userId: z.string().uuid(),
  action: z.enum([
    "activate_monthly",
    "activate_quarterly",
    "activate_yearly",
    "suspend",
    "cancel",
  ]),
});

const ACTION_PLAN: Record<string, MembershipPlan | null> = {
  activate_monthly: "MONTHLY",
  activate_quarterly: "QUARTERLY",
  activate_yearly: "YEARLY",
  suspend: null,
  cancel: null,
};

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "服务未配置" }, { status: 503 });

  const { data, error } = await admin.auth.admin.getUserById(body.userId);
  if (error || !data.user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const role = (data.user.app_metadata as { role?: string } | undefined)?.role;
  if (role === "admin") {
    return NextResponse.json({ error: "不能修改管理员账户" }, { status: 400 });
  }

  if (body.action === "suspend" || body.action === "cancel") {
    await updateUserAppMetadata(body.userId, {
      role: "user",
      membership_status: body.action === "suspend" ? "expired" : "inactive",
      membership_plan: null,
      membership_expires_at: null,
      pending_payment: null,
    });
    return NextResponse.json({ ok: true });
  }

  const plan = ACTION_PLAN[body.action]!;
  const days = PLAN_DAYS[plan];
  const prevExpires = (data.user.app_metadata as { membership_expires_at?: string } | undefined)
    ?.membership_expires_at;
  const prevStarted = (data.user.app_metadata as { membership_started_at?: string } | undefined)
    ?.membership_started_at;
  const expiresAt = computeNewExpiry(prevExpires, days);

  await updateUserAppMetadata(body.userId, {
    role: "user",
    membership_status: "active",
    membership_plan: plan,
    membership_started_at: prevStarted ?? new Date().toISOString(),
    membership_expires_at: expiresAt,
    pending_payment: null,
  });

  return NextResponse.json({ ok: true, membershipExpiresAt: expiresAt, plan });
}
