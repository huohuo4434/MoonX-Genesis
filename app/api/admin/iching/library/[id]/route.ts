/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { getIChingResearchByIdForAdmin, updateIChingResearchWithVersionForAdmin } from "@/lib/iching-research/store";

const directionAllowed = new Set([
  "上涨",
  "下跌",
  "震荡",
  "震荡上涨",
  "震荡下跌",
  "先涨后跌",
  "先跌后涨",
  "冲高回落",
  "探底回升",
]);

function validateLineDataCompleteness(lineData: unknown): string[] {
  const requiredKeys = [
    "linePosition",
    "sixGod",
    "relation",
    "earthlyBranch",
    "fiveElement",
    "isWorld",
    "isResponse",
    "isMoving",
    "changedRelation",
    "changedBranch",
    "changedElement",
    "hiddenSpirit",
    "flyingSpirit",
    "isMonthBroken",
    "isDayBroken",
    "isEmpty",
    "isTomb",
    "isAdvance",
    "isRetreat",
    "isReturnGenerate",
    "isReturnOvercome",
    "notes",
  ];
  if (lineData == null) return [];
  if (!Array.isArray(lineData)) return ["lineData must be an array"];
  const errs: string[] = [];
  for (let i = 0; i < lineData.length; i++) {
    const line = lineData[i];
    if (!line || typeof line !== "object") {
      errs.push(`lineData[${i}] must be object`);
      continue;
    }
    for (const k of requiredKeys) {
      if (!(k in (line as any))) errs.push(`lineData[${i}] missing key: ${k}`);
    }
  }
  return errs;
}

const patchSchema = z.object({
  changeReason: z.string().min(1).max(5000),

  assetId: z.string().optional(),
  question: z.string().optional(),
  forecastType: z.string().optional(),
  forecastStartAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  forecastEndAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  castAt: z.string().optional(),
  timezone: z.string().optional(),
  sourceType: z.enum(["MASTER", "INTERNAL"]).optional(),
  priority: z.enum(["HIGHEST", "HIGH", "NORMAL"]).optional(),
  researchStatus: z.string().optional(),

  hexagramName: z.string().optional(),
  changedHexagramName: z.string().nullable().optional(),
  hexagramSpecialTypes: z.array(z.string()).optional().nullable(),
  movingLines: z.array(z.number().int().min(1).max(6)).optional().nullable(),

  monthStemBranch: z.string().optional().nullable(),
  dayStemBranch: z.string().optional().nullable(),
  emptyBranches: z.any().optional().nullable(),
  usefulGod: z.string().optional().nullable(),
  worldLine: z.any().optional().nullable(),
  responseLine: z.any().optional().nullable(),
  lineData: z.any().optional().nullable(),

  rawImageUrls: z.any().optional().nullable(),
  rawTranscript: z.string().optional().nullable(),
  masterOriginalAnalysis: z.string().optional().nullable(),
  masterStructuredSummary: z.string().optional().nullable(),
  internalAnalysis: z.string().optional().nullable(),
  analysisSteps: z.any().optional().nullable(),
  timeWindows: z.any().optional().nullable(),

  pathConclusion: z.string().optional().nullable(),
  directionConclusion: z.string().optional().nullable(),
  confidence: z.number().int().min(0).max(100).optional().nullable(),

  masterFinalConclusion: z.string().optional().nullable(),
  masterConfidence: z.number().int().min(0).max(100).optional().nullable(),
  masterPathConclusion: z.string().optional().nullable(),
  masterDirectionConclusion: z.string().optional().nullable(),

  internalFinalConclusion: z.string().optional().nullable(),
  internalConfidence: z.number().int().min(0).max(100).optional().nullable(),
  internalPathConclusion: z.string().optional().nullable(),
  internalDirectionConclusion: z.string().optional().nullable(),

  adoptedSource: z.string().optional(),
  adoptedResearchId: z.string().nullable().optional(),
  masterOverride: z.boolean().optional(),
  knowledgeVersion: z.string().optional().nullable(),
  version: z.number().int().min(1).optional(),

  changedBy: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const id = (await ctx.params).id;
  const data = await getIChingResearchByIdForAdmin(id);
  if (!data) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const id = (await ctx.params).id;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const lineErrs = validateLineDataCompleteness(d.lineData);
  if (lineErrs.length) return NextResponse.json({ error: "lineData 不完整", details: lineErrs.slice(0, 50) }, { status: 400 });

  const maybeCheckDirection = (v: string | null | undefined, key: string) => {
    if (!v) return;
    if (!directionAllowed.has(v)) throw new Error(`${key} directionConclusion must use allowed direction words`);
  };
  try {
    maybeCheckDirection(d.directionConclusion, "directionConclusion");
    maybeCheckDirection(d.masterDirectionConclusion, "masterDirectionConclusion");
    maybeCheckDirection(d.internalDirectionConclusion, "internalDirectionConclusion");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const patch: any = { ...d };
  delete patch.changeReason;
  delete patch.changedBy;

  if (typeof patch.castAt === "string") {
    patch.castAt = new Date(patch.castAt);
  }

  const updated = await updateIChingResearchWithVersionForAdmin({
    researchId: id,
    patch,
    changedBy: d.changedBy ?? null,
    changeReason: d.changeReason,
  });

  return NextResponse.json({ ok: true, data: updated });
}

