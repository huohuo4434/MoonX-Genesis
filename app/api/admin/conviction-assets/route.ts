import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  listConvictionAssetsForAdmin,
  writeConvictionAssets,
} from "@/lib/data/conviction/store";
import { CONVICTION_ASSET_SEED } from "@/lib/data/conviction/seed";
import type { ConvictionAsset } from "@/types/conviction-asset";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const assets = await listConvictionAssetsForAdmin();
  return NextResponse.json({ assets }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  noStore();
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const body = (await req.json()) as { asset?: Partial<ConvictionAsset> & { id: string } };
  if (!body.asset?.id) {
    return NextResponse.json({ error: "asset.id required" }, { status: 400 });
  }
  const current = await listConvictionAssetsForAdmin();
  const idx = current.findIndex((a) => a.id === body.asset!.id);
  const base =
    idx >= 0
      ? current[idx]!
      : CONVICTION_ASSET_SEED.find((a) => a.id === body.asset!.id);
  if (!base) {
    return NextResponse.json({ error: "Unknown asset" }, { status: 404 });
  }
  const next: ConvictionAsset = {
    ...base,
    ...body.asset,
    id: base.id,
    slug: body.asset.slug || base.slug,
  };
  const merged = idx >= 0 ? current.map((a, i) => (i === idx ? next : a)) : [...current, next];
  await writeConvictionAssets(merged);
  return NextResponse.json({ ok: true, asset: next }, { headers: { "Cache-Control": "no-store" } });
}
