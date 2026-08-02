import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { VIBE_EVIDENCE_SEED } from "@/lib/data/vibe/seed";
import { effectiveVibeWeight } from "@/lib/data/vibe/weights";
import type {
  VibeEvidenceAssetId,
  VibeEvidencePublicView,
  VibeEvidenceSnapshot,
} from "@/types/vibe-evidence";

const BUCKET = "moonx-data";
const FILE = "vibe-evidence.json";

type StorePayload = {
  version: 1;
  updatedAt: string;
  records: VibeEvidenceSnapshot[];
};

async function readOverrides(): Promise<VibeEvidenceSnapshot[]> {
  try {
    const admin = getAdminClient();
    if (!admin) return [];
    const { data, error } = await admin.storage.from(BUCKET).download(FILE);
    if (error || !data) return [];
    const parsed = JSON.parse(await data.text()) as StorePayload;
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch (error) {
    console.error("vibe evidence store unavailable; using built-in seed", error);
    return [];
  }
}

function mergeEvidence(
  seed: VibeEvidenceSnapshot[],
  overrides: VibeEvidenceSnapshot[]
): VibeEvidenceSnapshot[] {
  const byId = new Map(seed.map((item) => [item.assetId, item] as const));
  for (const row of overrides) {
    const prev = byId.get(row.assetId);
    byId.set(row.assetId, prev ? { ...prev, ...row, assetId: prev.assetId } : row);
  }
  return [...byId.values()].sort((a, b) => a.nameZh.localeCompare(b.nameZh, "zh-CN"));
}

export async function listVibeEvidence(): Promise<VibeEvidenceSnapshot[]> {
  return mergeEvidence(VIBE_EVIDENCE_SEED, await readOverrides());
}

export async function getVibeEvidence(
  assetId: string
): Promise<VibeEvidenceSnapshot | null> {
  const rows = await listVibeEvidence();
  return rows.find((row) => row.assetId === assetId) ?? null;
}

export async function writeVibeEvidence(records: VibeEvidenceSnapshot[]): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw new Error(`无法检查Vibe证据存储桶：${listError.message}`);
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error: createError } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`无法创建Vibe证据存储桶：${createError.message}`);
    }
  }
  const payload: StorePayload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records,
  };
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(FILE, JSON.stringify(payload, null, 2), {
      contentType: "application/json",
      upsert: true,
    });
  if (uploadError) throw new Error(`无法保存Vibe证据：${uploadError.message}`);
}

export function toVibePublicView(snapshot: VibeEvidenceSnapshot): VibeEvidencePublicView {
  return {
    assetId: snapshot.assetId,
    symbol: snapshot.symbol,
    nameZh: snapshot.nameZh,
    sourceMode: snapshot.sourceMode,
    sourceLabel: snapshot.sourceLabel,
    effectiveScore: snapshot.effectiveScore,
    stance: snapshot.stance,
    completeness: snapshot.completeness,
    freshness: snapshot.freshness,
    dimensions: snapshot.dimensions,
    supports: snapshot.supports,
    risks: snapshot.risks,
    dataGaps: snapshot.dimensions
      .filter((item) => !item.available)
      .map((item) => `${item.labelZh}数据暂缺`),
    updatedAt: snapshot.updatedAt,
    lastSuccessAt: snapshot.lastSuccessAt,
    dailyWeight: effectiveVibeWeight(snapshot, "daily"),
    weeklyWeight: effectiveVibeWeight(snapshot, "weekly"),
    monthlyWeight: effectiveVibeWeight(snapshot, "monthly"),
  };
}

export async function getVibeEvidenceMap(): Promise<
  Partial<Record<VibeEvidenceAssetId, VibeEvidencePublicView>>
> {
  const rows = await listVibeEvidence();
  return Object.fromEntries(rows.map((row) => [row.assetId, toVibePublicView(row)]));
}
