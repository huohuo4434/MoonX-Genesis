import { NextResponse } from "next/server";
import { getWaveRanking } from "@/lib/wave/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getWaveRanking();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load wave ranking" },
      { status: 500 }
    );
  }
}
