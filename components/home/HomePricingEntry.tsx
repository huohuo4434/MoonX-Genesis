import { unstable_noStore as noStore } from "next/cache";
import { HomePricingEntryClient } from "@/components/home/HomePricingEntryClient";
import { loadFreshPredictionUser } from "@/lib/prediction-access-server";
import { isAdminUser } from "@/lib/auth/is-admin";

/** Homepage membership CTA. Hidden for administrators. */
export async function HomePricingEntry() {
  noStore();
  const fresh = await loadFreshPredictionUser();
  if (fresh.accessUser && isAdminUser(fresh.accessUser)) return null;
  return <HomePricingEntryClient />;
}
