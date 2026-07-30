import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!prisma) {
    return NextResponse.json(
      { ok: true, summary: { sampleSize: 0, full: 0, partial: 0, miss: 0, weightedAccuracy: null }, data: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  const rows = await prisma.weeklyVerificationRecord.findMany({ orderBy: [{ weekEnd: "desc" }, { symbol: "asc" }] });
  const eligible = rows.filter((r) => !["PENDING", "UNVERIFIABLE"].includes(r.result));
  const full = eligible.filter((r) => r.result === "FULL_HIT").length;
  const partial = eligible.filter((r) => r.result === "PARTIAL_HIT").length;
  const weightedAccuracy = eligible.length ? Math.round(((full + partial * 0.5) / eligible.length) * 1000) / 10 : null;
  return NextResponse.json({
    ok: true,
    summary: { sampleSize: eligible.length, full, partial, miss: eligible.length - full - partial, weightedAccuracy },
    data: rows,
  }, { headers: { "Cache-Control": "no-store" } });
}
