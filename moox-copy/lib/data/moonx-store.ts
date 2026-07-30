import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MOONX_BUCKET = "moonx_mvp";

export type StoreCollection =
  | "profiles_mirror"
  | "memberships"
  | "payments"
  | "predictions"
  | "research_articles";

async function ensureBucket(): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  if (!admin) return false;
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === MOONX_BUCKET);
  if (!exists) {
    const { error } = await admin.storage.createBucket(MOONX_BUCKET, {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (error && !/already exists/i.test(error.message)) {
      console.warn("[moonx-store] createBucket:", error.message);
      return false;
    }
  }
  return true;
}

export async function readCollection<T>(name: StoreCollection, fallback: T): Promise<T> {
  const admin = createSupabaseAdminClient();
  if (!admin) return fallback;
  await ensureBucket();
  const path = `${name}.json`;
  const { data, error } = await admin.storage.from(MOONX_BUCKET).download(path);
  if (error || !data) return fallback;
  try {
    const text = await data.text();
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function writeCollection<T>(name: StoreCollection, value: T): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");
  const ok = await ensureBucket();
  if (!ok) throw new Error("Unable to create storage bucket");
  const path = `${name}.json`;
  const body = JSON.stringify(value, null, 2);
  const blob = new Blob([body], { type: "application/json" });
  const { error } = await admin.storage.from(MOONX_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(error.message);
}

export interface PaymentRecord {
  id: string;
  email: string;
  userId: string | null;
  planCode: "MONTHLY" | "QUARTERLY" | "YEARLY";
  amountUsdt: number;
  chain: "TRON" | "BSC";
  txHash: string | null;
  status: "pending_review" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  note: string | null;
}

export interface PredictionRecord {
  id: string;
  type: "today" | "tomorrow";
  title: string;
  body: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
}

export interface ResearchArticleRecord {
  id: string;
  title: string;
  summary: string;
  body: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
}

export interface MembershipRecord {
  userId: string;
  email: string;
  planCode: string | null;
  status: string;
  startedAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
}

export async function ensureStoreInitialized(): Promise<{
  bucketReady: boolean;
  collections: StoreCollection[];
}> {
  const collections: StoreCollection[] = [
    "memberships",
    "payments",
    "predictions",
    "research_articles",
  ];
  const bucketReady = await ensureBucket();
  if (!bucketReady) return { bucketReady: false, collections: [] };

  for (const name of collections) {
    const existing = await readCollection(name, null);
    if (existing === null) {
      await writeCollection(name, []);
    }
  }
  return { bucketReady: true, collections };
}
