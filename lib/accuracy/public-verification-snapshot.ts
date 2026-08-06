import "server-only";

import { unstable_cache } from "next/cache";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { getWeeklyAccuracyHistory } from "@/lib/accuracy/get-weekly-history";
import { getPendingVerificationRecords } from "@/lib/accuracy/get-pending-verification";

const readPublicVerificationSnapshot = unstable_cache(
  async () => {
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
  },
  ["public-verification-snapshot-v63"],
  { revalidate: 60 }
);

export async function getCachedPublicVerificationSnapshot() {
  return readPublicVerificationSnapshot();
}
