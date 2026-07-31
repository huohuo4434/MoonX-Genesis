import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

const DATA_BUCKET = "moonx-data";
const MEDIA_BUCKET = "moonx-asset-research";
const META_FILE = "asset-research/uploads.json";

export type AssetResearchUploadRecord = {
  id: string;
  assetSymbol: string;
  assetName: string;
  assetType: string;
  method: string;
  period: string;
  notes: string;
  fileName: string;
  mediaPath: string;
  mime: string | null;
  size: number;
  status: "draft";
  uploadedAt: string;
};

type Store = {
  version: 1;
  updatedAt: string;
  records: AssetResearchUploadRecord[];
};

function emptyStore(): Store {
  return { version: 1, updatedAt: new Date(0).toISOString(), records: [] };
}

async function ensureBucket(name: string, limit: number) {
  const admin = getAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");
  const { data } = await admin.storage.listBuckets();
  if (!data?.some((b) => b.name === name)) {
    const { error } = await admin.storage.createBucket(name, {
      public: false,
      fileSizeLimit: limit,
    });
    if (error) throw error;
  }
  return admin;
}

async function readStore(): Promise<Store> {
  const admin = getAdminClient();
  if (!admin) return emptyStore();
  const { data } = await admin.storage.from(DATA_BUCKET).download(META_FILE);
  if (!data) return emptyStore();
  try {
    const parsed = JSON.parse(await data.text()) as Store;
    return Array.isArray(parsed.records) ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: Store): Promise<void> {
  const admin = await ensureBucket(DATA_BUCKET, 10 * 1024 * 1024);
  const { error } = await admin.storage.from(DATA_BUCKET).upload(
    META_FILE,
    JSON.stringify(store, null, 2),
    { contentType: "application/json", upsert: true }
  );
  if (error) throw error;
}

function safeToken(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function safeFileName(value: string): string {
  return value.replace(/[^\w.\-()\u4e00-\u9fff]+/g, "_");
}

export async function saveAssetResearchUpload(input: {
  assetSymbol: string;
  assetName: string;
  assetType: string;
  method: string;
  period: string;
  notes: string;
  fileName: string;
  mime: string | null;
  bytes: Buffer;
}): Promise<AssetResearchUploadRecord> {
  const admin = await ensureBucket(MEDIA_BUCKET, 100 * 1024 * 1024);
  const now = new Date();
  const id = `AR-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const symbol = safeToken(input.assetSymbol, "UNKNOWN");
  const day = now.toISOString().slice(0, 10);
  const objectPath = `${symbol}/${day}/${now.getTime()}_${safeFileName(input.fileName)}`;

  const { error } = await admin.storage.from(MEDIA_BUCKET).upload(objectPath, input.bytes, {
    contentType: input.mime || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;

  const record: AssetResearchUploadRecord = {
    id,
    assetSymbol: symbol,
    assetName: input.assetName.trim(),
    assetType: input.assetType.trim(),
    method: input.method.trim(),
    period: input.period.trim(),
    notes: input.notes.trim(),
    fileName: input.fileName,
    mediaPath: `supabase://${MEDIA_BUCKET}/${objectPath}`,
    mime: input.mime,
    size: input.bytes.length,
    status: "draft",
    uploadedAt: now.toISOString(),
  };

  const store = await readStore();
  store.records.unshift(record);
  store.records = store.records.slice(0, 500);
  store.updatedAt = now.toISOString();
  await writeStore(store);
  return record;
}

export async function listAssetResearchUploads(): Promise<AssetResearchUploadRecord[]> {
  return (await readStore()).records;
}
