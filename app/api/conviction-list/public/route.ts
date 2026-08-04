import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { listPublicConvictionCards } from "@/lib/data/conviction/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public conviction list — fundamentals only, no forecast fields. */
export async function GET() {
  noStore();
  const cards = await listPublicConvictionCards();
  return NextResponse.json(
    {
      titleZh: "MOOX 重点关注",
      titleEn: "MOOX Research Watchlist",
      trackedCount: cards.length,
      assets: cards,
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
