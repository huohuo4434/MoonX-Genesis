import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeWaveAdmin } from "@/lib/wave/auth";
import { validateWavePrediction } from "@/lib/wave/service";

export const dynamic = "force-dynamic";

const schema = z.object({
  predictionId: z.string().min(1),
  status: z.enum(["HIT", "PARTIAL", "FAILED", "EXPIRED"]),
  rewardRisk: z.number().nullable().optional(),
  validationNote: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await authorizeWaveAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await validateWavePrediction(parsed.data);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Prediction not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data });
}
