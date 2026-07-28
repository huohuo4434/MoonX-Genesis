import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { MOONX_DATA_BUCKET } from "@/lib/data/moonx-data-store";
import type { StockAnalysisRecord } from "@/types/stocks";
import { isPublicStock } from "@/types/stocks";

const FILE = "stock-analyses.json";

type Store = { version: 1; updatedAt: string; records: StockAnalysisRecord[] };

async function ensureBucket(): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) return false;
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === MOONX_DATA_BUCKET)) {
    const { error } = await admin.storage.createBucket(MOONX_DATA_BUCKET, {
      public: false,
      fileSizeLimit: 20 * 1024 * 1024,
    });
    if (error && !/already exists/i.test(error.message)) return false;
  }
  return true;
}

async function readStore(): Promise<Store> {
  const admin = getAdminClient();
  if (!admin) return { version: 1, updatedAt: new Date(0).toISOString(), records: [] };
  await ensureBucket();
  const { data } = await admin.storage.from(MOONX_DATA_BUCKET).download(FILE);
  if (!data) return { version: 1, updatedAt: new Date(0).toISOString(), records: [] };
  try {
    const parsed = JSON.parse(await data.text()) as Store;
    return { version: 1, updatedAt: parsed.updatedAt ?? new Date(0).toISOString(), records: parsed.records ?? [] };
  } catch {
    return { version: 1, updatedAt: new Date(0).toISOString(), records: [] };
  }
}

async function writeStore(store: Store): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error("服务未配置");
  await ensureBucket();
  const blob = new Blob([JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2)], {
    type: "application/json",
  });
  const { error } = await admin.storage.from(MOONX_DATA_BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(error.message);
}

/** Public-safe fields only. */
export type PublicStockCard = {
  id: string;
  name: string;
  symbol: string;
  market: string;
  directionLabel: string;
  validUntil: string;
  coreScenario: string;
  keyLevels: string[];
  invalidation: string;
  lastUpdatedAt: string;
  verificationSummary?: string;
};

function toPublic(s: StockAnalysisRecord): PublicStockCard {
  return {
    id: s.id,
    name: s.name,
    symbol: s.symbol,
    market: s.market,
    directionLabel: s.directionLabel,
    validUntil: s.validUntil,
    coreScenario: s.coreScenario,
    keyLevels: s.keyLevels,
    invalidation: s.invalidation,
    lastUpdatedAt: s.lastUpdatedAt,
    verificationSummary: s.verificationSummary,
  };
}

export async function listPublishedStocks(): Promise<PublicStockCard[]> {
  const store = await readStore();
  return store.records.filter(isPublicStock).map(toPublic);
}

export async function listAllStocksForAdmin(): Promise<StockAnalysisRecord[]> {
  return (await readStore()).records;
}

export async function upsertStockRecord(record: StockAnalysisRecord): Promise<StockAnalysisRecord> {
  const store = await readStore();
  const idx = store.records.findIndex((r) => r.id === record.id);
  const next = { ...record, lastUpdatedAt: new Date().toISOString() };
  if (idx >= 0) store.records[idx] = next;
  else store.records.unshift(next);
  await writeStore(store);
  return next;
}

export async function publishStock(id: string): Promise<StockAnalysisRecord | null> {
  const store = await readStore();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const next = {
    ...store.records[idx]!,
    status: "published" as const,
    publishedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
  store.records[idx] = next;
  await writeStore(store);
  return next;
}
