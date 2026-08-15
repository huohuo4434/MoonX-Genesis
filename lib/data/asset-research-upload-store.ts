import "server-only";

import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  assessMethodEvidence,
  type MethodEvidenceReadiness,
  type StructuredMethodEvidence,
} from "@/lib/research/method-evidence-input-core";

const DATA_BUCKET = "moonx-data";
const MEDIA_BUCKET = "moonx-asset-research";
const META_FILE = "asset-research/uploads.json";
const IMMUTABLE_RECORDS_PATH = "asset-research/records";

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
  structuredEvidence?: StructuredMethodEvidence;
  evidenceReadiness?: MethodEvidenceReadiness;
  evidenceHash?: string;
  evidenceLockedAt?: string;
  fileSha256?: string;
  integrityStatus?: "VERIFIED" | "LEGACY_UNVERIFIED" | "FAILED";
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

async function writeImmutableRecord(record: AssetResearchUploadRecord): Promise<void> {
  const admin = await ensureBucket(DATA_BUCKET, 10 * 1024 * 1024);
  const { error } = await admin.storage.from(DATA_BUCKET).upload(
    `${IMMUTABLE_RECORDS_PATH}/${record.id}.json`,
    JSON.stringify(record, null, 2),
    { contentType: "application/json", upsert: false }
  );
  if (error) throw error;
}

async function listImmutableRecords(): Promise<AssetResearchUploadRecord[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const objects: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(DATA_BUCKET).list(IMMUTABLE_RECORDS_PATH, {
      limit: 1000, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const item of data ?? []) if (item.name.endsWith(".json")) objects.push(item.name);
    if ((data?.length ?? 0) < 1000) break;
  }
  const rows = await Promise.all(objects.map(async (name) => {
    const { data, error } = await admin.storage.from(DATA_BUCKET).download(`${IMMUTABLE_RECORDS_PATH}/${name}`);
    if (error || !data) throw error ?? new Error(`Missing immutable evidence ${name}`);
    return JSON.parse(await data.text()) as AssetResearchUploadRecord;
  }));
  return rows.map((record) => {
    if (!record.evidenceHash || !record.fileSha256 || !record.structuredEvidence) {
      return { ...record, integrityStatus: "LEGACY_UNVERIFIED" as const };
    }
    const actual = createHash("sha256")
      .update(`${JSON.stringify(record.structuredEvidence)}\n${record.fileSha256}`)
      .digest("hex");
    if (actual === record.evidenceHash) return { ...record, integrityStatus: "VERIFIED" as const };
    return {
      ...record,
      integrityStatus: "FAILED" as const,
      evidenceReadiness: {
        state: "WAIT" as const,
        hardWaitReasons: ["EVIDENCE_INTEGRITY_FAILED"],
        evidenceGrade: record.structuredEvidence.kind === "LIUYAO"
          ? record.structuredEvidence.evidenceMode === "AUDIO_INTERPRETATION" ? "VERBAL_INTERPRETATION" as const : "FULL_CHART" as const
          : "STANDARD" as const,
        executionAuthority: "RESEARCH_ONLY" as const,
        tradingEligible: false as const,
      },
    };
  });
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
  structuredEvidence: StructuredMethodEvidence;
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

  const evidenceReadiness = assessMethodEvidence(input.structuredEvidence, now);
  const fileSha256 = createHash("sha256").update(input.bytes).digest("hex");
  const evidenceHash = createHash("sha256")
    .update(`${JSON.stringify(input.structuredEvidence)}\n${fileSha256}`)
    .digest("hex");
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
    structuredEvidence: input.structuredEvidence,
    evidenceReadiness,
    evidenceHash,
    evidenceLockedAt: now.toISOString(),
    fileSha256,
    integrityStatus: "VERIFIED",
  };

  await writeImmutableRecord(record);
  return record;
}

export async function listAssetResearchUploads(): Promise<AssetResearchUploadRecord[]> {
  const [legacy, immutable] = await Promise.all([readStore(), listImmutableRecords()]);
  const byId = new Map<string, AssetResearchUploadRecord>();
  for (const record of legacy.records) byId.set(record.id, { ...record, integrityStatus: "LEGACY_UNVERIFIED" });
  for (const record of immutable) byId.set(record.id, record);
  return Array.from(byId.values()).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
