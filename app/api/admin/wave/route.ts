import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeWaveAdmin } from "@/lib/wave/auth";
import { getLatestWavePredictions, upsertWavePrediction } from "@/lib/wave/service";

export const dynamic = "force-dynamic";

const schema = z.object({
  analystSlug: z.string().min(2),
  analystName: z.string().min(2),
  source: z.string().optional(),
  marketCode: z.string().min(1),
  marketName: z.string().min(1),
  timeframe: z.string().default("1D"),
  publishedAt: z.string().min(1),
  validUntil: z.string().min(1).nullable().optional(),
  direction: z.enum([
    "UP",
    "DOWN",
    "SIDEWAYS",
    "UP_AFTER_PULLBACK",
    "DOWN_AFTER_REBOUND",
    "REBOUND",
    "PULLBACK",
  ]),
  summary: z.string().min(2),
  waveLabel: z.string().nullable().optional(),
  supportLevels: z.array(z.number()).default([]),
  resistanceLevels: z.array(z.number()).default([]),
  targetLevels: z.array(z.number()).default([]),
  invalidationLevel: z.number().nullable().optional(),
  confirmationLevel: z.number().nullable().optional(),
  expectedPath: z.array(z.string()).default([]),
  sourceImageUrl: z.string().url().nullable().optional(),
  rawText: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  if (!(await authorizeWaveAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
  const data = await getLatestWavePredictions(limit);
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  if (!(await authorizeWaveAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await upsertWavePrediction(parsed.data);
  return NextResponse.json({ ok: true, data });
}
