import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { getWeeklyAccuracyHistory } from "@/lib/accuracy/get-weekly-history";
import { getPendingVerificationRecords } from "@/lib/accuracy/get-pending-verification";

/**
 * Public verification data must be internally consistent on every render.
 *
 * Do not wrap this loader in unstable_cache: the verification pipeline status
 * and pending/final records can change within the same minute after the 20:00
 * publication cycle. A stale snapshot can otherwise show a terminal record as
 * "pending" while the live pipeline correctly reports it as completed/excluded.
 */
export async function getPublicVerificationSnapshot() {
  noStore();
  const [daily, weekly, pending] = await Promise.all([
    getPublicAccuracyHistory(),
    getWeeklyAccuracyHistory(),
    getPendingVerificationRecords(),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    daily,
    weekly,
    pending,
  };
}

/** Backward-compatible export used by the existing verification page. */
export async function getCachedPublicVerificationSnapshot() {
  return getPublicVerificationSnapshot();
}
