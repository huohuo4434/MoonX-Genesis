import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { confirmLegacyBitgetOrderErrorsReconciled } from "@/lib/bitget/legacy-order-reconciliation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ confirmation: z.string().trim().min(1).max(100) });

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    const result = await confirmLegacyBitgetOrderErrorsReconciled({
      confirmation: input.confirmation,
      admin: { id: admin.id, email: admin.email },
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "旧版记录人工确认失败" }, { status: 409 });
  }
}
