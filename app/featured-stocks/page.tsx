import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { FeaturedStocksPageClient } from "@/components/featured/FeaturedStocksPageClient";
import { getAccessUser } from "@/lib/auth/get-access-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "MoonX Featured Stocks | Long-term Observation",
  description:
    "A curated list of high-conviction assets under long-term research. Not stock tips — Research, Analysis, Forecast, and Risk.",
};

export default async function FeaturedStocksPage() {
  noStore();
  const access = await getAccessUser();
  const isMember = access.isAdmin || access.isActiveMember;

  return (
    <main>
      <FeaturedStocksPageClient isMember={isMember} />
    </main>
  );
}
