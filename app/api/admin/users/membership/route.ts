import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  grantMembershipFromPlan,
  revokeMembership,
} from "@/lib/auth/grant-membership";
import { getCurrentUser, requireAdmin, type MembershipPlan } from "@/lib/auth/permissions";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  userId: z.string().uuid(),
  action: z.enum([
    "activate_monthly",
    "activate_quarterly",
    "activate_yearly",
    "suspend",
    "cancel",
  ]),
  requestId: z.string().uuid(),
  reason: z.string().trim().min(4).max(300),
  confirmed: z.literal(true),
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

  const operator = await getCurrentUser();

  if (body.action === "suspend" || body.action === "cancel") {
    const result = await revokeMembership({
      userId: body.userId,
      sourceId: `admin_${body.action}_${body.requestId}`,
      operatorId: operator?.id ?? null,
      note: `${body.action}; reason=${body.reason}`,
      mode: body.action,
    });
    return NextResponse.json({ ok: true, ...result });
  }

  const plan = ACTION_PLAN[body.action]!;
  const result = await grantMembershipFromPlan({
    userId: body.userId,
    plan,
    eventType: "ADMIN_ADJUSTMENT",
    source: "admin_grant",
    sourceId: `admin_${body.action}_${body.requestId}`,
    operatorId: operator?.id ?? null,
    note: `${body.action}; reason=${body.reason}`,
  });

  return NextResponse.json({
    ok: true,
    membershipExpiresAt: result.newExpiresAt,
    plan,
    ...result,
  });
}
