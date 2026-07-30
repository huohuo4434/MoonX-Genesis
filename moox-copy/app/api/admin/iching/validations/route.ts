/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  researchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (!prisma) return NextResponse.json({ error: "未配置数据库" }, { status: 500 });

  const parsed = querySchema.safeParse({
    researchId: req.nextUrl.searchParams.get("researchId") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const where: any = {};
  if (parsed.data.researchId) where.researchId = parsed.data.researchId;

  const data = await prisma.iChingValidation.findMany({
    where,
    orderBy: { verifiedAt: "desc" },
  });
  return NextResponse.json({ ok: true, data });
}

const createSchema = z.object({
  id: z.string().min(1),
  researchId: z.string().min(1),
  actualDirection: z.string().optional().nullable(),
  actualOpen: z.number().optional().nullable(),
  actualHigh: z.number().optional().nullable(),
  actualLow: z.number().optional().nullable(),
  actualClose: z.number().optional().nullable(),
  actualPath: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
  directionScore: z.number().int().optional().nullable(),
  pathScore: z.number().int().optional().nullable(),
  timingScore: z.number().int().optional().nullable(),
  levelScore: z.number().int().optional().nullable(),
  totalScore: z.number().int().optional().nullable(),
  validationNotes: z.string().optional().nullable(),
  verifiedBy: z.string().optional().nullable(),
  verifiedAt: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (!prisma) return NextResponse.json({ error: "未配置数据库" }, { status: 500 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const created = await prisma.iChingValidation.create({
    data: {
      id: d.id,
      researchId: d.researchId,
      actualDirection: d.actualDirection ?? null,
      actualOpen: d.actualOpen ?? null,
      actualHigh: d.actualHigh ?? null,
      actualLow: d.actualLow ?? null,
      actualClose: d.actualClose ?? null,
      actualPath: d.actualPath ?? null,
      result: d.result ?? null,
      directionScore: d.directionScore ?? null,
      pathScore: d.pathScore ?? null,
      timingScore: d.timingScore ?? null,
      levelScore: d.levelScore ?? null,
      totalScore: d.totalScore ?? null,
      validationNotes: d.validationNotes ?? null,
      verifiedBy: d.verifiedBy ?? null,
      verifiedAt: d.verifiedAt ? new Date(d.verifiedAt) : null,
    },
  });

  return NextResponse.json({ ok: true, created });
}

