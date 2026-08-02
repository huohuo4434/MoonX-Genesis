import { NextResponse, type NextRequest } from "next/server";
import { refreshVibeEvidence, testVibeConnection } from "@/lib/data/vibe/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await testVibeConnection();
  if (!connection.configured || !connection.healthy) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: connection.error,
      connection,
    });
  }

  try {
    const result = await refreshVibeEvidence();
    return NextResponse.json({
      ok: true,
      refreshed: result.refreshed.map((item) => ({
        assetId: item.assetId,
        score: item.effectiveScore,
        completeness: item.completeness,
      })),
      connection,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vibe cron failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
