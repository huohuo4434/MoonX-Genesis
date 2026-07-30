/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { listIChingResearchForAdmin } from "@/lib/iching-research/store";
import { createIChingResearchForAdmin } from "@/lib/iching-research/store";
import { hasPrisma } from "@/lib/prisma";

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

export const dynamic = "force-dynamic";

const querySchema = z.object({
  assetId: z.string().optional(),
  sourceType: z.enum(["MASTER", "INTERNAL"]).optional(),
  researchStatus: z.string().optional(),
  verified: z.enum(["YES", "NO"]).optional(),
  questionQuery: z.string().optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const raw = {
    assetId: req.nextUrl.searchParams.get("assetId") ?? undefined,
    sourceType: req.nextUrl.searchParams.get("sourceType") ?? undefined,
    researchStatus: req.nextUrl.searchParams.get("researchStatus") ?? undefined,
    verified: req.nextUrl.searchParams.get("verified") ?? undefined,
    questionQuery: req.nextUrl.searchParams.get("questionQuery") ?? undefined,
  };

  const q = querySchema.safeParse(raw);
  if (!q.success) return NextResponse.json({ error: q.error.flatten() }, { status: 400 });

  const data = await listIChingResearchForAdmin(q.data);
  return NextResponse.json({ ok: true, data });
}

const researchCreateSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  question: z.string().min(1).max(20000),
  forecastType: z.string().min(1),
  forecastStartAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  forecastEndAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  castAt: z.string().min(1),
  timezone: z.string().optional(),
  sourceType: z.enum(["MASTER", "INTERNAL"]),
  priority: z.enum(["HIGHEST", "HIGH", "NORMAL"]),
  researchStatus: z.string().min(1),

  hexagramName: z.string().min(1),
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

  createdBy: z.string().optional().nullable(),
  updatedBy: z.string().optional().nullable(),

  changeReason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (!hasPrisma()) return NextResponse.json({ error: "未配置数据库" }, { status: 500 });

  const parsed = researchCreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const lineErrs = validateLineDataCompleteness(d.lineData);
  if (lineErrs.length) return NextResponse.json({ error: "lineData 不完整", details: lineErrs.slice(0, 50) }, { status: 400 });

  const maybeCheckDirection = (v: string | null | undefined, key: string) => {
    if (v == null || v === "") return;
    if (!directionAllowed.has(v)) {
      throw new Error(`${key} directionConclusion must use allowed direction words`);
    }
  };
  try {
    maybeCheckDirection(d.directionConclusion, "directionConclusion");
    maybeCheckDirection(d.masterDirectionConclusion, "masterDirectionConclusion");
    maybeCheckDirection(d.internalDirectionConclusion, "internalDirectionConclusion");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const data = await createIChingResearchForAdmin({
    data: {
      id: d.id,
      assetId: d.assetId,
      question: d.question,
      forecastType: d.forecastType,
      forecastStartAt: d.forecastStartAt,
      forecastEndAt: d.forecastEndAt,
      castAt: new Date(d.castAt),
      timezone: d.timezone ?? "Asia/Shanghai",
      sourceType: d.sourceType,
      priority: d.priority,
      researchStatus: d.researchStatus,
      hexagramName: d.hexagramName,
      changedHexagramName: d.changedHexagramName ?? null,
      hexagramSpecialTypes: d.hexagramSpecialTypes ?? [],
      movingLines: d.movingLines ?? [],
      monthStemBranch: d.monthStemBranch ?? null,
      dayStemBranch: d.dayStemBranch ?? null,
      emptyBranches: d.emptyBranches ?? [],
      usefulGod: d.usefulGod ?? null,
      worldLine: d.worldLine ?? null,
      responseLine: d.responseLine ?? null,
      lineData: d.lineData ?? [],

      rawImageUrls: d.rawImageUrls ?? [],
      rawTranscript: d.rawTranscript ?? null,
      masterOriginalAnalysis: d.masterOriginalAnalysis ?? null,
      masterStructuredSummary: d.masterStructuredSummary ?? null,
      internalAnalysis: d.internalAnalysis ?? null,

      analysisSteps: d.analysisSteps ?? [],
      timeWindows: d.timeWindows ?? [],

      pathConclusion: d.pathConclusion ?? null,
      directionConclusion: d.directionConclusion ?? null,
      confidence: d.confidence ?? null,

      masterFinalConclusion: d.masterFinalConclusion ?? null,
      masterConfidence: d.masterConfidence ?? null,
      masterPathConclusion: d.masterPathConclusion ?? null,
      masterDirectionConclusion: d.masterDirectionConclusion ?? null,

      internalFinalConclusion: d.internalFinalConclusion ?? null,
      internalConfidence: d.internalConfidence ?? null,
      internalPathConclusion: d.internalPathConclusion ?? null,
      internalDirectionConclusion: d.internalDirectionConclusion ?? null,

      adoptedSource: d.adoptedSource ?? (d.sourceType ?? "INTERNAL"),
      adoptedResearchId: d.adoptedResearchId ?? null,
      masterOverride: d.masterOverride ?? (d.sourceType === "INTERNAL"),
      knowledgeVersion: d.knowledgeVersion ?? null,
      version: d.version ?? 1,

      createdBy: d.createdBy ?? "admin",
      updatedBy: d.updatedBy ?? "admin",
    },
  });

  return NextResponse.json({ ok: true, data });
}

