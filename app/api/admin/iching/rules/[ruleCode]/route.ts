import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).optional(),
  ruleText: z.string().min(1).max(50000).optional(),
  teacherOriginalText: z.string().max(50000).optional().nullable(),
  structuredLogic: z.any().optional().nullable(),
  applicableMarkets: z.any().optional().nullable(),
  applicableForecastTypes: z.any().optional().nullable(),
  priority: z.number().int().min(1).max(100).optional(),
  confidence: z.number().int().min(0).max(100).optional().nullable(),
  status: z.string().optional(),
  sourceResearchId: z.string().optional().nullable(),
  supersedesRuleId: z.string().optional().nullable(),
  updatedBy: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ ruleCode: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (!prisma) return NextResponse.json({ error: "未配置数据库" }, { status: 500 });
  const ruleCode = (await ctx.params).ruleCode;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.masterRule.update({
    where: { ruleCode },
    data: {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
      ...(parsed.data.ruleText ? { ruleText: parsed.data.ruleText } : {}),
      ...(parsed.data.teacherOriginalText !== undefined ? { teacherOriginalText: parsed.data.teacherOriginalText } : {}),
      ...(parsed.data.structuredLogic !== undefined ? { structuredLogic: parsed.data.structuredLogic } : {}),
      ...(parsed.data.applicableMarkets !== undefined ? { applicableMarkets: parsed.data.applicableMarkets } : {}),
      ...(parsed.data.applicableForecastTypes !== undefined ? { applicableForecastTypes: parsed.data.applicableForecastTypes } : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.confidence !== undefined ? { confidence: parsed.data.confidence } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.sourceResearchId !== undefined ? { sourceResearchId: parsed.data.sourceResearchId } : {}),
      ...(parsed.data.supersedesRuleId !== undefined ? { supersedesRuleId: parsed.data.supersedesRuleId } : {}),
      ...(parsed.data.updatedBy !== undefined ? { updatedBy: parsed.data.updatedBy } : {}),
    },
  });

  return NextResponse.json({ ok: true, updated });
}

