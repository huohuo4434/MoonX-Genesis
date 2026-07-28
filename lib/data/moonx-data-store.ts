import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type {
  DailyForecastRecord,
  DailyJsonStore,
  DailyVerificationResult,
} from "@/types/daily-accuracy";
import type {
  AutomationRun,
  AutomationSettings,
  DailyReviewRecord,
  LearningCase,
} from "@/types/automation";

export const MOONX_DATA_BUCKET = "moonx-data";

type DataFile =
  | "daily-forecasts.json"
  | "daily-verification-results.json"
  | "daily-verifications.json"
  | "daily-reviews.json"
  | "learning-cases.json"
  | "learning-rules.json"
  | "automation-runs.json"
  | "automation-settings.json";

const emptyStore = <T>(): DailyJsonStore<T> => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  records: [],
});

async function ensureDataBucket(): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) return false;
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === MOONX_DATA_BUCKET);
  if (!exists) {
    const { error } = await admin.storage.createBucket(MOONX_DATA_BUCKET, {
      public: false,
      fileSizeLimit: 20 * 1024 * 1024,
    });
    if (error && !/already exists/i.test(error.message)) {
      console.warn("[moonx-data] createBucket:", error.message);
      return false;
    }
  }
  return true;
}

async function readJsonFile<T>(file: DataFile, fallback: DailyJsonStore<T>): Promise<DailyJsonStore<T>> {
  const admin = getAdminClient();
  if (!admin) return fallback;
  await ensureDataBucket();
  const { data, error } = await admin.storage.from(MOONX_DATA_BUCKET).download(file);
  if (error || !data) return fallback;
  try {
    const parsed = JSON.parse(await data.text()) as DailyJsonStore<T>;
    if (!parsed || !Array.isArray(parsed.records)) return fallback;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      records: parsed.records,
    };
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(file: DataFile, store: DailyJsonStore<T>, retries = 3): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error("Supabase service role not configured");
  const ok = await ensureDataBucket();
  if (!ok) throw new Error("Unable to create moonx-data bucket");

  let lastErr: Error | null = null;
  for (let i = 0; i < retries; i++) {
    const current = await readJsonFile<T>(file, emptyStore());
    // optimistic: if remote newer and we are not intentionally overwriting full merge, still write merged payload
    const payload: DailyJsonStore<T> = {
      version: 1,
      updatedAt: new Date().toISOString(),
      records: store.records,
    };
    void current;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const { error } = await admin.storage.from(MOONX_DATA_BUCKET).upload(file, blob, {
      upsert: true,
      contentType: "application/json",
    });
    if (!error) {
      // best-effort daily backup
      try {
        const day = new Date().toISOString().slice(0, 10);
        await admin.storage.from(MOONX_DATA_BUCKET).upload(`backups/${day}/${file}`, blob, {
          upsert: true,
          contentType: "application/json",
        });
      } catch {
        /* ignore backup failure */
      }
      return;
    }
    lastErr = new Error(error.message);
  }
  throw lastErr ?? new Error("write failed");
}

function upsertById<T extends { id: string }>(records: T[], next: T): T[] {
  const idx = records.findIndex((r) => r.id === next.id);
  if (idx >= 0) {
    const copy = [...records];
    copy[idx] = next;
    return copy;
  }
  return [next, ...records];
}

export async function listDailyForecastRecords(): Promise<DailyForecastRecord[]> {
  const store = await readJsonFile<DailyForecastRecord>("daily-forecasts.json", emptyStore());
  return store.records;
}

export async function upsertDailyForecastRecord(record: DailyForecastRecord): Promise<DailyForecastRecord> {
  const store = await readJsonFile<DailyForecastRecord>("daily-forecasts.json", emptyStore());
  const existing = store.records.find((r) => r.id === record.id);
  // Lock original published content: only status / timestamps may change in-place.
  // Drafts and first inserts may write full payload. Corrections must use a new id/version.
  const next: DailyForecastRecord =
    existing && existing.status !== "draft"
      ? {
          ...existing,
          status: record.status,
          updatedAt: new Date().toISOString(),
          reviewedAt: record.reviewedAt ?? existing.reviewedAt,
          withdrawnAt: record.withdrawnAt ?? existing.withdrawnAt,
        }
      : { ...record, updatedAt: new Date().toISOString() };
  store.records = upsertById(store.records, next);
  await writeJsonFile("daily-forecasts.json", store);
  return next;
}

export async function listDailyVerificationResults(): Promise<DailyVerificationResult[]> {
  // Prefer canonical file; fall back to alias used in older code.
  const primary = await readJsonFile<DailyVerificationResult>(
    "daily-verification-results.json",
    emptyStore()
  );
  if (primary.records.length) return primary.records;
  const alt = await readJsonFile<DailyVerificationResult>("daily-verifications.json", emptyStore());
  return alt.records;
}

export async function upsertDailyVerificationResult(
  result: DailyVerificationResult
): Promise<{ created: boolean; result: DailyVerificationResult }> {
  const store = await readJsonFile<DailyVerificationResult>(
    "daily-verification-results.json",
    emptyStore()
  );
  const existing = store.records.find((r) => r.forecastId === result.forecastId);
  if (existing) return { created: false, result: existing };
  store.records = [{ ...result, id: result.forecastId } as DailyVerificationResult & { id?: string }, ...store.records];
  await writeJsonFile("daily-verification-results.json", store);
  await writeJsonFile("daily-verifications.json", store);
  return { created: true, result };
}

export async function replaceDailyVerificationResult(
  result: DailyVerificationResult
): Promise<DailyVerificationResult> {
  const store = await readJsonFile<DailyVerificationResult>(
    "daily-verification-results.json",
    emptyStore()
  );
  const idx = store.records.findIndex((r) => r.forecastId === result.forecastId);
  if (idx >= 0) store.records[idx] = result;
  else store.records.unshift(result);
  await writeJsonFile("daily-verification-results.json", store);
  await writeJsonFile("daily-verifications.json", store);
  return result;
}

export async function listDailyReviews(): Promise<DailyReviewRecord[]> {
  return (await readJsonFile<DailyReviewRecord>("daily-reviews.json", emptyStore())).records;
}

export async function upsertDailyReview(record: DailyReviewRecord): Promise<{ created: boolean }> {
  const store = await readJsonFile<DailyReviewRecord>("daily-reviews.json", emptyStore());
  if (store.records.some((r) => r.id === record.id || r.forecastId === record.forecastId)) {
    return { created: false };
  }
  store.records.unshift(record);
  await writeJsonFile("daily-reviews.json", store);
  return { created: true };
}

export async function listLearningCases(): Promise<LearningCase[]> {
  return (await readJsonFile<LearningCase>("learning-cases.json", emptyStore())).records;
}

export async function upsertLearningCase(record: LearningCase): Promise<{ created: boolean }> {
  const store = await readJsonFile<LearningCase>("learning-cases.json", emptyStore());
  if (store.records.some((r) => r.id === record.id)) return { created: false };
  store.records.unshift(record);
  await writeJsonFile("learning-cases.json", store);
  return { created: true };
}

export async function listAutomationRuns(): Promise<AutomationRun[]> {
  return (await readJsonFile<AutomationRun>("automation-runs.json", emptyStore())).records;
}

export async function hasAutomationRunKey(runKey: string): Promise<boolean> {
  const runs = await listAutomationRuns();
  return runs.some((r) => r.runKey === runKey && r.status === "success");
}

export async function recordAutomationRun(run: AutomationRun): Promise<void> {
  const store = await readJsonFile<AutomationRun>("automation-runs.json", emptyStore());
  store.records = [run, ...store.records].slice(0, 2000);
  await writeJsonFile("automation-runs.json", {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: store.records as unknown as AutomationRun[],
  });
}

const DEFAULT_SETTINGS: AutomationSettings = {
  autoForecastEnabled: true,
  autoPublishEnabled: true,
  autoVerifyEnabled: true,
  autoReviewEnabled: true,
  autoLearningEnabled: true,
  updatedAt: new Date(0).toISOString(),
};

export async function getAutomationSettings(): Promise<AutomationSettings> {
  const admin = getAdminClient();
  if (!admin) return { ...DEFAULT_SETTINGS };
  await ensureDataBucket();
  const { data } = await admin.storage.from(MOONX_DATA_BUCKET).download("automation-settings.json");
  if (!data) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(await data.text()) as AutomationSettings;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveAutomationSettings(
  patch: Partial<AutomationSettings>
): Promise<AutomationSettings> {
  const current = await getAutomationSettings();
  const next: AutomationSettings = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const admin = getAdminClient();
  if (!admin) throw new Error("服务未配置");
  await ensureDataBucket();
  const blob = new Blob([JSON.stringify(next, null, 2)], { type: "application/json" });
  const { error } = await admin.storage.from(MOONX_DATA_BUCKET).upload("automation-settings.json", blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(error.message);
  return next;
}

// Re-export aliases for older imports
export { emptyStore };
