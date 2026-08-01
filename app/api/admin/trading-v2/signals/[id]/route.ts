import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { updateSignalDraftPlan } from "@/lib/trading-signals/v2-store";

const nullablePositive = z.number().positive().nullable();
const schema = z.object({
  entryMode: z.enum(["BUY_ZONE", "BREAKOUT", "PULLBACK", "MARKET", "MANUAL"]),
  entryLow: nullablePositive,
  entryHigh: nullablePositive,
  triggerPrice: nullablePositive,
  stopLoss: nullablePositive,
  stopConfirmTimeframe: z.string().min(1).max(20),
  target1: nullablePositive,
  target2: nullablePositive,
  target3: nullablePositive,
  starLevel: z.number().int().min(1).max(5),
  consensusScore: z.number().int().min(0).max(100),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().nullable(),
  rationale: z.string().max(5000),
  executionPlan: z.string().max(5000),
  invalidation: z.string().max(3000),
  revisionReason: z.string().max(1000).default("管理员修订交易计划"),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const { revisionReason, ...plan } = body;
    return NextResponse.json({
      ok: true,
      result: await updateSignalDraftPlan(id, plan, revisionReason),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
  }
}
