import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { monitorTradeSignal } from "@/lib/trading-signals/v2-store";

const schema = z.object({
  price: z.number().positive(),
  confirmed: z.boolean().default(false),
  execute: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    return NextResponse.json({
      ok: true,
      result: await monitorTradeSignal({ signalId: id, ...body }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "监控失败" },
      { status: 400 }
    );
  }
}
