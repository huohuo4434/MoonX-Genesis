/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (!prisma) return NextResponse.json({ error: "未配置数据库" }, { status: 500 });

  const raw = {
    status: req.nextUrl.searchParams.get("status") ?? undefined,
    category: req.nextUrl.searchParams.get("category") ?? undefined,
    q: req.nextUrl.searchParams.get("q") ?? undefined,
  };
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const where: any = {};
  if (parsed.data.status) where.status = parsed.data.status;
  if (parsed.data.category) where.category = parsed.data.category;
  if (parsed.data.q && parsed.data.q.trim()) {
    where.OR = [
      { ruleCode: { contains: parsed.data.q.trim(), mode: "insensitive" } },
      { title: { contains: parsed.data.q.trim(), mode: "insensitive" } },
      { ruleText: { contains: parsed.data.q.trim(), mode: "insensitive" } },
      { teacherOriginalText: { contains: parsed.data.q.trim(), mode: "insensitive" } },
    ];
  }

  const data = await prisma.masterRule.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, data });
}

const createSchema = z.object({
  ruleCode: z.string().min(1),
  title: z.string().min(1).max(200),
  category: z.string().min(1),
  ruleText: z.string().min(1).max(50000),
  teacherOriginalText: z.string().min(1).max(50000).optional().nullable(),
  structuredLogic: z.any().optional().nullable(),
  applicableMarkets: z.any().optional().nullable(),
  applicableForecastTypes: z.any().optional().nullable(),
  priority: z.number().int().min(1).max(100).optional(),
  confidence: z.number().int().min(0).max(100).optional().nullable(),
  status: z.string().optional(),
  sourceResearchId: z.string().optional().nullable(),
  supersedesRuleId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (!prisma) return NextResponse.json({ error: "未配置数据库" }, { status: 500 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const created = await prisma.masterRule.create({
    data: {
      id: `mrule-${d.ruleCode}`,
      ruleCode: d.ruleCode,
      title: d.title,
      category: d.category,
      ruleText: d.ruleText,
      teacherOriginalText: d.teacherOriginalText ?? null,
      structuredLogic: d.structuredLogic ?? null,
      applicableMarkets: d.applicableMarkets ?? null,
      applicableForecastTypes: d.applicableForecastTypes ?? null,
      priority: d.priority ?? 50,
      confidence: d.confidence ?? null,
      status: d.status ?? "DRAFT",
      sourceResearchId: d.sourceResearchId ?? null,
      supersedesRuleId: d.supersedesRuleId ?? null,
    },
  });

  return NextResponse.json({ ok: true, created });
}

