import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/membership";
import { writeAuditLog } from "@/lib/payments/orders";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["reject", "manual_review", "mark_paid"]),
  note: z.string().optional(),
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

  const statusMap = {
    reject: "rejected",
    manual_review: "manual_review",
    mark_paid: "paid",
  } as const;

  const { error } = await admin
    .from("payment_orders")
    .update({
      status: statusMap[body.action],
      verification_error: body.note ?? null,
    })
    .eq("id", body.orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    orderId: body.orderId,
    action: `admin_${body.action}`,
    result: "success",
    message: body.note,
  });

  return NextResponse.json({ success: true });
}
