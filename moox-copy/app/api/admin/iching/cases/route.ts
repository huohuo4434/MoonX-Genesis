/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  researchId: z.string().optional(),
  assetId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (!prisma) return NextResponse.json({ error: "未配置数据库" }, { status: 500 });

  const parsed = querySchema.safeParse({
    researchId: req.nextUrl.searchParams.get("researchId") ?? undefined,
    assetId: req.nextUrl.searchParams.get("assetId") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const where: any = {};
  if (parsed.data.researchId) where.researchId = parsed.data.researchId;
  if (parsed.data.assetId) where.assetId = parsed.data.assetId;

  const data = await prisma.masterCase.findMany({
    where,
    orderBy: { forecastStartAt: "desc" },
  });
  return NextResponse.json({ ok: true, data });
}

const createSchema = z.object({
  id: z.string().min(1),
  researchId: z.string().min(1),
  caseTitle: z.string().min(1).max(300),
  assetId: z.string().min(1),
  forecastStartAt: z.string().min(1),
  forecastEndAt: z.string().min(1),
  teacherConclusion: z.string().optional().nullable(),
  actualResult: z.string().optional().nullable(),
  validationScore: z.number().int().optional().nullable(),
  validationStatus: z.string().optional().nullable(),
  lessons: z.string().optional().nullable(),
  createdAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (!prisma) return NextResponse.json({ error: "未配置数据库" }, { status: 500 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const created = await prisma.masterCase.create({
    data: {
      id: d.id,
      researchId: d.researchId,
      caseTitle: d.caseTitle,
      assetId: d.assetId,
      forecastStartAt: d.forecastStartAt,
      forecastEndAt: d.forecastEndAt,
      teacherConclusion: d.teacherConclusion ?? null,
      actualResult: d.actualResult ?? null,
      validationScore: d.validationScore ?? null,
      validationStatus: d.validationStatus ?? null,
      lessons: d.lessons ?? null,
    },
  });
  return NextResponse.json({ ok: true, created });
}

