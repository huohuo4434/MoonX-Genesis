import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/membership";
import { writeAuditLog } from "@/lib/payments/orders";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["extend", "suspend", "restore", "grant"]),
  days: z.number().int().positive().optional(),
});

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "数据库未配置" }, { status: 503 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }

  const { data: profile } = await admin.from("profiles").select("*").eq("id", body.userId).maybeSingle();
  if (!profile) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (profile.role === "admin") {
    return NextResponse.json({ error: "不能修改管理员账户会员状态" }, { status: 400 });
  }

  if (body.action === "suspend") {
    await admin.from("profiles").update({ membership_status: "suspended" }).eq("id", body.userId);
    await writeAuditLog({ action: "admin_suspend_member", result: "success", message: body.userId });
    return NextResponse.json({ success: true });
  }

  if (body.action === "restore" || body.action === "grant") {
    const days = body.days ?? 30;
    const now = new Date();
    const current = profile.membership_expires_at
      ? new Date(profile.membership_expires_at as string)
      : null;
    const base =
      current && current.getTime() > now.getTime() ? current : now;
    base.setDate(base.getDate() + days);
    const expiresIso = base.toISOString();

    await admin
      .from("profiles")
      .update({
        membership_status: "active",
        role: profile.role === "user" ? "member" : profile.role,
        membership_started_at: profile.membership_started_at ?? now.toISOString(),
        membership_expires_at: expiresIso,
      })
      .eq("id", body.userId);

    await admin.from("subscription_events").insert({
      user_id: body.userId,
      event_type: body.action === "grant" ? "admin_grant" : "admin_restore",
      previous_expires_at: profile.membership_expires_at,
      new_expires_at: expiresIso,
      note: `Admin ${body.action} +${days}d`,
    });

    await writeAuditLog({
      action: `admin_${body.action}`,
      result: "success",
      message: `${body.userId} until ${expiresIso}`,
    });
    return NextResponse.json({ success: true, membershipExpiresAt: expiresIso });
  }

  if (body.action === "extend") {
    const days = body.days ?? 30;
    const current = profile.membership_expires_at
      ? new Date(profile.membership_expires_at as string)
      : new Date();
    current.setDate(current.getDate() + days);
    const expiresIso = current.toISOString();
    await admin
      .from("profiles")
      .update({ membership_status: "active", membership_expires_at: expiresIso })
      .eq("id", body.userId);
    await writeAuditLog({
      action: "admin_extend",
      result: "success",
      message: `${body.userId} +${days}d`,
    });
    return NextResponse.json({ success: true, membershipExpiresAt: expiresIso });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
