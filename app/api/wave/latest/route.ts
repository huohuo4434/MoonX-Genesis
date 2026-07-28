import { NextRequest, NextResponse } from "next/server";
import { getLatestWavePredictions } from "@/lib/wave/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  try {
    const data = await getLatestWavePredictions(limit);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load wave predictions" },
      { status: 500 }
    );
  }
}
