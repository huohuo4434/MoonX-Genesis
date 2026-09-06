import "server-only";
import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import type { DailyProjectionData } from "./daily-candle-projection-core";

export const PROJECTION_BUCKET = "moox-private-daily-charts";
export function projectionArchiveId(data: DailyProjectionData) {
  const hash = createHash("sha256").update(JSON.stringify({ engine: data.engine, bars: data.bars,
    sources: data.projections.map(p => [p.sourceId, p.sourceVersion, p.windows, p.direction]) })).digest("hex").slice(0, 24);
  return `${data.assetId}/${data.projectionDate}-${hash}.json`;
}
export async function ensureProjectionBucket() {
  const admin = getAdminClient();
  if (!admin) throw new Error("PROJECTION_STORAGE_UNAVAILABLE");
  const { data, error } = await admin.storage.getBucket(PROJECTION_BUCKET);
  if (data?.public) throw new Error("PROJECTION_BUCKET_MUST_BE_PRIVATE");
  if (data) return;
  if (error && !["404", "400"].includes(String(error.statusCode))) throw new Error("PROJECTION_STORAGE_UNAVAILABLE");
  const result = await admin.storage.createBucket(PROJECTION_BUCKET, { public: false, fileSizeLimit: 1024 * 1024, allowedMimeTypes: ["application/json"] });
  if (result.error) throw new Error("PROJECTION_BUCKET_CREATE_FAILED");
}
export async function archiveDailyProjection(data: DailyProjectionData): Promise<DailyProjectionData> {
  if (data.stale || !data.projections.length) return data;
  const admin = getAdminClient();
  if (!admin) return { ...data, archiveStatus: "UNAVAILABLE" };
  const { data: bucket, error: bucketError } = await admin.storage.getBucket(PROJECTION_BUCKET);
  if (bucketError || !bucket || bucket.public) return { ...data, archiveStatus: "UNAVAILABLE" };
  const archiveId = projectionArchiveId(data);
  const storage = admin.storage.from(PROJECTION_BUCKET);
  const read = async () => {
    const result = await storage.download(archiveId);
    if (!result.data || result.error) return null;
    try {
      const saved = JSON.parse(await result.data.text()) as DailyProjectionData;
      if (saved.archiveId !== archiveId || saved.assetId !== data.assetId || saved.asOf !== data.asOf
        || saved.engine !== data.engine || !Array.isArray(saved.projections)) return null;
      return { ...saved, checkedAt: data.checkedAt };
    } catch { return null; }
  };
  const existing = await read();
  if (existing) return existing;
  const payload: DailyProjectionData = { ...data, archiveId, archiveStatus: "STORED" };
  const { error } = await storage.upload(archiveId, JSON.stringify(payload), { contentType: "application/json", upsert: false });
  if (!error) return payload;
  // Concurrent requests: first writer wins. No historical overwrite, even on provider corrections.
  return await read() ?? { ...data, archiveStatus: "UNAVAILABLE", archiveId: null };
}
