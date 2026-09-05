import "server-only";
import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { sortStoneBatches, stoneBatchSchema, type StoneBatch, type StoneSavedBatch } from "./core";

const BUCKET = "stone-admin-intelligence";
function missing(error: { message?: string; status?: unknown; statusCode?: unknown } | null) {
  return error && (String(error.statusCode ?? error.status) === "404" || error.message === "Bucket not found");
}
async function privateStore(create: boolean) {
  const admin = getAdminClient();
  if (!admin) throw new Error("STONE_STORAGE_UNAVAILABLE");
  const info = await admin.storage.getBucket(BUCKET);
  if (info.error) {
    if (!missing(info.error)) throw new Error("STONE_STORAGE_UNAVAILABLE");
    if (!create) return null;
    const result = await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 131072, allowedMimeTypes: ["application/json"] });
    if (result.error) throw new Error("STONE_STORAGE_CREATE_FAILED");
  } else if (info.data.public) throw new Error("STONE_STORAGE_NOT_PRIVATE");
  return admin.storage.from(BUCKET);
}

export async function saveStoneBatch(input: StoneBatch) {
  const batch = stoneBatchSchema.parse(input);
  const now = Date.now();
  if (Date.parse(batch.observedAt) > now + 300000) throw new Error("STONE_FUTURE_OBSERVATION");
  const digest = createHash("sha256").update(JSON.stringify(batch)).digest("hex");
  const key = `${Date.parse(batch.observedAt).toString().padStart(13, "0")}-${digest}.json`;
  if (!/^\d{13}-[a-f0-9]{64}\.json$/.test(key)) throw new Error("STONE_INVALID_ARCHIVE_KEY");
  const store = await privateStore(true);
  const saved: StoneSavedBatch = { ...batch, key, storedAt: new Date(now).toISOString() };
  // Append-only objects: identical retry is idempotent; updates never erase prior batches.
  const result = await store!.upload(`batches/${key}`, JSON.stringify(saved), { contentType: "application/json", upsert: false });
  if (result.error) {
    const prior = await store!.download(`batches/${key}`);
    if (prior.error || !prior.data) throw new Error("STONE_WRITE_UNCONFIRMED");
    const payload = JSON.parse(await prior.data.text());
    delete payload.key; delete payload.storedAt;
    const parsed = stoneBatchSchema.parse(payload);
    if (createHash("sha256").update(JSON.stringify(parsed)).digest("hex") !== digest) throw new Error("STONE_WRITE_CONFLICT");
    return { key, duplicate: true };
  }
  return { key, duplicate: false };
}

export async function listStoneBatches(offset = 0): Promise<{ batches: StoneSavedBatch[]; hasMore: boolean }> {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new Error("STONE_INVALID_OFFSET");
  const store = await privateStore(false);
  if (!store) return { batches: [], hasMore: false };
  const listed = await store.list("batches", { limit: 31, offset, sortBy: { column: "created_at", order: "desc" } });
  if (listed.error) throw new Error("STONE_READ_FAILED");
  const batches: StoneSavedBatch[] = [];
  const files = listed.data.slice(0, 30);
  for (let index = 0; index < files.length; index += 4) {
    batches.push(...await Promise.all(files.slice(index, index + 4).map(async (file) => {
      if (!/^\d{13}-[a-f0-9]{64}\.json$/.test(file.name)) throw new Error("STONE_INVALID_ARCHIVE");
      const result = await store.download(`batches/${file.name}`);
      if (result.error || !result.data) throw new Error("STONE_READ_FAILED");
      const raw = JSON.parse(await result.data.text());
      const storedAt = raw.storedAt;
      delete raw.storedAt; delete raw.key;
      const batch = stoneBatchSchema.parse(raw);
      if (typeof storedAt !== "string" || !Number.isFinite(Date.parse(storedAt))) throw new Error("STONE_INVALID_ARCHIVE");
      return { ...batch, key: file.name, storedAt };
    })));
  }
  return { batches: sortStoneBatches(batches), hasMore: listed.data.length > 30 };
}
