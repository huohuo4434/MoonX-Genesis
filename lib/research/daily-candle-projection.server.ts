import "server-only";
import { unstable_cache } from "next/cache";
import { loadKeyDateDaily, KEY_DATE_SYMBOLS } from "@/lib/market-data/key-date-daily.server";
import { archiveDailyProjection, ensureProjectionBucket } from "./daily-candle-projection-storage.server";

export async function refreshDailyProjection(assetId: string) {
  return archiveDailyProjection(await loadKeyDateDaily(assetId));
}
// Authentication must run BEFORE this shared, identity-free research cache.
export const getDailyProjection = unstable_cache(refreshDailyProjection, ["daily-candle-projection-v1"], { revalidate: 300 });

export async function refreshAllDailyProjections() {
  // Only the secret-authenticated cron/setup workflow provisions this private bucket.
  // The member GET path never creates buckets or changes access policy.
  await ensureProjectionBucket();
  const assets = Object.keys(KEY_DATE_SYMBOLS);
  const results: { asset: string; ok: boolean; asOf?: string; archive?: string; error?: string }[] = [];
  for (let i = 0; i < assets.length; i += 4) {
    results.push(...await Promise.all(assets.slice(i, i + 4).map(async asset => {
      try {
        const data = await refreshDailyProjection(asset);
        return { asset, ok: !data.stale && data.archiveStatus !== "UNAVAILABLE", asOf: data.asOf, archive: data.archiveStatus };
      } catch { return { asset, ok: false, error: "REFRESH_FAILED" }; }
    })));
  }
  return { ok: results.every(r => r.ok), checkedAt: new Date().toISOString(), results };
}
