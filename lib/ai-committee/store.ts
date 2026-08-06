import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { CommitteeRun } from "@/lib/ai-committee/types";

const BUCKET = "moonx-data";
const FILE = "ai-committee-runs.json";
const LIMIT = 100;

type CommitteeStore = {
  version: 1;
  updatedAt: string;
  records: CommitteeRun[];
};

async function ensureBucket(): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) return false;
  const { data } = await admin.storage.listBuckets();
  if (data?.some((item) => item.name === BUCKET)) return true;
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
  });
  return !error || /already exists/i.test(error.message);
}

export async function listCommitteeRuns(limit = 20): Promise<CommitteeRun[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const ready = await ensureBucket();
  if (!ready) return [];
  const { data, error } = await admin.storage.from(BUCKET).download(FILE);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as CommitteeStore;
    return Array.isArray(parsed.records) ? parsed.records.slice(0, Math.max(1, limit)) : [];
  } catch {
    return [];
  }
}

export async function saveCommitteeRun(run: CommitteeRun): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) return false;
  const ready = await ensureBucket();
  if (!ready) return false;
  const current = await listCommitteeRuns(LIMIT);
  const records = [run, ...current.filter((item) => item.id !== run.id)].slice(0, LIMIT);
  const payload: CommitteeStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const { error } = await admin.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  return !error;
}
