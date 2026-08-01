import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { performSignalAction } from "@/lib/trading-signals/v2-store";

const schema = z.object({
  action: z.enum([
    "PUBLISH",
    "ARM",
    "TRIGGER",
    "ENTER",
    "TARGET1",
    "TARGET2",
    "TARGET3",
    "MOVE_STOP_BREAKEVEN",
    "STOP",
    "CLOSE",
    "CANCEL",
  ]),
  price: z.number().positive().nullable().optional(),
  note: z.string().max(1000).optional(),
  confirmed: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    await performSignalAction({ signalId: id, ...body });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "执行失败" },
      { status: 400 }
    );
  }
}
