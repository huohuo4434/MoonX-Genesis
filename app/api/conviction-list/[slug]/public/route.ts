import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getConvictionAssetBySlug, toPublicCard } from "@/lib/data/conviction/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public asset detail — never includes directions / levels / probabilities. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  noStore();
  const { slug } = await ctx.params;
  const asset = await getConvictionAssetBySlug(slug);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { asset: toPublicCard(asset) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
