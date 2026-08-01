/**
 * Conviction asset store — seed + optional admin overrides in moonx-data.
 */
import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { CONVICTION_ASSET_SEED, CONVICTION_ASSETS_MAX } from "@/lib/data/conviction/seed";
import type { ConvictionAsset, ConvictionPublicCard } from "@/types/conviction-asset";

const BUCKET = "moonx-data";
const FILE = "conviction-assets.json";

type Store = { version: 1; updatedAt: string; records: ConvictionAsset[] };

async function readOverrides(): Promise<ConvictionAsset[]> {
  try {
    const admin = getAdminClient();
    if (!admin) return [];
    const { data, error } = await admin.storage.from(BUCKET).download(FILE);
    if (error || !data) return [];
    const parsed = JSON.parse(await data.text()) as Store;
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch (error) {
    console.error("conviction override store unavailable; using built-in research", error);
    return [];
  }
}

export async function writeConvictionAssets(records: ConvictionAsset[]): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
  }
  const body: Store = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: records.slice(0, CONVICTION_ASSETS_MAX),
  };
  await admin.storage.from(BUCKET).upload(FILE, JSON.stringify(body, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
}

function mergeAssets(seed: ConvictionAsset[], overrides: ConvictionAsset[]): ConvictionAsset[] {
  const byId = new Map(seed.map((a) => [a.id, { ...a }]));
  for (const o of overrides) {
    const prev = byId.get(o.id);
    byId.set(o.id, prev ? { ...prev, ...o, id: prev.id, slug: o.slug || prev.slug } : o);
  }
  return [...byId.values()]
    .filter((a) => a.isPublished && a.status === "published")
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, CONVICTION_ASSETS_MAX);
}

export async function listConvictionAssets(): Promise<ConvictionAsset[]> {
  const overrides = await readOverrides();
  return mergeAssets(CONVICTION_ASSET_SEED, overrides);
}

/** Admin sees drafts too when listing for management. */
export async function listConvictionAssetsForAdmin(): Promise<ConvictionAsset[]> {
  const overrides = await readOverrides();
  const byId = new Map(CONVICTION_ASSET_SEED.map((a) => [a.id, { ...a }]));
  for (const o of overrides) {
    const prev = byId.get(o.id);
    byId.set(o.id, prev ? { ...prev, ...o } : o);
  }
  return [...byId.values()].sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getConvictionAssetBySlug(slug: string): Promise<ConvictionAsset | null> {
  const all = await listConvictionAssets();
  const key = slug.trim().toLowerCase();
  return (
    all.find((a) => a.slug === key || a.id === key || a.symbol.toLowerCase() === key) ?? null
  );
}

export function toPublicCard(asset: ConvictionAsset): ConvictionPublicCard {
  return {
    id: asset.id,
    slug: asset.slug,
    assetType: asset.assetType,
    nameZh: asset.nameZh,
    nameEn: asset.nameEn,
    aliasZh: asset.aliasZh,
    symbol: asset.symbol,
    exchange: asset.exchange ?? null,
    network: asset.network ?? null,
    contractAddress: asset.contractPendingAdminConfirm ? null : asset.contractAddress ?? null,
    contractPendingAdminConfirm: asset.contractPendingAdminConfirm,
    riskLevel: asset.riskLevel,
    rating: asset.rating,
    tags: asset.tags,
    summaryZh: asset.summaryZh,
    summaryEn: asset.summaryEn,
    thesisZh: asset.thesisZh,
    thesisEn: asset.thesisEn,
    catalystsZh: asset.catalystsZh,
    catalystsEn: asset.catalystsEn,
    risksZh: asset.risksZh,
    risksEn: asset.risksEn,
    marketCap: asset.marketCap ?? null,
    marketCapCurrency: asset.marketCapCurrency ?? null,
    marketCapUpdatedAt: asset.marketCapUpdatedAt ?? null,
    researchUpdatedAt: asset.researchUpdatedAt,
    researchStatusZh: "持续跟踪",
    researchStatusEn: "Active tracking",
    detailHref: `/featured-stocks/${asset.slug}`,
  };
}

export async function listPublicConvictionCards(): Promise<ConvictionPublicCard[]> {
  const assets = await listConvictionAssets();
  return assets.map(toPublicCard);
}

export { formatMarketCapDisplay } from "@/lib/data/conviction/format-market-cap";
