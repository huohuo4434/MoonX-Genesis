import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  createTradeSignal,
  getTradeSignalDashboardSnapshot,
} from "@/lib/trading-signals/store";

const methodSchema = z.object({
  method: z.string().min(1).max(80),
  direction: z.enum(["LONG", "SHORT", "NEUTRAL"]),
  weight: z.number().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  evidence: z.string().max(2000).default(""),
});

const createSchema = z.object({
  assetId: z.string().min(1).max(100),
  symbol: z.string().min(1).max(40),
  assetName: z.string().min(1).max(100),
  market: z.string().max(80).default(""),
  timeframe: z.string().min(1).max(20).default("1D"),
  direction: z.enum(["LONG", "SHORT", "NEUTRAL"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARMED"]).default("DRAFT"),
  starLevel: z.number().int().min(1).max(5),
  consensusScore: z.number().int().min(0).max(100),
  entryMode: z.enum(["BUY_ZONE", "BREAKOUT", "PULLBACK", "MARKET", "MANUAL"]),
  entryLow: z.number().positive().nullable().optional(),
  entryHigh: z.number().positive().nullable().optional(),
  triggerPrice: z.number().positive().nullable().optional(),
  stopLoss: z.number().positive().nullable().optional(),
  stopConfirmTimeframe: z.string().min(1).max(20).default("4H"),
  target1: z.number().positive().nullable().optional(),
  target2: z.number().positive().nullable().optional(),
  target3: z.number().positive().nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  notionalAmount: z.number().positive().nullable().optional(),
  positionSizePct: z.number().int().min(0).max(100).nullable().optional(),
  maxRiskPct: z.number().min(0).max(100).nullable().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().nullable().optional(),
  rationale: z.string().max(5000).default(""),
  executionPlan: z.string().max(5000).default(""),
  invalidation: z.string().max(3000).default(""),
  sourceForecastId: z.string().max(200).nullable().optional(),
  apiVisible: z.boolean().default(false),
  paperOnly: z.literal(true).default(true),
  methods: z.array(methodSchema).max(12).default([]),
});

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "无权限" }, { status: 403 });
  return NextResponse.json(await getTradeSignalDashboardSnapshot());
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const body = createSchema.parse(await request.json());
    const requestedStatus = body.status;
    const signal = await createTradeSignal({
      ...body,
      status: "DRAFT",
      apiVisible: false,
      paperOnly: true,
      createdBy: user.email,
    });
    return NextResponse.json({
      ok: true,
      signal,
      forcedDraft: requestedStatus !== "DRAFT",
      message:
        requestedStatus === "DRAFT"
          ? "草稿已保存"
          : "为防止绕过风控，信号已保存为草稿；请到量化交易终端审核发布。",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
  }
}
